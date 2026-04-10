"""
Chatbot API route for YOU vs YOU.
POST /api/chat — Send a message and get an AI-powered response.

Architecture (Advanced RAG Pipeline):
  1. User sends a question via POST /api/chat
  2. Scope guard checks if the question is about the application
  3. FAISS vector search retrieves relevant knowledge chunks
  4. User-specific data is fetched from the database (habits, journal, etc.)
  5. A structured prompt is built with system instructions + retrieved context + user data
  6. The prompt is sent to HuggingFace Inference API (Mistral-7B)
  7. If HF API is unavailable, a comprehensive local fallback generates the response
"""

import os
import time
import requests
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import get_current_user
from ..rag_engine import (
    load_knowledge_base,
    search_chunks,
    get_user_context,
    build_prompt,
    is_in_scope,
    get_out_of_scope_response,
)
from .. import models

# Load .env so HF_API_TOKEN is available
load_dotenv()

router = APIRouter()

# ─── Config ──────────────────────────────────────────────────────

HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")
HF_MODEL = os.getenv("HF_MODEL", "mistralai/Mistral-7B-Instruct-v0.3")
HF_API_URL = f"https://api-inference.huggingface.co/models/{HF_MODEL}"

# Simple rate limiting
_rate_limit: dict = {}  # user_id -> last_request_time
RATE_LIMIT_SECONDS = 2


# ─── Schemas ─────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    sources: list[str] = []


# ─── Startup ─────────────────────────────────────────────────────

# Pre-load knowledge base on module import
load_knowledge_base()


# ─── Endpoint ────────────────────────────────────────────────────

@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Send a message to the AI chatbot and get a personalized response."""

    user_id = current_user.id
    username = current_user.username

    # Rate limiting
    now = time.time()
    last_req = _rate_limit.get(user_id, 0)
    if now - last_req < RATE_LIMIT_SECONDS:
        raise HTTPException(
            status_code=429,
            detail="Please wait a moment before sending another message.",
        )
    _rate_limit[user_id] = now

    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    if len(message) > 1000:
        raise HTTPException(
            status_code=400, detail="Message too long. Please keep it under 1000 characters."
        )

    try:
        # ── Step 1: Scope Guard — reject out-of-boundary questions ──
        allowed, confidence = is_in_scope(message)
        if not allowed:
            return ChatResponse(reply=get_out_of_scope_response(), sources=["guardrail"])

        # ── Step 2: FAISS vector search on knowledge base ──
        guide_chunks = search_chunks(message, top_k=5)

        # ── Step 3: Get user context from database (NEVER includes passwords) ──
        user_context = get_user_context(db, user_id, message)

        # ── Step 4: Build augmented prompt ──
        prompt = build_prompt(message, guide_chunks, user_context, username)

        # ── Step 5: Determine sources used ──
        sources = []
        if guide_chunks:
            sources.append("guide")
        if any(user_context.get("data", {}).get(k) for k in ["habits", "journal", "expenses", "skills", "checkins"]):
            sources.append("user_data")

        # ── Step 6: Call HuggingFace Inference API ──
        reply = await _call_hf_api(prompt)

        return ChatResponse(reply=reply, sources=sources)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Chat error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Sorry, I'm having trouble processing your request right now. Please try again.",
        )


async def _call_hf_api(prompt: str) -> str:
    """Call HuggingFace Inference API with the composed prompt."""

    if not HF_API_TOKEN:
        return _fallback_response(prompt)

    headers = {
        "Authorization": f"Bearer {HF_API_TOKEN}",
        "Content-Type": "application/json",
    }

    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 512,
            "temperature": 0.7,
            "top_p": 0.9,
            "do_sample": True,
            "return_full_text": False,
        },
    }

    try:
        response = requests.post(HF_API_URL, headers=headers, json=payload, timeout=60)

        if response.status_code == 503:
            # Model loading — retry once after delay
            data = response.json()
            wait_time = min(data.get("estimated_time", 20), 30)
            print(f"[WAIT] Model loading, waiting {wait_time}s...")
            time.sleep(wait_time)
            response = requests.post(HF_API_URL, headers=headers, json=payload, timeout=60)

        if response.status_code != 200:
            print(f"[ERROR] HF API error {response.status_code}: {response.text}")
            return _fallback_response(prompt)

        result = response.json()

        if isinstance(result, list) and len(result) > 0:
            text = result[0].get("generated_text", "").strip()
        elif isinstance(result, dict):
            text = result.get("generated_text", "").strip()
        else:
            text = str(result).strip()

        # Clean up the response
        # Remove any remaining instruction tags
        text = text.replace("[/INST]", "").replace("[INST]", "").replace("<s>", "").replace("</s>", "").strip()

        if not text:
            return "I'm not sure how to answer that. Could you rephrase your question?"

        return text

    except requests.exceptions.Timeout:
        print("[ERROR] HF API timeout")
        return "I'm taking too long to think. Please try again in a moment."
    except Exception as e:
        print(f"[ERROR] HF API call failed: {e}")
        return _fallback_response(prompt)


def _fallback_response(prompt: str) -> str:
    """
    Comprehensive local fallback when the HuggingFace API is unavailable.
    Uses FAISS-retrieved knowledge chunks to generate informed responses
    even without an external LLM.
    """
    # Extract the query from the prompt
    query_match = prompt.split("User question:")
    query = query_match[-1].replace("[/INST]", "").strip() if len(query_match) > 1 else ""
    query_lower = query.lower()

    # ── Greetings ──
    greetings = ["hi", "hello", "hey", "good morning", "good evening"]
    if any(query_lower.startswith(g) for g in greetings) or query_lower in greetings:
        return (
            "Hello! 👋 I'm your YOU vs YOU assistant. I'm here to help you make the most "
            "of your self-improvement journey. I can help with:\n\n"
            "🎯 **Habit tracking** and streak strategies\n"
            "📓 **Journaling** tips and pattern analysis\n"
            "🚀 **Skill challenges** and monthly goal planning\n"
            "💰 **Expense tracking** and budget optimization\n"
            "👤 **Profile check-ins** and consistency tracking\n"
            "📈 **Productivity routines** and improvement advice\n\n"
            "What would you like to explore?"
        )

    # ── How to use / Getting started ──
    if any(w in query_lower for w in ["how to use", "how do i", "get started", "getting started", "new user", "first time", "beginner", "setup"]):
        return (
            "Welcome to **YOU vs YOU**! Here's your complete getting-started guide:\n\n"
            "**🏗️ First-Day Setup (keep it small!):**\n"
            "1. Create only 3 habits (e.g., drink water, 20-min study, 10-min walk)\n"
            "2. Set a daily budget and monthly budget\n"
            "3. Start a monthly skill challenge\n"
            "4. Write at least 1 sentence in your daily journal\n\n"
            "**📱 The 5 Core Modules:**\n"
            "🎯 **Tracker** — Create habits, toggle daily completion, build streaks\n"
            "📓 **Journal** — Write daily, weekly, and monthly reflections\n"
            "🚀 **New Skill** — Pick one monthly skill & track daily practice\n"
            "💰 **Expenses** — Log spending, set budgets, track savings\n"
            "👤 **Profile** — View your check-in calendar and consistency streaks\n\n"
            "**💡 Pro Tip:** Open the app every day, even on low-energy days. "
            "A daily check-in says 'I showed up for my life today.' "
            "Consistency beats intensity every time!"
        )

    # ── Habits ──
    if any(w in query_lower for w in ["habit", "streak", "track", "routine", "completion rate"]):
        # Check if user has habit data in the prompt
        has_habit_data = "Habits:" in prompt and "streak" in prompt

        response = "**🎯 Habit Tracking Tips & Strategies:**\n\n"

        if has_habit_data:
            response += "Based on your data, here's my analysis:\n\n"
            # Extract habit info from prompt for basic analysis
            if "0 days" in prompt:
                response += "⚠️ Some habits have **0-day streaks** — that's okay! Start with a tiny version today.\n"
            if "100.0%" in prompt:
                response += "🌟 Amazing! You have habits at **100% completion** — keep that momentum!\n"
            response += "\n"

        response += (
            "**Creating Effective Habits:**\n"
            "• Use the formula: **Trigger + Action + Scope**\n"
            "• Bad: 'Exercise' → Good: '15-min walk after dinner at 7PM'\n"
            "• Start with 3-5 core habits, expand only when stable\n\n"
            "**Streak Recovery Protocol:**\n"
            "1. Open app immediately after a missed day\n"
            "2. Review why the miss happened\n"
            "3. Reduce the habit by 50% for 3 days\n"
            "4. Rebuild gradually\n\n"
            "**Completion Rate Guide:**\n"
            "• 80-100%: 🟢 Sustainable rhythm\n"
            "• 60-79%: 🟡 Needs adjustment\n"
            "• Below 60%: 🔴 Simplify the habit\n\n"
            "**Categories to consider:** Foundation (sleep, water, movement) → "
            "Output (work/study blocks) → Growth (reading, skill practice)"
        )
        return response

    # ── Journal ──
    if any(w in query_lower for w in ["journal", "reflect", "reflection", "diary", "writing", "entry", "entries", "wrote"]):
        has_journal_data = "Journal Entries:" in prompt

        response = "**📓 Journal Module Guide:**\n\n"

        if has_journal_data:
            response += "I can see your journal entries! Here are personalized insights:\n"
            response += "• Review your entries weekly to spot repeating themes\n"
            response += "• Look for recurring blockers and wins\n\n"

        response += (
            "**Three Reflection Layers:**\n"
            "📅 **Daily** (5-8 min): What happened, one win, one challenge, one adjustment\n"
            "📋 **Weekly** (15 min): Progress, blockers, helpful/harmful patterns, next priority\n"
            "📆 **Monthly** (30-45 min): Identity growth, strategic direction, data + emotion\n\n"
            "**Daily Entry Template:**\n"
            "• What happened today\n"
            "• One win I'm proud of\n"
            "• One challenge I faced\n"
            "• One adjustment for tomorrow\n\n"
            "**Weekly Review Questions:**\n"
            "• What worked and why?\n"
            "• What failed and why?\n"
            "• What one change can improve next week by 10%?\n\n"
            "**Journal Library Power Use:** Open your last 5-10 entries weekly. "
            "Highlight repeated words, recurring blockers, and wins. "
            "Memory is biased by mood — written history shows truth over time."
        )
        return response

    # ── Expenses / Budget / Money ──
    if any(w in query_lower for w in ["expense", "money", "budget", "spend", "saving", "cost", "rupee", "financial"]):
        has_expense_data = "Expenses:" in prompt

        response = "**💰 Expense & Budget Guide:**\n\n"

        if has_expense_data:
            response += "Based on your financial data:\n"
            if "Saved ₹" in prompt and "Saved ₹N/A" not in prompt:
                response += "• Great job tracking! Review your recent expenses for leak patterns.\n"
            if "not set" in prompt:
                response += "• ⚠️ You haven't set a budget yet — set one now to start tracking savings!\n"
            response += "\n"

        response += (
            "**Daily Expense Workflow:**\n"
            "1. Set daily budget each morning\n"
            "2. Log each expense instantly (amount + note)\n"
            "3. Review daily: spent vs budget\n\n"
            "**Monthly Budget Strategy:**\n"
            "• Enter monthly budget at start of month\n"
            "• Track cumulative spending automatically\n"
            "• If overspending: cap variable categories, add spending-free days\n\n"
            "**Common Money Leaks:**\n"
            "🍕 Food delivery convenience spending\n"
            "☕ Frequent café drinks\n"
            "🚕 Ride-share overuse\n"
            "🛒 Small online impulse buys\n\n"
            "**Savings Challenge Ideas:**\n"
            "• No impulse purchase week (24-hour rule)\n"
            "• Category cap challenge (fixed weekly limits)\n"
            "• Daily under-budget streak (5/7 days target)\n\n"
            "**Impact Example:** Reducing ₹120/day in non-essentials = ₹3,600/month = ₹43,000+/year!"
        )
        return response

    # ── Skills ──
    if any(w in query_lower for w in ["skill", "learn", "challenge", "practice", "growth"]):
        return (
            "**🚀 Monthly Skill Challenge Guide:**\n\n"
            "**Core Concept:** One month, one skill, daily tiny progress.\n\n"
            "**Choosing Your Skill (3R Framework):**\n"
            "• **Relevance**: Does it help your current goals?\n"
            "• **Repeatability**: Can you practice 10-30 min daily?\n"
            "• **Reward**: Will improvement be visible in 30 days?\n\n"
            "**Skill Ideas by Category:**\n"
            "💼 Career: Better writing, speaking, meeting summaries\n"
            "📚 Academic: Memory techniques, fast revision, presentations\n"
            "🏠 Personal: Cooking, fitness routine, mindful communication\n"
            "🎨 Creative: Sketching, music, storytelling\n"
            "💰 Financial: Expense categorization, budgeting literacy\n\n"
            "**Daily Progress Garden:**\n"
            "• Mark only today's progress (no fake catch-ups)\n"
            "• Build a visual chain of practice days\n\n"
            "**End-of-Month Review:**\n"
            "1. Rate yourself 1-5\n"
            "2. Write what improved and what didn't\n"
            "3. Decide what to carry into next month\n\n"
            "**Progression Example:** Month 1: Clear writing → Month 2: Concise speaking → "
            "Month 3: Presentation flow → Month 4: Persuasion basics"
        )

    # ── Productivity / Routine ──
    if any(w in query_lower for w in ["productive", "productivity", "routine", "morning", "evening", "workflow"]):
        return (
            "**📈 Complete Productivity System using YOU vs YOU:**\n\n"
            "**☀️ Morning Routine (10 min):**\n"
            "1. Open dashboard → review today's habits\n"
            "2. Confirm top 3 non-negotiable outcomes\n"
            "3. Set daily expense budget\n"
            "4. Write one line in journal about today's focus\n\n"
            "**🌤️ During the Day:**\n"
            "• Complete habits as they come up\n"
            "• Log expenses instantly when they happen\n"
            "• Quick afternoon check — recover any missed items\n\n"
            "**🌙 Evening Closure (10-15 min):**\n"
            "1. Mark habit completions honestly\n"
            "2. Log any missed expenses\n"
            "3. Write daily journal reflection\n"
            "4. Check skill challenge progress\n\n"
            "**📅 Weekly Review (Sunday):**\n"
            "• Which habit had highest consistency?\n"
            "• Which habit failed repeatedly?\n"
            "• What to keep, improve, remove, add?\n"
            "• Write weekly journal reflection\n\n"
            "**📆 Monthly Reset:**\n"
            "• Rate skill challenge and write feedback\n"
            "• Review monthly budget performance\n"
            "• Define next month's theme\n"
            "• Simplify if needed — consistency > ambition"
        )

    # ── Check-ins / Profile ──
    if any(w in query_lower for w in ["checkin", "check-in", "profile", "calendar", "attendance", "show up", "consistency"]):
        has_checkin_data = "Check-ins:" in prompt

        response = "**👤 Profile & Check-in Guide:**\n\n"

        if has_checkin_data:
            response += "Your check-in data is tracked! Each day you open the app counts.\n\n"

        response += (
            "**Why Check-ins Matter:**\n"
            "• A check-in says 'I showed up for my life today'\n"
            "• Even low-output days count if you return and continue\n"
            "• It reduces the all-or-nothing mindset\n\n"
            "**Calendar Interpretation:**\n"
            "• 🟢 Green days = consistency (you showed up)\n"
            "• Missed days = opportunity for routine improvement\n\n"
            "**Building Streak Identity:**\n"
            "• Open the app every day, even on low-energy days\n"
            "• Can't complete everything? Do ONE minimal action\n"
            "• Stop saying 'I failed' — start saying 'I returned'\n\n"
            "**Accountability Tips:**\n"
            "• Share weekly summary with a friend or mentor\n"
            "• Discuss one win, one miss, one next action\n"
            "• Focus on behavior quality, not perfection"
        )
        return response

    # ── Improvement / Suggestions / Analysis ──
    if any(w in query_lower for w in ["improve", "suggestion", "better", "advice", "analyse", "analyze", "weak", "struggling"]):
        has_data = any(section in prompt for section in ["Habits:", "Journal Entries:", "Expenses:"])

        response = "**🔍 Improvement Analysis & Suggestions:**\n\n"

        if has_data:
            response += "Based on your data, here are personalized recommendations:\n\n"
        else:
            response += "I don't see much data yet — start logging to get personalized insights!\n\n"

        response += (
            "**Quick Wins (Start Here):**\n"
            "1. Focus on your lowest-performing habit → make it 50% smaller\n"
            "2. Journal every evening — even 3 lines reveals patterns\n"
            "3. Log expenses instantly — delayed logging misses impulse purchases\n"
            "4. Keep monthly skill practice to 10-30 min daily\n"
            "5. Review Journal Library weekly for recurring blockers\n\n"
            "**The System Design Approach:**\n"
            "• Foundation habits first (sleep, water, movement)\n"
            "• Then output habits (work/study blocks)\n"
            "• Then growth habits (reading, skill practice)\n"
            "• If overwhelmed → temporarily return to foundation only\n\n"
            "**Common Mistakes to Avoid:**\n"
            "❌ Too many habits at once → ✅ Start with 3-5\n"
            "❌ Journal only when emotional → ✅ Write short entries daily\n"
            "❌ Log expenses late → ✅ Log immediately after payment\n"
            "❌ Broad monthly skill → ✅ Make it measurable and tiny\n"
            "❌ Skip weekly review → ✅ Schedule a fixed review slot"
        )
        return response

    # ── Dashboard ──
    if any(w in query_lower for w in ["dashboard", "home", "main page", "overview"]):
        return (
            "**🏠 Dashboard — Your Daily Command Center:**\n\n"
            "**What you can do here:**\n"
            "• View all active habits at a glance\n"
            "• Mark today's completions\n"
            "• Add, edit, or remove habits\n"
            "• See daily, weekly, and monthly summaries\n\n"
            "**Best Practice — Triple Check:**\n"
            "☀️ **Morning**: Preview what must be done today, pick top 3\n"
            "🌤️ **Afternoon**: Quick check, recover missed items\n"
            "🌙 **Night**: Close day with final updates, be honest\n\n"
            "**Important:** Don't game the system by marking uncompleted actions. "
            "The app gives value only when data is truthful."
        )

    # ── Goal setting ──
    if any(w in query_lower for w in ["goal", "target", "plan", "planning"]):
        return (
            "**🎯 Goal Setting & Planning with YOU vs YOU:**\n\n"
            "**30-Day Starter Protocol:**\n"
            "• Week 1: 3 habits, daily check-in, daily budget, short journal\n"
            "• Week 2: Add weekly reflection, tighten expense logging\n"
            "• Week 3: Start monthly skill daily progress\n"
            "• Week 4: Complete monthly review, redesign next month\n\n"
            "**90-Day Transformation:**\n"
            "• Days 1-30: Build consistency baseline\n"
            "• Days 31-60: Increase difficulty in ONE area only\n"
            "• Days 61-90: Optimize system, remove friction\n\n"
            "**Monthly Theme Ideas:**\n"
            "💪 Discipline month | 🎯 Focus month | ❤️ Health month\n"
            "🗣️ Communication month | 💰 Financial control month\n\n"
            "**Key Principle:** Convert goals into non-negotiable daily habits. "
            "Theme-based planning improves coherence across all modules."
        )

    # ── Thanks / Bye ──
    if any(w in query_lower for w in ["thanks", "thank you", "bye", "goodbye"]):
        return (
            "You're welcome! 🙌 Remember: your real competitor is yesterday's version of you. "
            "Keep showing up, stay consistent, and trust the process. "
            "I'm always here whenever you need help with your YOU vs YOU journey! 💪"
        )

    # ── Default: comprehensive help menu ──
    return (
        "I'm your **YOU vs YOU** personal assistant! 🤖 Here's everything I can help with:\n\n"
        "🎯 **Habit Tracking** — Creating habits, streak strategies, completion analysis\n"
        "📓 **Journal** — Daily/weekly/monthly reflection tips, entry templates\n"
        "🚀 **Skill Challenges** — Choosing skills, progress tracking, month-end review\n"
        "💰 **Expenses** — Budget setup, spending analysis, savings strategies\n"
        "👤 **Profile & Check-ins** — Consistency tracking, streak building\n"
        "📈 **Productivity** — Morning/evening routines, weekly reviews\n"
        "🎯 **Goal Planning** — 30-day and 90-day protocols\n"
        "🔍 **Data Analysis** — Patterns, improvement suggestions\n\n"
        "**Try asking:**\n"
        "• 'How do I get started?'\n"
        "• 'Analyze my habits'\n"
        "• 'Show my expense summary'\n"
        "• 'Give me productivity tips'\n"
        "• 'How to improve my streaks?'\n"
        "• 'What should my morning routine look like?'\n\n"
        "What would you like to explore?"
    )
