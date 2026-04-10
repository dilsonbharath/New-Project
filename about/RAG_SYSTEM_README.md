# 🧠 RAG System — Technical Deep-Dive

## YOU vs YOU — AI Chatbot Architecture Documentation

**Author:** Dilson Bharath R
**Date:** April 10, 2026  

**Purpose:** Complete technical reference for the RAG-based chatbot system used in the YOU vs YOU application

---

## Table of Contents

1. [What is RAG?](#1-what-is-rag)
2. [Why RAG Instead of Fine-Tuning?](#2-why-rag-instead-of-fine-tuning)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Component Deep-Dive](#4-component-deep-dive)
   - 4.1 [Document Loading & Chunking (LangChain)](#41-document-loading--chunking-langchain)
   - 4.2 [Embedding Model (Sentence-Transformers)](#42-embedding-model-sentence-transformers)
   - 4.3 [Vector Store (FAISS)](#43-vector-store-faiss)
   - 4.4 [Retrieval (Semantic Search)](#44-retrieval-semantic-search)
   - 4.5 [User Context Retrieval (Database)](#45-user-context-retrieval-database)
   - 4.6 [Prompt Engineering (Augmented Generation)](#46-prompt-engineering-augmented-generation)
   - 4.7 [LLM Inference (HuggingFace API)](#47-llm-inference-huggingface-api)
   - 4.8 [Scope Guardrail (Boundary Classifier)](#48-scope-guardrail-boundary-classifier)
5. [Data Flow — End-to-End Pipeline](#5-data-flow--end-to-end-pipeline)
6. [File Structure](#6-file-structure)
7. [Environment Variables](#7-environment-variables)
8. [Key Concepts for Project Explanation](#8-key-concepts-for-project-explanation)
9. [Interview Q&A](#9-interview-qa)
10. [Comparison: Before vs After](#10-comparison-before-vs-after)
11. [Future Improvements](#11-future-improvements)

---

## 1. What is RAG?

**RAG** stands for **Retrieval-Augmented Generation**. It is a technique that enhances a Large Language Model (LLM) by providing it with relevant external knowledge at query time, rather than relying solely on the model's pre-trained knowledge.

### The Three Steps of RAG:

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  RETRIEVAL  │ ──▶ │  AUGMENTATION   │ ──▶ │   GENERATION     │
│             │     │                 │     │                  │
│ Find relevant│     │ Inject retrieved │     │ LLM generates    │
│ documents    │     │ context into    │     │ answer using     │
│ from vector  │     │ the prompt      │     │ retrieved context│
│ store        │     │                 │     │                  │
└─────────────┘     └─────────────────┘     └──────────────────┘
```

### Simple Analogy:

Think of it like an exam:
- **Without RAG:** The student answers purely from memory (the LLM's training data)
- **With RAG:** The student is allowed to bring reference notes to the exam (retrieved documents), making answers more accurate and specific

### In Our Application:

The chatbot needs to answer questions about the YOU vs YOU app specifically. Instead of training a custom model (expensive, slow), we:
1. Store our Application-Usecase-Guide.md as searchable vectors
2. When a user asks a question, find the most relevant sections
3. Feed those sections to the LLM along with the user's actual data from the database
4. The LLM generates a personalized, contextually accurate response

---

## 2. Why RAG Instead of Fine-Tuning?

| Approach | Fine-Tuning | RAG |
|----------|------------|-----|
| **Cost** | High (GPU training required) | Low (only inference cost) |
| **Update knowledge** | Retrain the model | Update the document |
| **Hallucination risk** | Higher | Lower (grounded in docs) |
| **Personalization** | Difficult | Easy (inject user data) |
| **Setup time** | Days/weeks | Hours |
| **Model size needed** | Large | Can work with smaller models |

**Our choice:** RAG because:
- We have a specific knowledge document (Application-Usecase-Guide.md — 50 pages)
- We need to combine static knowledge with live user data from the database
- We want answers grounded in our actual app documentation
- We can update the guide without retraining anything

---

## 3. System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        USER SENDS MESSAGE                           │
│                    POST /api/chat { message }                       │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    STEP 1: SCOPE GUARDRAIL                          │
│                                                                      │
│  is_in_scope(query) → checks:                                       │
│    • Keyword-based: IN_SCOPE_TOPICS / OUT_OF_SCOPE_SIGNALS          │
│    • Semantic: FAISS similarity to knowledge chunks                  │
│    • If out-of-scope → return polite redirect immediately            │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ (in-scope)
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│           STEP 2: RETRIEVAL (FAISS Vector Search)                   │
│                                                                      │
│  User query → SentenceTransformer → query_embedding (384-dim)       │
│  FAISS index.search(query_embedding, top_k=5)                       │
│  Returns: top 5 most similar knowledge chunks with scores           │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│           STEP 3: USER DATA RETRIEVAL (Database)                    │
│                                                                      │
│  detect_intents(query) → ["habits", "expenses", ...]                │
│  Query SQLAlchemy models for user-specific data:                     │
│    • Habits + streaks + completion rates                             │
│    • Journal entries (filtered by date if mentioned)                 │
│    • Expenses + budgets + savings                                    │
│    • Skill challenges + ratings                                      │
│    • Check-in history + streaks                                      │
│  ⚠️ NEVER includes passwords                                        │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│           STEP 4: PROMPT BUILDING (Augmented Generation)            │
│                                                                      │
│  build_prompt() creates:                                             │
│    [System Instructions] +                                           │
│    [Retrieved Knowledge Chunks from FAISS] +                         │
│    [User Data from Database] +                                       │
│    [User's Question]                                                 │
│                                                                      │
│  Format: <s>[INST] {system}{guide}{user_data}\nQuestion: {q} [/INST]│
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│           STEP 5: LLM GENERATION (HuggingFace API)                  │
│                                                                      │
│  POST https://api-inference.huggingface.co/models/Mistral-7B        │
│  With: max_new_tokens=512, temperature=0.7, top_p=0.9               │
│                                                                      │
│  If HF API unavailable → comprehensive local fallback               │
│  (12+ topic categories with data-aware responses)                    │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│           STEP 6: RESPONSE TO USER                                  │
│                                                                      │
│  { reply: "...", sources: ["guide", "user_data"] }                  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. Component Deep-Dive

### 4.1 Document Loading & Chunking (LangChain)

**File:** `backend/app/rag_engine.py` → `_load_and_chunk_document()`

**What is chunking?**
Large documents must be split into smaller pieces (chunks) because:
- Embedding models have token limits
- Smaller chunks give more precise search results
- The LLM prompt has a context window limit

**Our approach (2-stage chunking):**

```python
# Stage 1: Split by markdown headers (preserves section boundaries)
from langchain.text_splitter import MarkdownHeaderTextSplitter
md_splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on=[("##", "Section")],
    strip_headers=False,
)

# Stage 2: Further split large sections into overlapping chunks
from langchain.text_splitter import RecursiveCharacterTextSplitter
char_splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,      # max characters per chunk
    chunk_overlap=200,   # overlap to avoid losing context at boundaries
    separators=["\n\n", "\n", ". ", " ", ""],
)
```

**Why two stages?**
1. `MarkdownHeaderTextSplitter` respects document structure — doesn't split mid-section
2. `RecursiveCharacterTextSplitter` handles sections that are still too large, with smart overlap

**Why chunk_overlap=200?**
Without overlap, information at chunk boundaries gets lost. Example:
```
Chunk 1: "...track daily completion."       ← context ends here
Chunk 2: "Add daily spending and set budget..."  ← new chunk starts
```
With overlap, the boundary content appears in both chunks, ensuring the retriever can find it.

**Output:** ~80-120 chunks, each with `{title, content}` metadata

---

### 4.2 Embedding Model (Sentence-Transformers)

**File:** `backend/app/rag_engine.py` → `_get_embedder()`, `embed_texts()`

**What are embeddings?**
An embedding is a dense numerical vector that captures the semantic meaning of text. Similar meanings produce similar vectors.

```
"How do I track my habits?"  →  [0.12, -0.45, 0.78, ..., 0.33]  (384 numbers)
"Habit completion tracking"  →  [0.11, -0.43, 0.77, ..., 0.31]  (very similar!)
"What's the weather today?"  →  [0.89, 0.22, -0.56, ..., -0.71]  (very different!)
```

**Model used:** `sentence-transformers/all-MiniLM-L6-v2`

| Property | Value |
|----------|-------|
| **Architecture** | MiniLM (distilled from BERT) |
| **Embedding Dimension** | 384 |
| **Model Size** | ~80 MB |
| **Speed** | Very fast (CPU-friendly) |
| **Training** | Trained on 1B+ sentence pairs |
| **Use Case** | Semantic similarity, search |

**Why this model (not GPT-2)?**
- GPT-2 is a *generative* model, not designed for embeddings
- Sentence-Transformers are specifically trained for *semantic similarity*
- all-MiniLM-L6-v2 is the most popular choice for RAG because it's fast, small, and accurate
- It runs efficiently on CPU (no GPU required)

**How embeddings work in our system:**

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# At indexing time: embed all knowledge chunks
chunk_embeddings = model.encode(["chunk1 text", "chunk2 text", ...])
# Shape: (num_chunks, 384)

# At query time: embed the user's question
query_embedding = model.encode(["How do I improve my habits?"])
# Shape: (1, 384)

# Then: find nearest chunks using FAISS
```

**Normalization:**
We normalize embeddings (`normalize_embeddings=True`) so that inner product equals cosine similarity. This is important for FAISS performance.

---

### 4.3 Vector Store (FAISS)

**File:** `backend/app/rag_engine.py` → `_build_faiss_index()`, `_save_index()`, `_load_index_from_disk()`

**What is FAISS?**
FAISS (Facebook AI Similarity Search) is a library developed by Meta/Facebook Research for efficient similarity search of dense vectors. It's the industry standard for vector databases in production ML systems.

**Why FAISS over other options?**

| Vector Store | Pros | Cons |
|-------------|------|------|
| **FAISS** ✅ | Fast, local, no server needed, production-proven | No metadata filtering built-in |
| ChromaDB | Easy API, metadata filters | Slower for large datasets |
| Pinecone | Fully managed cloud | Requires API key, costs money |
| Weaviate | Full-featured | Complex setup, overkill for us |
| Simple list | Easy to understand | O(n) search — very slow |

**How FAISS works:**

```python
import faiss

# Create an index for 384-dimensional vectors using Inner Product
# (equivalent to cosine similarity when vectors are normalized)
index = faiss.IndexFlatIP(384)

# Add all chunk embeddings to the index
index.add(chunk_embeddings)  # O(n) — one-time cost

# Search: find top-5 most similar chunks to query
scores, indices = index.search(query_embedding, k=5)  # O(n) for flat, but VERY fast
```

**Index type: `IndexFlatIP`**
- `Flat` = exact search (checks every vector) — perfect for our ~100 chunks
- `IP` = Inner Product similarity metric
- For larger datasets (>100k vectors), you'd use `IndexIVFFlat` or `IndexHNSW` for approximation

**Persistence:**
We save the FAISS index and chunk metadata to disk so it doesn't rebuild on every server restart:

```
faiss_index/
├── index.faiss     # Binary FAISS index file
└── chunks.pkl      # Pickled list of chunk metadata
```

**Startup flow:**
1. Try loading from disk → if found, skip building
2. If not found → load guide → chunk → embed → build FAISS → save to disk

---

### 4.4 Retrieval (Semantic Search)

**File:** `backend/app/rag_engine.py` → `search_chunks()`

**The retrieval pipeline:**

```
User: "How can I save money using daily budget?"
                    │
                    ▼
         ┌──────────────────┐
         │   Embed Query    │
         │   with same      │
         │   SentenceModel  │
         └────────┬─────────┘
                  │
                  ▼  [0.23, -0.11, 0.67, ...] (384-dim)
         ┌──────────────────┐
         │  FAISS Search    │
         │  index.search()  │
         │  top_k = 5       │
         └────────┬─────────┘
                  │
                  ▼
    ┌─────────────────────────────────┐
    │   Results (ranked by score)     │
    │                                 │
    │   1. Page 23: Daily expense     │  score: 0.82
    │      tracking use case...       │
    │                                 │
    │   2. Page 26: How users can     │  score: 0.76
    │      save money with app...     │
    │                                 │
    │   3. Page 24: Monthly budget    │  score: 0.71
    │      and savings use case...    │
    │                                 │
    │   4. Page 22: Expenses module   │  score: 0.65
    │      overview...                │
    │                                 │
    │   5. Page 4: First-day setup    │  score: 0.42
    │      ...daily budget...         │
    └─────────────────────────────────┘
```

**Similarity threshold:** Only chunks with score ≥ 0.25 are included. This filters out irrelevant results.

**Fallback chain:**
1. FAISS (primary) — semantic similarity with dense embeddings
2. TF-IDF (fallback) — term frequency-based if FAISS unavailable
3. Keyword match (last resort) — simple word overlap count

---

### 4.5 User Context Retrieval (Database)

**File:** `backend/app/rag_engine.py` → `get_user_context()`

This is what makes our RAG system **personalized**. Beyond static knowledge, we inject the user's actual data.

**Intent Detection → Targeted Queries:**

```python
# User asks: "How are my habits doing?"
# detect_intents() → ["habits"]
# → Only query habits table (skip journal, expenses, skills)

# User asks: "Give me improvement suggestions"
# detect_intents() → ["habits", "journal", "expenses", "skills", "checkins"]
# → Query everything for comprehensive analysis
```

**Data retrieved per intent:**

| Intent | Database Tables | Data Extracted |
|--------|----------------|----------------|
| `habits` | Habit, HabitLog | Active habits, 30-day completion rate, current streak, target days |
| `journal` | JournalEntry | Recent entries (type, date, content preview, rating) |
| `expenses` | Expense, MonthlyBudget | Budget, total spent, saved amount, recent transactions |
| `skills` | JournalEntry (monthly) | Skill goals, ratings, feedback, daily progress |
| `checkins` | DailyCheckIn | Total check-ins, current streak, recent dates |

**Date-aware queries:**
If the user mentions "February" or "March 2026", we filter data to that specific month.

**Security:** Passwords are NEVER included in any context sent to the LLM.

---

### 4.6 Prompt Engineering (Augmented Generation)

**File:** `backend/app/rag_engine.py` → `build_prompt()`

The prompt is the most critical part of RAG. It combines everything:

```
<s>[INST]
┌─────────────────────────────────────────────────┐
│ SYSTEM INSTRUCTIONS                             │
│ • You are the YOU vs YOU assistant               │
│ • Help with habits, journal, expenses, skills    │
│ • NEVER reveal passwords                         │
│ • Use user data for personalized answers         │
│ • Stay on-topic (redirect if off-scope)          │
│ • Be warm, encouraging, practical                │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ RETRIEVED GUIDE KNOWLEDGE (from FAISS)           │
│                                                   │
│ [Chunk 1 — Page 23: Daily expense tracking]       │
│  Daily expense logging is most effective when     │
│  done instantly. Set today budget in morning...   │
│                                                   │
│ [Chunk 2 — Page 26: How users can save money]     │
│  Money saving is achieved through awareness...    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ USER DATA (from database)                        │
│                                                   │
│ Username: John, Member since: 2026-01-15         │
│ Habits:                                           │
│ - 🏃 Running: streak 5 days, 73.3% rate          │
│ - 📚 Reading: streak 0 days, 40.0% rate          │
│ Expenses: Budget ₹15000, Spent ₹8500, Saved ₹6500│
│ Check-ins: 45 total, current streak 5 days       │
└─────────────────────────────────────────────────┘

User question: How can I save money using daily budget?
[/INST]
```

**Why this format?**
- `<s>[INST]...[/INST]` is the Mistral instruction format
- System instructions set behavioral boundaries
- Retrieved chunks provide factual grounding (reduces hallucination)
- User data enables personalized responses
- The question comes last for the model to focus on

---

### 4.7 LLM Inference (HuggingFace API)

**File:** `backend/app/routes/chatbot.py` → `_call_hf_api()`

**Model:** `mistralai/Mistral-7B-Instruct-v0.3`

| Parameter | Value | Why |
|-----------|-------|-----|
| `max_new_tokens` | 512 | Enough for detailed response, not too long |
| `temperature` | 0.7 | Balanced creativity vs. accuracy |
| `top_p` | 0.9 | Nucleus sampling for diverse responses |
| `do_sample` | True | Enable sampling (not greedy) |
| `return_full_text` | False | Only return the generated response |

**Error handling:**
- 503 (model loading) → Wait estimated time, retry once
- Timeout → Return fallback response
- Any error → Comprehensive local fallback

**Comprehensive Fallback System:**
When the HF API is unavailable, the fallback handles 12+ categories:
- Greetings, How-to-use, Habits, Journal, Expenses, Skills
- Productivity, Check-ins, Improvement, Dashboard, Goals, Thanks
- Each category is data-aware (checks if user data exists in the prompt)

---

### 4.8 Scope Guardrail (Boundary Classifier)

**File:** `backend/app/rag_engine.py` → `is_in_scope()`

**Purpose:** Ensure the chatbot ONLY answers questions about the application. Reject off-topic questions politely.

**Two-layer classification:**

```
Layer 1: KEYWORD CHECK
  ├── IN_SCOPE_TOPICS: ["habit", "journal", "expense", "budget", ...]
  ├── OUT_OF_SCOPE_SIGNALS: ["weather", "stocks", "recipe", ...]
  └── Quick decision if strong signal found

Layer 2: SEMANTIC CHECK (if keywords inconclusive)
  ├── Embed the query
  ├── Search FAISS for nearest knowledge chunk
  ├── If best_score ≥ 0.25 → in-scope
  └── If best_score < 0.25 → out-of-scope
```

**Example:**

| Query | Layer 1 | Layer 2 | Result |
|-------|---------|---------|--------|
| "How to improve my habits?" | ✅ "habit", "improve" | — | In-scope |
| "What's the weather today?" | ❌ "weather" | — | Out-of-scope |
| "Tips for daily routine?" | ✅ "daily", "routine" | — | In-scope |
| "Tell me a joke" | No match | Score: 0.08 | Out-of-scope |
| "Best way to track progress?" | ✅ "track", "progress" | — | In-scope |

**Spending context override:** If someone asks "How much do I spend on movies?", the keyword "movie" is out-of-scope BUT "spend" provides spending context, so it's allowed.

---

## 5. Data Flow — End-to-End Pipeline

```
USER                    FRONTEND                    BACKEND
  │                        │                           │
  │  "How are my habits    │                           │
  │   doing this month?"   │                           │
  │ ──────────────────────▶│                           │
  │                        │  POST /api/chat           │
  │                        │  { message: "..." }       │
  │                        │  Authorization: Bearer JWT│
  │                        │──────────────────────────▶│
  │                        │                           │
  │                        │                    ┌──────┴──────────┐
  │                        │                    │ 1. Verify JWT   │
  │                        │                    │ 2. Rate limit   │
  │                        │                    │ 3. Validate msg │
  │                        │                    └──────┬──────────┘
  │                        │                           │
  │                        │                    ┌──────┴──────────┐
  │                        │                    │ 4. SCOPE GUARD  │
  │                        │                    │ is_in_scope()   │
  │                        │                    │ → True ✅        │
  │                        │                    └──────┬──────────┘
  │                        │                           │
  │                        │                    ┌──────┴──────────┐
  │                        │                    │ 5. FAISS SEARCH │
  │                        │                    │ embed query     │
  │                        │                    │ search index    │
  │                        │                    │ → 5 chunks      │
  │                        │                    └──────┬──────────┘
  │                        │                           │
  │                        │                    ┌──────┴──────────┐
  │                        │                    │ 6. DB CONTEXT   │
  │                        │                    │ detect_intents  │
  │                        │                    │ query habits,   │
  │                        │                    │ logs, etc.      │
  │                        │                    └──────┬──────────┘
  │                        │                           │
  │                        │                    ┌──────┴──────────┐
  │                        │                    │ 7. BUILD PROMPT │
  │                        │                    │ system + chunks │
  │                        │                    │ + user data     │
  │                        │                    │ + question      │
  │                        │                    └──────┬──────────┘
  │                        │                           │
  │                        │                    ┌──────┴──────────┐
  │                        │                    │ 8. HF API CALL  │
  │                        │                    │ Mistral-7B      │
  │                        │                    │ → generated text│
  │                        │                    └──────┬──────────┘
  │                        │                           │
  │                        │  { reply: "Your habits    │
  │                        │    are doing well! 🏃     │
  │                        │    Running: 5-day streak  │
  │                        │    ...",                   │
  │                        │    sources: ["guide",     │
  │                        │     "user_data"] }        │
  │                        │◀──────────────────────────│
  │  Display response      │                           │
  │◀───────────────────────│                           │
```

---

## 6. File Structure

```
backend/
├── app/
│   ├── rag_engine.py          ← Core RAG logic (embedding, FAISS, retrieval, prompt)
│   ├── routes/
│   │   └── chatbot.py         ← API endpoint, HF API call, fallback responses
│   ├── models.py              ← SQLAlchemy models (User, Habit, Journal, etc.)
│   ├── auth.py                ← JWT authentication
│   ├── database.py            ← Database connection
│   └── config.py              ← App settings (env vars)
├── .env                       ← Environment variables (secrets)
├── .env.example               ← Template with all required vars
├── requirements.txt           ← Python dependencies
└── faiss_index/               ← Persisted FAISS index (auto-generated)
    ├── index.faiss            ← Binary FAISS index
    └── chunks.pkl             ← Pickled chunk metadata

about/
├── Application-Usecase-Guide.md   ← Knowledge base document (50 pages)
├── Application-Usecase-Guide.pdf  ← PDF version
└── RAG_SYSTEM_README.md           ← This file
```

---

## 7. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HF_API_TOKEN` | *(empty)* | HuggingFace API token for Mistral-7B inference |
| `HF_MODEL` | `mistralai/Mistral-7B-Instruct-v0.3` | HuggingFace model ID for text generation |
| `EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | SentenceTransformer model for embeddings |
| `CHUNK_SIZE` | `800` | Max characters per knowledge chunk |
| `CHUNK_OVERLAP` | `200` | Overlap between consecutive chunks |
| `RAG_TOP_K` | `5` | Number of chunks to retrieve per query |
| `RAG_SIMILARITY_THRESHOLD` | `0.25` | Minimum similarity score to include a chunk |
| `SECRET_KEY` | *(change this)* | JWT signing secret |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | JWT token expiry in minutes |
| `DATABASE_URL` | `sqlite:///./habits.db` | Database connection string |

### New Variables Added (RAG-specific):

```bash
# These are the NEW environment variables added for the RAG system:
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
CHUNK_SIZE=800
CHUNK_OVERLAP=200
RAG_TOP_K=5
RAG_SIMILARITY_THRESHOLD=0.25
```

The `HF_API_TOKEN` and `HF_MODEL` variables already existed but are now explicitly documented.

---

## 8. Key Concepts for Project Explanation

### 8.1 Vector Embeddings

> "We convert text into 384-dimensional numeric vectors using a pre-trained SentenceTransformer model (all-MiniLM-L6-v2). These vectors capture semantic meaning — similar texts produce similar vectors, enabling semantic search instead of keyword matching."

### 8.2 FAISS (Facebook AI Similarity Search)

> "FAISS is Meta's open-source library for efficient vector similarity search. We use IndexFlatIP (Inner Product index) which performs exact nearest-neighbor search. At query time, we embed the user's question and find the top-5 most similar knowledge chunks from our indexed Application-Usecase-Guide document."

### 8.3 LangChain Document Processing

> "We use LangChain's MarkdownHeaderTextSplitter to respect document structure (splitting at ## headers), followed by RecursiveCharacterTextSplitter to break large sections into overlapping 800-character chunks. The overlap of 200 characters ensures context at chunk boundaries is preserved."

### 8.4 The RAG Pipeline

> "Our RAG pipeline has 6 steps: (1) Scope guardrail checks if the question is about our app, (2) FAISS retrieves relevant knowledge chunks, (3) Database queries fetch user-specific data, (4) A structured prompt combines system instructions + retrieved context + user data + question, (5) The prompt is sent to Mistral-7B via HuggingFace API, (6) The response is returned with source attribution."

### 8.5 Scope Guardrail

> "We implement a two-layer boundary classifier: keyword-based quick check against curated topic lists, plus semantic similarity check against the FAISS index. This ensures the chatbot only answers questions about the YOU vs YOU application and politely redirects off-topic queries."

### 8.6 Personalization Through Database Context

> "Unlike generic RAG systems, our chatbot is personalized. We detect the user's intent from their question, query the database for relevant data (habits, journal, expenses, skills, check-ins), and inject this live data into the prompt alongside static knowledge. This enables responses like 'Your Running habit has a 5-day streak and 73% completion rate — try reducing the target to improve consistency.'"

---

## 9. Interview Q&A

**Q: What is RAG and why did you use it?**
> RAG stands for Retrieval-Augmented Generation. We use it because we have a domain-specific knowledge document (50-page use-case guide) and need to combine it with live user data. RAG is cheaper and more maintainable than fine-tuning, provides grounded answers, and can be updated without retraining.

**Q: Why FAISS instead of ChromaDB or Pinecone?**
> FAISS is the fastest option for our scale (~100 chunks), runs entirely locally with no external dependencies or costs, is battle-tested by Meta in production, and provides exact nearest-neighbor search which is ideal for our knowledge base size.

**Q: Why sentence-transformers/all-MiniLM-L6-v2 instead of GPT-2?**
> GPT-2 is a generative model, not designed for producing quality embeddings. all-MiniLM-L6-v2 is specifically trained for semantic similarity tasks using contrastive learning on 1B+ sentence pairs. It produces 384-dim embeddings that are fast, compact, and highly effective for similarity search. It also runs efficiently on CPU.

**Q: How do you prevent the chatbot from answering off-topic questions?**
> We have a two-layer scope guardrail: (1) keyword matching against curated in-scope and out-of-scope topic lists, and (2) semantic similarity check using the FAISS index — if the user's query doesn't semantically match any knowledge chunk above a threshold (0.25), it's rejected with a polite redirect.

**Q: How does the system handle the case when the HuggingFace API is down?**
> We have a comprehensive fallback system that covers 12+ topic categories with pre-written, data-aware responses. The fallback checks if user data exists in the prompt and generates contextual responses. This ensures the chatbot always responds, even without external API access.

**Q: How do you ensure user passwords are never leaked?**
> The get_user_context() function explicitly queries only non-sensitive fields. Password hashes are never included in any data dictionary. The system prompt also instructs the LLM to never mention passwords.

**Q: What is chunk overlap and why does it matter?**
> Chunk overlap means adjacent chunks share some text at their boundaries. Without it, if a relevant sentence spans two chunks, neither chunk alone captures the full context. Our 200-character overlap ensures smooth continuity and prevents information loss at boundaries.

**Q: How does the personalization work?**
> The system detects the intent of the user's question (e.g., asking about "habits" vs "expenses"), then queries only the relevant database tables. This data is formatted and injected into the prompt alongside retrieved knowledge chunks, enabling the LLM to give personalized answers referencing the user's actual numbers, streaks, and patterns.

**Q: What's the difference between your old system and the new RAG system?**
> The old system used keyword matching (`if "how to use" in query`) to return hardcoded strings — only 3-4 responses were possible. The new system uses semantic vector search (understands meaning, not just keywords), retrieves contextual knowledge from a 50-page guide, injects live user data, and sends everything to a large language model. It can handle ANY question about the application, not just pre-programmed ones.

---

## 10. Comparison: Before vs After

### Before (Simple Keyword Matching)

```python
# OLD SYSTEM — 3 hardcoded responses
if any(w in query_lower for w in ["how to use", "how do i"]):
    return "Welcome to YOU vs YOU! This app has 5 key modules..."

if any(w in query_lower for w in ["productive", "productivity"]):
    return "Here's a productivity routine..."

if any(w in query_lower for w in ["improve", "suggestion"]):
    return "Here are general improvement tips..."

# Default
return "I'm your YOU vs YOU assistant! I can help with..."
```

**Problems:**
- ❌ Only 3 response categories + 1 default
- ❌ Exact keyword matching (misses semantic similarity)
- ❌ Responses are generic (not personalized)
- ❌ No use of the 50-page guide document
- ❌ No boundary protection (would try to answer any question)
- ❌ No user data integration

### After (Advanced RAG System)

```python
# NEW SYSTEM — Full RAG Pipeline
# 1. Scope guardrail
allowed, confidence = is_in_scope(message)

# 2. Semantic search with FAISS
guide_chunks = search_chunks(message, top_k=5)

# 3. Database user context
user_context = get_user_context(db, user_id, message)

# 4. Augmented prompt
prompt = build_prompt(message, guide_chunks, user_context, username)

# 5. LLM generation
reply = await _call_hf_api(prompt)
```

**Improvements:**
- ✅ Handles ANY question about the application
- ✅ Semantic search (understands meaning, not just keywords)
- ✅ Uses entire 50-page guide as searchable knowledge base
- ✅ Personalized with live user data from database
- ✅ Boundary protection rejects off-topic questions
- ✅ 12+ fallback categories when API is unavailable
- ✅ FAISS index persisted to disk (fast startup)
- ✅ Graceful degradation: FAISS → TF-IDF → keyword matching

---

## 11. Future Improvements

| Improvement | Description |
|-------------|-------------|
| **Conversation Memory** | Store chat history and include last N messages in prompt for multi-turn conversations |
| **Re-ranking** | Add a cross-encoder re-ranker after FAISS retrieval for more precise results |
| **Hybrid Search** | Combine dense (FAISS) + sparse (BM25) search for better recall |
| **Streaming Responses** | Use Server-Sent Events (SSE) for real-time token streaming |
| **Local LLM** | Run a small LLM locally (e.g., Phi-3, Gemma) instead of HuggingFace API |
| **User Feedback Loop** | Collect thumbs up/down to improve retrieval quality over time |
| **Multi-document RAG** | Index additional documents (FAQs, changelog, feature docs) |
| **Query Expansion** | Use LLM to expand ambiguous queries before retrieval |

---

## Dependencies

```
faiss-cpu==1.7.4                  # Facebook AI Similarity Search
sentence-transformers>=2.2.2      # Dense embedding models
langchain>=0.1.0                  # Document processing framework
langchain-community>=0.0.10       # LangChain community integrations
langchain-text-splitters>=0.0.1   # Text splitting utilities
transformers>=4.36.0              # HuggingFace Transformers (used by sentence-transformers)
torch>=2.1.0                      # PyTorch (used by sentence-transformers)
scikit-learn==1.4.0               # TF-IDF fallback
requests==2.31.0                  # HuggingFace API calls
numpy>=1.24.0                     # Numerical operations
```

---

*End of RAG System Documentation*
