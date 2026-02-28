# HireFlow AI

AI-driven recruitment automation system with hybrid search, resume parsing, skill matching, and AI-powered interviews.

## Architecture

```
mini_project/
├── backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── core/             # ML modules (NER, embedding, search, ranking, etc.)
│   │   ├── db/               # SQLAlchemy models and session
│   │   ├── routes/           # API endpoints (resume, jobs, candidates, interview)
│   │   ├── services/         # Business logic (pipeline, model loading)
│   │   ├── config.py         # Centralized settings
│   │   ├── schemas.py        # Pydantic request/response models
│   │   └── main.py           # FastAPI app factory
│   ├── uploads/              # Uploaded resume files
│   ├── run.py                # Entry point
│   ├── pyproject.toml        # Python dependencies
│   └── requirements.txt
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── api/client.js     # Centralized API client
│   │   ├── views/            # Main page components
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Additional page components
│   │   └── data/             # Mock data and configuration
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

## Tech Stack

| Layer     | Technology                                                                 |
|-----------|----------------------------------------------------------------------------|
| Frontend  | React, Vite, Tailwind CSS                                                  |
| Backend   | FastAPI, SQLAlchemy, SQLite                                                |
| ML/NLP    | BERT NER (`dslim/bert-base-NER`), Sentence Transformers (`all-MiniLM-L6-v2`) |
| Search    | FAISS (dense), BM25 (sparse), Reciprocal Rank Fusion                       |
| Interview | OpenAI GPT / Google Gemini (optional, falls back to mock)                  |

## Features

- **Resume Upload** — PDF/DOCX parsing, BERT NER extraction, section chunking, sentence embedding
- **Hybrid Search** — Dense (FAISS) + sparse (BM25) retrieval with RRF fusion
- **Skill Matching** — BERT-extracted skill overlap boosting with fairness checks
- **AI Interview** — LLM-powered technical screening with per-question scoring
- **Evaluation** — P@5, Hit Rate@10, NDCG@10 metrics with TF-IDF baseline comparison

## Getting Started

### Prerequisites

- **Python** ≥ 3.11
- **Node.js** ≥ 18
- **uv** (recommended) or pip

### Backend Setup

```bash
cd backend

# Create virtual environment and install dependencies
uv sync          # or: pip install -r requirements.txt

# (Optional) Set API key for AI interviews
export OPENAI_API_KEY="your-key"     # or
export GEMINI_API_KEY="your-key"

# Start the backend server
uv run python run.py
# or: source .venv/bin/activate && python run.py
```

The backend will start on **http://localhost:8000**.

First startup downloads the NER and embedding models (~100 MB). Subsequent starts use cached models.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will start on **http://localhost:5173**.

## API Endpoints

| Method | Endpoint                      | Description                              |
|--------|-------------------------------|------------------------------------------|
| GET    | `/`                           | Health check                             |
| POST   | `/upload-resume`              | Upload and process a resume              |
| GET    | `/candidates`                 | List all candidates                      |
| GET    | `/candidate/{id}`             | Get full candidate profile               |
| POST   | `/match-candidates`           | Match candidates to job description      |
| POST   | `/create-job`                 | Create a new job posting                 |
| GET    | `/jobs`                       | List all jobs                            |
| POST   | `/start-interview`            | Start an AI interview session            |
| POST   | `/interview-message`          | Send a message in an interview           |
| GET    | `/interview-result/{id}`      | Get interview results                    |
| GET    | `/evaluate`                   | Run search quality evaluation            |

## Environment Variables

| Variable         | Required | Description                         |
|------------------|----------|-------------------------------------|
| `OPENAI_API_KEY` | No       | OpenAI key for AI interviews        |
| `GEMINI_API_KEY` | No       | Google Gemini key for AI interviews |

> If neither key is set, the interview feature uses a mock LLM that returns template responses.
