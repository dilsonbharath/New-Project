"""
RAG Engine for YOU vs YOU Chatbot
Handles knowledge base loading, search, and user context retrieval.
"""

import os
import re
import json
from datetime import date, datetime, timedelta
from typing import List, Dict, Optional, Tuple
from pathlib import Path

from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from . import models

# ─── Knowledge Base ─────────────────────────────────────────────

GUIDE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "about",
    "Application-Usecase-Guide.md",
)

_chunks: List[Dict[str, str]] = []
_vectorizer = None
_tfidf_matrix = None


def load_knowledge_base() -> List[Dict[str, str]]:
    """Load and chunk the Application-Usecase-Guide.md by page sections."""
    global _chunks, _vectorizer, _tfidf_matrix

    if _chunks:
        return _chunks

    guide_path = Path(GUIDE_PATH)
    if not guide_path.exists():
        print(f"[WARN] Guide not found at {guide_path}, trying alternate paths...")
        alt = Path(__file__).resolve().parent.parent.parent / "about" / "Application-Usecase-Guide.md"
        if alt.exists():
            guide_path = alt
        else:
            print("[ERROR] Knowledge base file not found!")
            return []

    text = guide_path.read_text(encoding="utf-8")

    # Split by page headers (## Page N: ...)
    raw_sections = re.split(r"(?=^## )", text, flags=re.MULTILINE)

    _chunks = []
    for section in raw_sections:
        section = section.strip()
        if not section:
            continue
        # Extract title
        title_match = re.match(r"^## (.+?)$", section, re.MULTILINE)
        title = title_match.group(1).strip() if title_match else "Introduction"
        _chunks.append({"title": title, "content": section})

    # Build TF-IDF index
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer

        corpus = [c["content"] for c in _chunks]
        _vectorizer = TfidfVectorizer(
            stop_words="english", max_features=5000, ngram_range=(1, 2)
        )
        _tfidf_matrix = _vectorizer.fit_transform(corpus)
        print(f"[OK] Loaded {len(_chunks)} knowledge chunks with TF-IDF index")
    except ImportError:
        print("[WARN] scikit-learn not available, falling back to keyword search")
        _vectorizer = None
        _tfidf_matrix = None

    return _chunks


def search_chunks(query: str, top_k: int = 5) -> List[Dict[str, str]]:
    """Search knowledge base chunks using TF-IDF similarity."""
    if not _chunks:
        load_knowledge_base()

    if not _chunks:
        return []

    if _vectorizer is not None and _tfidf_matrix is not None:
        from sklearn.metrics.pairwise import cosine_similarity

        query_vec = _vectorizer.transform([query])
        scores = cosine_similarity(query_vec, _tfidf_matrix).flatten()
        top_indices = scores.argsort()[-top_k:][::-1]
        results = []
        for idx in top_indices:
            if scores[idx] > 0.01:  # threshold
                results.append(
                    {
                        "title": _chunks[idx]["title"],
                        "content": _chunks[idx]["content"],
                        "score": float(scores[idx]),
                    }
                )
        return results
    else:
        # Fallback: keyword matching
        query_words = set(query.lower().split())
        scored = []
        for chunk in _chunks:
            content_words = set(chunk["content"].lower().split())
            overlap = len(query_words & content_words)
            if overlap > 0:
                scored.append((overlap, chunk))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [
            {"title": c["title"], "content": c["content"], "score": s}
            for s, c in scored[:top_k]
        ]


# ─── Intent Detection ───────────────────────────────────────────

INTENT_KEYWORDS = {
    "habits": ["habit", "streak", "track", "routine", "daily", "completion", "progress", "tracker", "productive", "consistency", "consistent"],
    "journal": ["journal", "memory", "memories", "wrote", "writing", "entry", "reflect", "reflection", "diary", "note"],
    "expenses": ["expense", "money", "budget", "spend", "spending", "save", "saving", "cost", "rupee", "financial"],
    "skills": ["skill", "learn", "challenge", "practice", "month", "growth", "new skill"],
    "checkins": ["checkin", "check-in", "login", "logged", "show up", "attendance", "streak"],
    "guide": ["how to", "use", "application", "app", "what is", "explain", "guide", "help", "feature", "module"],
}

MONTH_MAP = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6,
    "jul": 7, "july": 7, "aug": 8, "august": 8, "sep": 9, "september": 9,
    "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}


def detect_intents(query: str) -> List[str]:
    """Detect which data domains the query is about."""
    query_lower = query.lower()
    intents = []
    for intent, keywords in INTENT_KEYWORDS.items():
        for kw in keywords:
            if kw in query_lower:
                if intent not in intents:
                    intents.append(intent)
                break

    # If asking about improvement/suggestions, include habits + journal
    improvement_words = ["improve", "suggestion", "advice", "better", "lack", "weak", "analyse", "analyze"]
    for w in improvement_words:
        if w in query_lower:
            for intent in ["habits", "journal", "expenses", "skills", "checkins"]:
                if intent not in intents:
                    intents.append(intent)
            break

    # Default to guide if nothing detected
    if not intents:
        intents = ["guide"]

    return intents


def parse_date_reference(query: str) -> Optional[Tuple[int, int]]:
    """Extract month/year from query like 'feb 2026'."""
    query_lower = query.lower()
    for month_name, month_num in MONTH_MAP.items():
        if month_name in query_lower:
            # Try to find year
            year_match = re.search(r"\b(20\d{2})\b", query)
            year = int(year_match.group(1)) if year_match else date.today().year
            return (month_num, year)
    return None


# ─── User Context Retrieval ──────────────────────────────────────

def get_user_context(db: Session, user_id: int, query: str) -> Dict[str, any]:
    """Retrieve user data based on detected intents. NEVER includes password."""
    intents = detect_intents(query)
    date_ref = parse_date_reference(query)
    context = {"intents": intents, "data": {}}

    # Get user info (EXCLUDE password)
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        context["data"]["user"] = {
            "username": user.username,
            "email": user.email,
            "member_since": str(user.created_at),
        }

    if "habits" in intents or "checkins" in intents:
        habits = db.query(models.Habit).filter(
            models.Habit.user_id == user_id,
            models.Habit.is_active == True,
        ).all()

        habits_data = []
        for h in habits:
            # Get recent logs (last 30 days)
            thirty_days_ago = date.today() - timedelta(days=30)
            logs = db.query(models.HabitLog).filter(
                models.HabitLog.habit_id == h.id,
                models.HabitLog.date >= thirty_days_ago,
            ).all()

            completed_count = sum(1 for l in logs if l.completed)
            total_days = 30

            # Current streak
            streak = 0
            check_date = date.today()
            while True:
                log = db.query(models.HabitLog).filter(
                    models.HabitLog.habit_id == h.id,
                    models.HabitLog.date == check_date,
                    models.HabitLog.completed == True,
                ).first()
                if log:
                    streak += 1
                    check_date -= timedelta(days=1)
                else:
                    break

            habits_data.append({
                "name": h.name,
                "description": h.description,
                "icon": h.icon,
                "current_streak": streak,
                "completion_rate_30d": round((completed_count / total_days) * 100, 1),
                "completed_last_30_days": completed_count,
                "target_days_per_week": h.target_days,
                "created_at": str(h.created_at),
            })

        context["data"]["habits"] = habits_data

    if "journal" in intents:
        # Get journal entries
        query_filters = [models.JournalEntry.user_id == user_id]
        if date_ref:
            month, year = date_ref
            start = date(year, month, 1)
            if month == 12:
                end = date(year + 1, 1, 1)
            else:
                end = date(year, month + 1, 1)
            query_filters.append(models.JournalEntry.date >= start)
            query_filters.append(models.JournalEntry.date < end)

        entries = db.query(models.JournalEntry).filter(
            *query_filters
        ).order_by(models.JournalEntry.date.desc()).limit(20).all()

        context["data"]["journal"] = [
            {
                "type": e.entry_type,
                "date": str(e.date),
                "content": e.content[:500] if e.content else None,
                "goal_text": e.goal_text,
                "rating": e.rating,
                "feedback": e.feedback,
            }
            for e in entries
        ]

    if "expenses" in intents:
        # Get expense data
        today = date.today()
        target_month = date_ref[0] if date_ref else today.month
        target_year = date_ref[1] if date_ref else today.year

        expenses = db.query(models.Expense).filter(
            models.Expense.user_id == user_id,
        ).order_by(models.Expense.date.desc()).limit(30).all()

        monthly_budget = db.query(models.MonthlyBudget).filter(
            models.MonthlyBudget.user_id == user_id,
            models.MonthlyBudget.month == target_month,
            models.MonthlyBudget.year == target_year,
        ).first()

        total_spent = sum(e.amount for e in expenses if e.date.month == target_month and e.date.year == target_year)

        context["data"]["expenses"] = {
            "monthly_budget": monthly_budget.amount if monthly_budget else None,
            "total_spent": total_spent,
            "saved": (monthly_budget.amount - total_spent) if monthly_budget else None,
            "recent_expenses": [
                {"date": str(e.date), "amount": e.amount, "note": e.note}
                for e in expenses[:15]
            ],
        }

    if "skills" in intents:
        # Get monthly skill entries (stored as monthly journal entries)
        skill_entries = db.query(models.JournalEntry).filter(
            models.JournalEntry.user_id == user_id,
            models.JournalEntry.entry_type == "monthly",
        ).order_by(models.JournalEntry.date.desc()).limit(12).all()

        context["data"]["skills"] = [
            {
                "date": str(e.date),
                "goal": e.goal_text,
                "rating": e.rating,
                "feedback": e.feedback,
                "daily_progress": e.daily_progress,
            }
            for e in skill_entries
        ]

    if "checkins" in intents:
        # Get check-in data
        checkins = db.query(models.DailyCheckIn).filter(
            models.DailyCheckIn.user_id == user_id,
        ).order_by(models.DailyCheckIn.check_in_date.desc()).limit(90).all()

        # Calculate streak
        streak = 0
        check_date = date.today()
        checkin_dates = {c.check_in_date for c in checkins}
        while check_date in checkin_dates:
            streak += 1
            check_date -= timedelta(days=1)

        context["data"]["checkins"] = {
            "total": len(checkins),
            "current_streak": streak,
            "recent_dates": [str(c.check_in_date) for c in checkins[:30]],
        }

    return context


# ─── Prompt Builder ──────────────────────────────────────────────

def build_prompt(
    query: str,
    guide_chunks: List[Dict],
    user_context: Dict,
    username: str = "User",
) -> str:
    """Build the final prompt for the LLM with RAG context."""

    system = f"""You are the YOU vs YOU personal assistant — a helpful, encouraging AI coach built into a self-improvement app.

Your job is to help {username} with:
- Understanding how to use the app effectively
- Analyzing their progress and suggesting improvements
- Answering questions about habits, journaling, expenses, skills, and daily check-ins
- Providing personalized advice based on their actual data

IMPORTANT RULES:
- NEVER reveal, mention, or discuss any user passwords or security credentials
- Be warm, encouraging, and practical
- Use the user's actual data to give personalized answers
- If you don't have enough data, say so honestly
- Keep responses concise but helpful (2-4 paragraphs max)
- Reference specific numbers and patterns from their data when available
- Use a friendly, coaching tone"""

    # Add guide context
    guide_context = ""
    if guide_chunks:
        guide_context = "\n\n--- APP GUIDE KNOWLEDGE ---\n"
        for chunk in guide_chunks[:3]:
            guide_context += f"\n{chunk['content'][:600]}\n"

    # Add user data context
    user_data_context = ""
    if user_context.get("data"):
        user_data_context = "\n\n--- USER DATA ---\n"
        data = user_context["data"]

        if "user" in data:
            user_data_context += f"Username: {data['user']['username']}, Member since: {data['user']['member_since']}\n"

        if "habits" in data and data["habits"]:
            user_data_context += "\nHabits:\n"
            for h in data["habits"]:
                user_data_context += f"- {h['icon']} {h['name']}: streak {h['current_streak']} days, "
                user_data_context += f"30-day rate {h['completion_rate_30d']}%, "
                user_data_context += f"target {h['target_days_per_week']} days/week\n"

        if "journal" in data and data["journal"]:
            user_data_context += "\nRecent Journal Entries:\n"
            for j in data["journal"][:5]:
                content_preview = j["content"][:200] if j["content"] else "(empty)"
                user_data_context += f"- [{j['type']}] {j['date']}: {content_preview}\n"

        if "expenses" in data:
            exp = data["expenses"]
            user_data_context += f"\nExpenses: Budget ₹{exp.get('monthly_budget', 'not set')}, "
            user_data_context += f"Spent ₹{exp.get('total_spent', 0)}, "
            user_data_context += f"Saved ₹{exp.get('saved', 'N/A')}\n"

        if "skills" in data and data["skills"]:
            user_data_context += "\nSkill Challenges:\n"
            for s in data["skills"][:3]:
                user_data_context += f"- {s['date']}: {s.get('goal', 'No goal set')}"
                if s.get("rating"):
                    user_data_context += f" (rated {s['rating']}/5)"
                user_data_context += "\n"

        if "checkins" in data:
            ci = data["checkins"]
            user_data_context += f"\nCheck-ins: {ci['total']} total, current streak {ci['current_streak']} days\n"

    prompt = f"""<s>[INST] {system}{guide_context}{user_data_context}

User question: {query} [/INST]"""

    return prompt
