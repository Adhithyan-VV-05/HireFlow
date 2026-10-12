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

## 🎯 Milestone 3: Interview Assistance & ATS Integration

HireFlow AI includes complete **Milestone 3** capabilities natively integrated into the recruiter command center and candidate portal:

### 1. Role-Specific Interview Question Generator
- **Multi-Role Coverage**: Generates tailored questions across Senior ML Engineer, Data Scientist, Full Stack Developer, DevOps Engineer, Backend Developer, Frontend Developer, Cloud Architect, QA Engineer, Data Engineer, and Product Manager roles.
- **Resume Grounding**: Intersects candidate experience, extracted skills, and specific resume snippets with required job competencies.
- **Strict Schema Validation**: Produces standardized schema (`question`, `type`, `difficulty`, `skill`, `expected_focus`).
- **Resilient Fallback**: Integrated with a comprehensive domain-curated question bank in `app/core/question_bank.py` that activates automatically if external LLM APIs are unreachable or exhausted.

### 2. ATS Integration & Pipeline Management
- **Adapter Pattern**: Extensible `ATSProvider` base interface with production SQLite-backed `MockATSProvider` (no in-memory lists).
- **8-Stage Pipeline**: Manages candidates through `Applied` ➔ `Screening` ➔ `Shortlisted` ➔ `Interview Scheduled` ➔ `Interview In Progress` ➔ `Interview Completed` ➔ `Selected` / `Rejected`.
- **Immutable Audit Trail**: `CandidateStatusHistory` logs all stage transitions with old stage, new stage, timestamp, actor, and recruiter notes.
- **Interview Linking**: Direct synchronization between interview sessions and candidate ATS status.

### 3. Interactive AI Interview Simulation
- **Candidate-Driven Simulation**: Real candidates answer questions one-by-one with character counters and active timers.
- **Anti-Duplicate Submission Guard**: Rejects out-of-order or duplicate submissions via strict index verification.
- **Session Persistence**: Sessions survive page refreshes and browser reloads via database-backed state management.
- **Multi-Dimensional Evaluation**: Answers are scored on Technical Accuracy, Clarity, Depth, and Relevance.
- **Automatic ATS Synchronization**: On completing the final question, the engine calculates aggregate scores and automatically updates the candidate's ATS status to `Interview Completed`.
- **Recruiter Report Modal**: Accessible directly from the recruiter dashboard to review full transcripts, per-question AI scores, strengths, and areas for improvement.

---

## 📊 Milestone 4: Recruitment Dashboard, Voice Screening & Analytics

HireFlow AI includes comprehensive **Milestone 4** capabilities delivering end-to-end hiring intelligence, voice screening automation, and system observability:

### 1. Command Center Recruitment Dashboard & Real KPIs
- **Verified Metrics**: Computes true dynamic metrics from live database records without placeholder values:
  - **Total Candidates**: Total applicants evaluated across all active postings.
  - **Interviews Scheduled**: Sum of scheduled technical interviews and interactive simulations.
  - **Hiring Success Rate**: `(Successful Hires / Completed Hiring Processes) × 100` with transparent formula logging.
  - **Average Time to Hire**: Calculated from candidate application timestamp to final offer/hiring date in elapsed days.
- **5-Stage Pipeline Funnel**: Tracks candidate progression across `Applied` ➔ `Screened` ➔ `Interviewed` ➔ `Offered` ➔ `Hired` with real-time stage counts and conversion rates.
- **Talent Pool Skill Gap Aggregation**: Automatically aggregates most frequent missing competencies across candidate pools to inform targeted sourcing and upskilling programs.

### 2. Voice-Based Candidate Screening Module
- **Spoken Question Generation**: Synthesizes tailored, TTS-ready oral screening questions grounded in candidate experience and required job competencies.
- **Speech Recognition (STT & TTS)**: Native Web Speech API integration in the browser for voice transcription and audio synthesis, backed by persistent audio transcript logging.
- **5-Dimensional Oral Answer Evaluation**:
  - **Technical Knowledge (30%)**: Verification of fundamental architecture and domain-specific concepts.
  - **Response Relevance (25%)**: Direct alignment with the specific problem statement.
  - **Communication & Clarity (20%)**: Articulation, conciseness, and structural delivery.
  - **Completeness (15%)**: Thoroughness in addressing trade-offs and edge cases.
  - **Role-Specific Knowledge (10%)**: Seniority calibration and contextual depth.
- **Preliminary Assessment & Automated Workflow**:
  - `Proceed to Next Round` (Score ≥ 75%)
  - `Requires Further Review` (60% ≤ Score < 75%)
  - `Do Not Proceed at This Stage` (Score < 60%)
- **Automatic ATS Synchronization**: On session completion, candidate ATS status is automatically transitioned to `Screened` with audit trail recording in `CandidateStatusHistory`.

### 3. Real-Time System Health & Status Monitoring
- **5 Subsystem Monitors**: Endpoint `/api/system/status` performs live ping checks with real round-trip latency measurements:
  - **Database**: SQLite WAL mode latency check.
  - **AI Service**: Active LLM provider (Gemini / OpenRouter / Question Bank fallback).
  - **Voice Service**: Speech recognition buffer and TTS client availability.
  - **Resume Parser**: PyMuPDF engine and semantic chunker health.
  - **Matching Engine**: FAISS vector index and BM25 hybrid fusion readiness.

### 4. User Satisfaction Feedback & 85% Target Benchmark
- **Honest Feedback Collection**: Recruiters and candidates can submit 1-5 star ratings and reviews via `/api/feedback`.
- **Target Tracking**: Calculates actual satisfaction percentages (ratings ≥ 4 stars) directly against an explicit **85% target benchmark**, ensuring transparent quality monitoring.

---

## 📡 API Overview

### ATS Pipeline Endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/ats/candidates` | Register/create candidate in ATS pipeline |
| `GET` | `/api/ats/candidates` | List candidates with stage/job filtering |
| `GET` | `/api/ats/candidates/{id}` | Fetch candidate ATS profile and status |
| `PUT / PATCH` | `/api/ats/candidates/{id}/status` | Update candidate pipeline stage with audit log |
| `GET` | `/api/ats/candidates/{id}/history` | Retrieve chronological status transition history |
| `POST` | `/api/ats/candidates/{id}/interview` | Associate an interview with a candidate in ATS |
| `GET` | `/api/ats/candidates/{id}/interviews` | List all interviews for candidate |

### Interview Assistance & Simulation Endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/interviews/questions/generate` | Generate role-specific interview questions |
| `POST` | `/api/interviews/simulation/start` | Launch interactive AI interview session |
| `GET` | `/api/interviews/simulation/{id}/current` | Fetch active question for candidate |
| `POST` | `/api/interviews/simulation/{id}/answer` | Submit answer, evaluate, and advance question |
| `POST` | `/api/interviews/simulation/{id}/complete`| Manually finalize simulation session |
| `GET` | `/api/interviews/simulation/{id}/report` | Fetch full transcript, AI evaluations, and report |
| `GET` | `/api/interviews/simulation/candidate/{id}`| List simulation sessions for a candidate |

### Milestone 4: Dashboard, Voice Screening & Analytics Endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/dashboard/stats` | Retrieve dynamic KPI calculations, pipeline stages, and hiring velocity |
| `GET` | `/api/system/status` | Live round-trip health check and latency across all 5 core subsystems |
| `POST` | `/api/voice-screening/start` | Initialize voice screening session with tailored oral questions |
| `POST` | `/api/voice-screening/session/{id}/answer` | Submit spoken answer transcript and receive multi-dimension evaluation |
| `POST` | `/api/voice-screening/session/{id}/complete`| Finalize voice screening and transition candidate to `Screened` |
| `GET` | `/api/voice-screening/session/{id}/report` | Retrieve comprehensive oral evaluation report and transcripts |
| `POST` | `/api/feedback` | Submit user satisfaction rating and feedback |
| `GET` | `/api/feedback/summary` | Retrieve live satisfaction score measured against 85% benchmark |

---

## 🧪 Automated Testing

HireFlow AI includes a comprehensive automated test suite covering all system capabilities:

```bash
cd backend
python -m pytest tests/ -v
```

**Test Coverage Summary (39 / 39 Tests Passing)**:
- `tests/test_question_generation.py` (8 tests): Multi-role question generation, resume grounding, schema parsing, and fallback resiliency.
- `tests/test_ats_integration.py` (8 tests): `MockATSProvider` SQLite persistence, full 8-stage pipeline progression, status history audit logging, and ATS REST API endpoints.
- `tests/test_interview_simulation.py` (8 tests): Simulation session lifecycle, current question retrieval, real answer submission, duplicate prevention, automated ATS status update to `Interview Completed`, and final report generation.
- `tests/test_milestone4.py` (15 tests): Dynamic KPI formulas, hiring success rate calculation, time-to-hire computation, 5-stage pipeline breakdown, voice screening question generation and 5-dimension rubric scoring, session lifecycle with automatic candidate ATS synchronization, system status latency probes, and 85% satisfaction target verification.

### Live End-to-End Verification
To verify the fully running system against live database and API endpoints:
```bash
cd backend
python verify_milestone4_live.py
```

---

## 🐳 Docker Deployment

HireFlow AI is containerized for production deployment:

```bash
docker build -t hireflow-ai:latest .
docker run -p 8000:8000 -p 5173:5173 hireflow-ai:latest
```

---

## ⚖️ License
Distributed under the MIT License. See `LICENSE` for more information.

---
Designed for the future of hiring.
