"""
Chatbot API route for YOU vs YOU.
POST /api/chat — Send a message and get an AI-powered response.
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
from ..rag_engine import load_knowledge_base, search_chunks, get_user_context, build_prompt
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
        # 1. Search knowledge base
        guide_chunks = search_chunks(message, top_k=4)

        # 2. Get user context from database (NEVER includes passwords)
        user_context = get_user_context(db, user_id, message)

        # 3. Build prompt
        prompt = build_prompt(message, guide_chunks, user_context, username)

        # 4. Determine sources used
        sources = []
        if guide_chunks:
            sources.append("guide")
        if any(user_context.get("data", {}).get(k) for k in ["habits", "journal", "expenses", "skills", "checkins"]):
            sources.append("user_data")

        # 5. Call HuggingFace Inference API
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
    """Provide a basic response when the HF API is unavailable."""
    # Extract the query from the prompt
    query_match = prompt.split("User question:")
    query = query_match[-1].replace("[/INST]", "").strip() if len(query_match) > 1 else ""

    query_lower = query.lower()

    if any(w in query_lower for w in ["how to use", "how do i"]):
        return (
            "Welcome to YOU vs YOU! This app has 5 key modules:\n\n"
            "🎯 **Tracker** — Create and track daily habits with streaks\n"
            "📓 **Journal** — Write daily, weekly, and monthly reflections\n"
            "🚀 **New Skill** — Set a monthly skill challenge and track daily practice\n"
            "💰 **Expenses** — Log spending, set budgets, and track savings\n"
            "👤 **Profile** — View your check-in calendar and consistency streaks\n\n"
            "Start with 3 small habits, journal for 5 minutes daily, and set a realistic budget. "
            "Consistency beats intensity every time!"
        )

    if any(w in query_lower for w in ["productive", "productivity"]):
        return (
            "Here's a productivity routine using all modules:\n\n"
            "☀️ **Morning**: Open dashboard, review today's habits, set daily budget\n"
            "🌤️ **During day**: Complete habits, log expenses as they happen\n"
            "🌙 **Evening**: Mark completions, write journal entry, check skill progress\n"
            "📅 **Weekly**: Review completion rates, journal patterns, spending trends\n"
            "📆 **Monthly**: Rate skill challenge, write monthly reflection, reset goals\n\n"
            "The key is doing small actions consistently rather than big bursts occasionally."
        )

    if any(w in query_lower for w in ["improve", "suggestion", "better"]):
        return (
            "Here are general improvement tips:\n\n"
            "1. Focus on your lowest-performing habit and make it smaller\n"
            "2. Journal every evening — even 3 lines helps identify patterns\n"
            "3. Review your weekly journal to spot repeated blockers\n"
            "4. Track expenses instantly — delayed logging misses impulse purchases\n"
            "5. Keep your monthly skill challenge realistic (10-30 min daily)\n\n"
            "Would you like me to analyze specific data? Make sure you have some habits and entries logged!"
        )

    return (
        "I'm your YOU vs YOU assistant! I can help you with:\n"
        "- How to use app features\n"
        "- Analyzing your habit progress\n"
        "- Reviewing journal entries and patterns\n"
        "- Expense and budget insights\n"
        "- Skill challenge guidance\n\n"
        "What would you like to know?"
    )
