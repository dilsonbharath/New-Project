"""
Advanced RAG Engine for YOU vs YOU Chatbot
──────────────────────────────────────────
Uses:
  • FAISS          — Facebook AI Similarity Search for fast vector retrieval
  • Sentence-Transformers  — Dense embedding model (all-MiniLM-L6-v2)
  • LangChain      — Document loading, text splitting, retrieval chain orchestration

Flow:
  1. Load Application-Usecase-Guide.md using LangChain MarkdownTextSplitter
  2. Embed every chunk with SentenceTransformer and store in a FAISS index
  3. At query time, embed the user question and retrieve top-k nearest chunks
  4. Inject those chunks + live user data into a structured prompt
  5. Guard against out-of-scope questions using an intent classifier
"""

import os
import re
import json
import pickle
import numpy as np
from datetime import date, datetime, timedelta
from typing import List, Dict, Optional, Tuple
from pathlib import Path

from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from . import models

# ─── Configuration ──────────────────────────────────────────────

GUIDE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "about",
    "Application-Usecase-Guide.md",
)

FAISS_INDEX_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "faiss_index",
)

EMBEDDING_MODEL_NAME = os.getenv(
    "EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
)
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "800"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "200"))
TOP_K = int(os.getenv("RAG_TOP_K", "5"))
SIMILARITY_THRESHOLD = float(os.getenv("RAG_SIMILARITY_THRESHOLD", "0.25"))

# ─── Global State ───────────────────────────────────────────────

_faiss_index = None        # FAISS index object
_chunk_store: List[Dict[str, str]] = []   # chunk metadata (title + content)
_embedder = None           # SentenceTransformer model instance

# Flags
_kb_loaded = False


# ═══════════════════════════════════════════════════════════════
#  SECTION 1 — EMBEDDING MODEL
# ═══════════════════════════════════════════════════════════════

def _get_embedder():
    """Lazy-load the SentenceTransformer embedding model."""
    global _embedder
    if _embedder is not None:
        return _embedder
    try:
        from sentence_transformers import SentenceTransformer
        print(f"[RAG] Loading embedding model: {EMBEDDING_MODEL_NAME}")
        _embedder = SentenceTransformer(EMBEDDING_MODEL_NAME)
        print(f"[RAG] Embedding model loaded — dimension {_embedder.get_sentence_embedding_dimension()}")
        return _embedder
    except ImportError:
        print("[ERROR] sentence-transformers not installed. Run: pip install sentence-transformers")
        return None


def embed_texts(texts: List[str]) -> np.ndarray:
    """Embed a list of texts into dense vectors using SentenceTransformer."""
    embedder = _get_embedder()
    if embedder is None:
        return np.array([])
    embeddings = embedder.encode(texts, show_progress_bar=False, normalize_embeddings=True)
    return embeddings.astype("float32")


# ═══════════════════════════════════════════════════════════════
#  SECTION 2 — DOCUMENT LOADING & CHUNKING (LangChain)
# ═══════════════════════════════════════════════════════════════

def _load_and_chunk_document() -> List[Dict[str, str]]:
    """
    Load Application-Usecase-Guide.md, split it using LangChain's
    MarkdownTextSplitter, and return a list of {title, content} chunks.
    """
    guide_path = Path(GUIDE_PATH)
    if not guide_path.exists():
        alt = Path(__file__).resolve().parent.parent.parent / "about" / "Application-Usecase-Guide.md"
        if alt.exists():
            guide_path = alt
        else:
            print("[ERROR] Knowledge base file not found!")
            return []

    text = guide_path.read_text(encoding="utf-8")

    try:
        from langchain.text_splitter import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter

        # Step 1 — Split by markdown headers to preserve section boundaries
        headers_to_split_on = [
            ("##", "Section"),
        ]
        md_splitter = MarkdownHeaderTextSplitter(
            headers_to_split_on=headers_to_split_on,
            strip_headers=False,
        )
        md_docs = md_splitter.split_text(text)

        # Step 2 — Further split large sections into overlapping chunks
        char_splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

        chunks = []
        for doc in md_docs:
            section_title = doc.metadata.get("Section", "Introduction")
            sub_chunks = char_splitter.split_text(doc.page_content)
            for sub in sub_chunks:
                sub = sub.strip()
                if len(sub) < 30:
                    continue  # skip tiny fragments
                chunks.append({"title": section_title, "content": sub})

        print(f"[RAG] Chunked guide into {len(chunks)} pieces (LangChain MarkdownHeaderTextSplitter + RecursiveCharacterTextSplitter)")
        return chunks

    except ImportError:
        print("[WARN] LangChain not available, falling back to regex section splitting")
        return _fallback_chunk(text)


def _fallback_chunk(text: str) -> List[Dict[str, str]]:
    """Regex-based fallback chunker when LangChain is not installed."""
    raw_sections = re.split(r"(?=^## )", text, flags=re.MULTILINE)
    chunks = []
    for section in raw_sections:
        section = section.strip()
        if not section:
            continue
        title_match = re.match(r"^## (.+?)$", section, re.MULTILINE)
        title = title_match.group(1).strip() if title_match else "Introduction"
        # Sub-split long sections
        if len(section) > CHUNK_SIZE:
            words = section.split()
            buf, i = [], 0
            while i < len(words):
                buf.append(words[i])
                if len(" ".join(buf)) >= CHUNK_SIZE:
                    chunks.append({"title": title, "content": " ".join(buf)})
                    # overlap
                    overlap_words = int(CHUNK_OVERLAP / 5)
                    buf = buf[-overlap_words:]
                i += 1
            if buf:
                chunks.append({"title": title, "content": " ".join(buf)})
        else:
            chunks.append({"title": title, "content": section})
    return chunks


# ═══════════════════════════════════════════════════════════════
#  SECTION 3 — FAISS INDEX
# ═══════════════════════════════════════════════════════════════

def _build_faiss_index(chunks: List[Dict[str, str]]):
    """Create a FAISS index from chunk embeddings and persist to disk."""
    global _faiss_index, _chunk_store

    try:
        import faiss
    except ImportError:
        print("[ERROR] faiss-cpu not installed. Run: pip install faiss-cpu")
        return

    texts = [c["content"] for c in chunks]
    embeddings = embed_texts(texts)

    if embeddings.size == 0:
        print("[ERROR] No embeddings generated")
        return

    dim = embeddings.shape[1]
    # Inner product index (since we normalized the embeddings, IP = cosine similarity)
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)

    _faiss_index = index
    _chunk_store = chunks

    # Persist to disk
    _save_index(index, chunks)
    print(f"[RAG] FAISS index built — {index.ntotal} vectors, dim={dim}")


def _save_index(index, chunks: List[Dict[str, str]]):
    """Save FAISS index and chunk metadata to disk."""
    try:
        import faiss
        os.makedirs(FAISS_INDEX_DIR, exist_ok=True)
        faiss.write_index(index, os.path.join(FAISS_INDEX_DIR, "index.faiss"))
        with open(os.path.join(FAISS_INDEX_DIR, "chunks.pkl"), "wb") as f:
            pickle.dump(chunks, f)
        print(f"[RAG] Index saved to {FAISS_INDEX_DIR}")
    except Exception as e:
        print(f"[WARN] Could not save index: {e}")


def _load_index_from_disk() -> bool:
    """Try to load a persisted FAISS index from disk."""
    global _faiss_index, _chunk_store
    index_path = os.path.join(FAISS_INDEX_DIR, "index.faiss")
    chunks_path = os.path.join(FAISS_INDEX_DIR, "chunks.pkl")

    if not (os.path.exists(index_path) and os.path.exists(chunks_path)):
        return False

    try:
        import faiss
        _faiss_index = faiss.read_index(index_path)
        with open(chunks_path, "rb") as f:
            _chunk_store = pickle.load(f)
        print(f"[RAG] Loaded persisted FAISS index — {_faiss_index.ntotal} vectors")
        return True
    except Exception as e:
        print(f"[WARN] Could not load persisted index: {e}")
        return False


# ═══════════════════════════════════════════════════════════════
#  SECTION 4 — PUBLIC API: load_knowledge_base, search_chunks
# ═══════════════════════════════════════════════════════════════

def load_knowledge_base() -> List[Dict[str, str]]:
    """
    Main entry-point: loads the knowledge base, builds the FAISS index.
    Called once at application startup.
    """
    global _kb_loaded, _chunk_store

    if _kb_loaded and _chunk_store:
        return _chunk_store

    # Try loading pre-built index from disk first
    if _load_index_from_disk():
        _kb_loaded = True
        return _chunk_store

    # Build fresh
    chunks = _load_and_chunk_document()
    if not chunks:
        return []

    _build_faiss_index(chunks)
    _kb_loaded = True
    return _chunk_store


def search_chunks(query: str, top_k: int = None) -> List[Dict[str, str]]:
    """
    Semantic search: embed the query and retrieve top-k most similar
    chunks from the FAISS index.
    Falls back to TF-IDF / keyword search if FAISS is unavailable.
    """
    if top_k is None:
        top_k = TOP_K

    if not _chunk_store:
        load_knowledge_base()

    if not _chunk_store:
        return []

    # ── FAISS path (primary) ──
    if _faiss_index is not None:
        query_vec = embed_texts([query])
        if query_vec.size == 0:
            return _tfidf_fallback_search(query, top_k)

        scores, indices = _faiss_index.search(query_vec, min(top_k, _faiss_index.ntotal))
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0:
                continue
            if score < SIMILARITY_THRESHOLD:
                continue
            results.append({
                "title": _chunk_store[idx]["title"],
                "content": _chunk_store[idx]["content"],
                "score": float(score),
            })
        return results

    # ── Fallback: TF-IDF ──
    return _tfidf_fallback_search(query, top_k)


def _tfidf_fallback_search(query: str, top_k: int) -> List[Dict[str, str]]:
    """TF-IDF based search when FAISS is not available."""
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        corpus = [c["content"] for c in _chunk_store]
        vectorizer = TfidfVectorizer(stop_words="english", max_features=5000, ngram_range=(1, 2))
        tfidf_matrix = vectorizer.fit_transform(corpus)
        query_vec = vectorizer.transform([query])
        scores = cosine_similarity(query_vec, tfidf_matrix).flatten()
        top_indices = scores.argsort()[-top_k:][::-1]
        results = []
        for idx in top_indices:
            if scores[idx] > 0.01:
                results.append({
                    "title": _chunk_store[idx]["title"],
                    "content": _chunk_store[idx]["content"],
                    "score": float(scores[idx]),
                })
        return results
    except ImportError:
        # Pure keyword fallback
        query_words = set(query.lower().split())
        scored = []
        for chunk in _chunk_store:
            content_words = set(chunk["content"].lower().split())
            overlap = len(query_words & content_words)
            if overlap > 0:
                scored.append((overlap, chunk))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [
            {"title": c["title"], "content": c["content"], "score": s}
            for s, c in scored[:top_k]
        ]


# ═══════════════════════════════════════════════════════════════
#  SECTION 5 — BOUNDARY / GUARDRAIL — Scope Classifier
# ═══════════════════════════════════════════════════════════════

# Topics that the chatbot IS allowed to discuss
IN_SCOPE_TOPICS = [
    "habit", "habits", "streak", "track", "tracker", "routine", "daily",
    "completion", "progress", "consistency", "consistent", "productive",
    "productivity", "motivation", "discipline", "improvement",
    "journal", "journaling", "memory", "memories", "writing", "entry",
    "reflect", "reflection", "diary", "note", "notes",
    "expense", "expenses", "money", "budget", "spend", "spending",
    "save", "saving", "savings", "cost", "rupee", "financial", "finance",
    "skill", "skills", "learn", "learning", "challenge", "practice",
    "growth", "new skill", "monthly",
    "checkin", "check-in", "login", "logged", "show up", "attendance",
    "how to", "use", "application", "app", "what is", "explain", "guide",
    "help", "feature", "module", "dashboard", "profile", "calendar",
    "goal", "goals", "target", "plan", "planning", "review",
    "morning", "evening", "weekly", "monthly", "daily", "routine",
    "tip", "tips", "advice", "suggestion", "suggestions", "recommend",
    "data", "analysis", "analyze", "analyse", "pattern", "patterns",
    "self-improvement", "self improvement", "accountability",
    "you vs you", "youvsyou",
]

# Clear out-of-scope signals
OUT_OF_SCOPE_SIGNALS = [
    "weather", "stock", "stocks", "crypto", "bitcoin", "politics",
    "election", "president", "prime minister", "recipe",
    "movie", "movies", "song", "songs", "music artist",
    "game", "games", "gaming", "sports score",
    "translate", "translation", "code", "programming", "python",
    "javascript", "java ", "c++", "html", "css",
    "write me a story", "write a poem", "tell me a joke",
    "what is the capital", "who is", "when was",
    "celebrity", "famous", "news", "headline",
    "medical", "doctor", "disease", "symptom", "medicine",
    "legal", "lawyer", "court", "law",
]


def is_in_scope(query: str) -> Tuple[bool, float]:
    """
    Determine whether a user query is within the application's scope.
    Uses a two-layer approach:
      1. Keyword-based quick check
      2. Semantic similarity against the FAISS index (if available)
    Returns (is_allowed, confidence_score).
    """
    query_lower = query.lower().strip()

    # Greetings are always in scope
    greetings = ["hi", "hello", "hey", "good morning", "good evening", "thanks", "thank you", "bye"]
    if query_lower in greetings or any(query_lower.startswith(g) for g in greetings):
        return (True, 1.0)

    # Check for explicit out-of-scope signals
    for signal in OUT_OF_SCOPE_SIGNALS:
        if signal in query_lower:
            # Double-check: could still be about spending on that topic
            spending_context = any(w in query_lower for w in ["expense", "spend", "budget", "cost", "habit", "track"])
            if not spending_context:
                return (False, 0.0)

    # Check for in-scope keywords
    keyword_hits = sum(1 for topic in IN_SCOPE_TOPICS if topic in query_lower)
    if keyword_hits >= 1:
        return (True, min(1.0, keyword_hits * 0.3))

    # Semantic check — if FAISS is available, check if the query has
    # reasonable similarity to any knowledge chunk
    if _faiss_index is not None:
        query_vec = embed_texts([query_lower])
        if query_vec.size > 0:
            scores, _ = _faiss_index.search(query_vec, 1)
            best_score = float(scores[0][0]) if scores.size > 0 else 0.0
            if best_score >= SIMILARITY_THRESHOLD:
                return (True, best_score)
            else:
                return (False, best_score)

    # Default: allow (better to answer than refuse)
    return (True, 0.5)


# ═══════════════════════════════════════════════════════════════
#  SECTION 6 — INTENT DETECTION & DATE PARSING
# ═══════════════════════════════════════════════════════════════

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

    # If asking about improvement/suggestions, include all data domains
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
            year_match = re.search(r"\b(20\d{2})\b", query)
            year = int(year_match.group(1)) if year_match else date.today().year
            return (month_num, year)
    return None


# ═══════════════════════════════════════════════════════════════
#  SECTION 7 — USER CONTEXT RETRIEVAL (Database Queries)
# ═══════════════════════════════════════════════════════════════

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


# ═══════════════════════════════════════════════════════════════
#  SECTION 8 — PROMPT BUILDER (LangChain-style structured prompt)
# ═══════════════════════════════════════════════════════════════

def build_prompt(
    query: str,
    guide_chunks: List[Dict],
    user_context: Dict,
    username: str = "User",
) -> str:
    """
    Build the final prompt for the LLM using retrieved context.
    This is the 'Augmented Generation' step of RAG — the prompt includes:
      • System instructions (persona & rules)
      • Retrieved knowledge chunks from the FAISS vector store
      • Live user data from the database
      • The user's actual question
    """

    system = f"""You are the YOU vs YOU personal assistant — a helpful, encouraging AI coach built into a self-improvement app.

Your job is to help {username} with:
- Understanding how to use the app effectively (Tracker, Journal, New Skill, Expenses, Profile)
- Analyzing their progress and suggesting improvements based on their data
- Answering questions about habits, journaling, expenses, skills, and daily check-ins
- Providing personalized advice based on their actual data
- Offering productivity tips, routines, and best practices from the app guide
- Helping with goal setting, streak recovery, budget planning, and skill challenges

IMPORTANT RULES:
- NEVER reveal, mention, or discuss any user passwords or security credentials
- ONLY answer questions related to the YOU vs YOU application and its features
- If a question is completely unrelated to the app (e.g., weather, politics, coding, recipes), politely redirect the user
- Be warm, encouraging, and practical in your tone
- Use the user's actual data to give personalized answers with specific numbers
- If you don't have enough data, say so honestly and suggest what the user should do
- Keep responses concise but helpful (2-4 paragraphs max)
- Reference specific numbers, patterns, and dates from their data when available
- Use emoji sparingly to make responses feel friendly
- When giving advice, make it actionable with specific steps"""

    # Add retrieved guide context (RAG knowledge)
    guide_context = ""
    if guide_chunks:
        guide_context = "\n\n--- RETRIEVED APP GUIDE KNOWLEDGE (from FAISS vector search) ---\n"
        for i, chunk in enumerate(guide_chunks[:4], 1):
            score_str = f" [relevance: {chunk.get('score', 0):.2f}]" if 'score' in chunk else ""
            guide_context += f"\n[Chunk {i} — {chunk['title']}{score_str}]\n{chunk['content'][:800]}\n"

    # Add user data context
    user_data_context = ""
    if user_context.get("data"):
        user_data_context = "\n\n--- USER DATA (live from database) ---\n"
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


def get_out_of_scope_response() -> str:
    """Return a polite message for out-of-scope questions."""
    return (
        "I appreciate your curiosity! However, I'm specifically designed to help you "
        "with the **YOU vs YOU** application. I can assist with:\n\n"
        "🎯 **Habit Tracking** — Streaks, completion rates, habit strategies\n"
        "📓 **Journaling** — Daily/weekly/monthly reflections, patterns\n"
        "🚀 **Skill Challenges** — Monthly goals, progress tracking\n"
        "💰 **Expenses** — Budgeting, spending analysis, savings tips\n"
        "👤 **Profile & Check-ins** — Consistency tracking, calendar\n"
        "📈 **Productivity** — Routines, improvement tips, best practices\n\n"
        "Please ask me anything about these topics and I'll be happy to help! 😊"
    )
