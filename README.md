# ⚡ HireFlow AI — Next-Gen Recruitment Automation

**HireFlow AI** is an intelligent, end-to-end recruitment platform designed to bridge the gap between top talent and recruiters using cutting-edge NLP, hybrid search, and conversational AI. 

Built with a **Premium Glassmorphism Design**, the application provides a sleek, high-performance experience for both hiring teams and job seekers.

---

## 🚀 Key Features

### 👤 For Candidates: The Interview Hub
Candidates get a unified, AI-enhanced experience to manage their career journey:
- **Instant Profile Generation**: Upload your resume (PDF/DOCX) and watch as BERT-based NER extracts your skills, experience, and education in seconds.
- **AI Interview Hub**: A centralized place for all interview activities.
    - **🤖 AI Screenings**: Conduct job-specific or general aptitude screenings with a real-time conversational AI.
    - **🎁 Interview Invitations**: Receive, review, and confirm/skip video interview offers from recruiters.
    - **🎥 Video Calls**: Join scheduled video interviews directly from the portal via the integrated calling system.
- **📚 Upskilling Recommendations**: Personalized course suggestions (from Coursera, Udemy, etc.) based on identified skill gaps relative to your target job roles.
- **📈 Live Progress**: Real-time scoring and feedback during AI-led screenings.

### 💼 For Recruiters: The Command Center
Recruiters leverage advanced data science to find the perfect match:
- **Hybrid Matching Engine**: Combines **Dense Vector Search (FAISS)** with **Sparse Keyword Search (BM25)** for unparalleled candidate discovery.
- **🎙️ Unified Interview Management**: A single dashboard to monitor AI screening results, schedule video calls, and track candidate progress.
- **🎯 Skill-Boosted Ranking**: Candidates are automatically ranked using a multi-factor score that considers semantic similarity, exact skill match, and aptitude performance.
- **⚖️ Fairness-Aware Hiring**: Built-in bias checking that excludes location and company names from scoring, focusing purely on merit.
- **📥 Application Tracking**: Manage incoming applications and move candidates through the hiring funnel with a single click.

---

## 🧠 The AI Pipeline (10-Layer Architecture)

The backend implements a sophisticated multi-stage processing pipeline:
1.  **Resume Parsing**: Intelligent text extraction from complex PDF/DOCX layouts.
2.  **Named Entity Recognition (NER)**: Powered by `dslim/bert-base-NER` to extract specialized entities (SKILL, JOB_TITLE, etc.).
3.  **Semantic Chunking**: Breaking down text into context-aware sections (Skills, Experience, Education).
4.  **Embedding Generation**: Transforming text into 384-dimensional vectors using `all-MiniLM-L6-v2`.
5.  **Vector Indexing**: High-speed similarity search via Meta's **FAISS**.
6.  **Hybrid Search**: Combining neural semantic search with BM25 keyword matching via **Reciprocal Rank Fusion (RRF)**.
7.  **Skill Boost Ranking**: Multiplicative scoring based on BERT-extracted skill overlaps.
8.  **Fairness Audit**: Real-time logging and audit reports for transparency and bias prevention.
9.  **AI Interviewing**: Conversational sessions powered by **OpenAI GPT-4o-mini** and **Google Gemini 1.5 Pro**.
10. **Upskilling Synthesis**: Intelligent skill gap analysis and automated course curriculum generation.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Vanilla CSS (Premium Glassmorphism), Lucide Icons |
| **Backend** | FastAPI (Python 3.11+), SQLAlchemy, Pydantic |
| **Database** | SQLite, FAISS (Vector Store) |
| **NLP/ML** | HuggingFace, BERT, Sentence-Transformers, Rank-BM25 |
| **AI Models** | OpenAI GPT-4o-mini, Google Gemini 1.5 Pro/Flash |

---

## 🏁 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- [uv](https://github.com/astral-sh/uv) (recommended) or pip

### 1. Backend Setup
```bash
cd backend
uv sync # or pip install -r requirements.txt

# Configure your environment
# Create a .env file with:
# OPENAI_API_KEY=sk-...
# GEMINI_API_KEY=...

# Run the server
uv run python run.py
```
*Note: The first run will automatically download ~150MB of BERT and MiniLM models.*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173` to see the portal.

---

## 📡 API Overview

| Endpoint | Purpose |
|---|---|
| `POST /api/upload-resume` | Parse resume and generate candidate profile. |
| `POST /api/match-candidates` | AI-driven search across candidate database. |
| `POST /api/start-aptitude` | Initialize an adaptive AI aptitude sesson. |
| `POST /api/schedule-interview`| Dispatch video call invitation to candidate. |
| `GET /api/upskilling-recommendations`| Analyze skill gaps and fetch courses. |

---

## ⚖️ License
Distributed under the MIT License. See `LICENSE` for more information.

---
Designed with ❤️ for the future of hiring.
