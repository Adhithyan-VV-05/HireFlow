# 🚀 HireFlow AI: Architecture & System Overview

> **An AI-driven recruitment automation system** featuring hybrid search, advanced resume parsing, semantic skill matching, and conversational AI interviews.

---

## 🏗️ 1. High-Level System Architecture

HireFlow AI is built on a modern **client-server architecture**, heavily integrating NLP and ML models for intelligent candidate evaluation.

```mermaid
graph TD
    %% Frontend Layer
    subgraph "Frontend Interface (React + Vite + Tailwind)"
        UI_Recruiter[Recruiter Dashboard]
        UI_Candidate[Candidate Portal]
        UI_Interviewer[Interviewer Portal]
        UI_Fairness[Fairness Panel]
    end

    %% API Layer
    API_Gateway[FastAPI Backend - API Routes]

    %% ML/Core Layer
    subgraph "Core AI/ML Engine"
        NLP_NER[BERT-based NER]
        NLP_Embed[Sentence Transformers]
        Search_Dense[FAISS Vector Index]
        Search_Sparse[BM25 Keyword Index]
        Rank_Engine[RRF + Skill Ranker]
        LLM[OpenAI / Gemini LLM]
    end

    %% Storage Layer
    subgraph "Storage & Persistence"
        DB[(SQLite Database)]
        Storage[File System - Resumes]
    end

    %% Connections
    UI_Recruiter <-->|REST API| API_Gateway
    UI_Candidate <-->|REST API| API_Gateway
    UI_Interviewer <-->|REST API| API_Gateway
    UI_Fairness <-->|REST API| API_Gateway

    API_Gateway --> NLP_NER
    API_Gateway --> NLP_Embed
    API_Gateway --> Rank_Engine
    API_Gateway --> LLM
    API_Gateway --> Storage
    
    NLP_Embed --> Search_Dense
    NLP_Embed --> Search_Sparse
    
    Search_Dense --> Rank_Engine
    Search_Sparse --> Rank_Engine
    
    Rank_Engine --> DB
```

---

## ⚙️ 2. Technology Stack

A robust stack designed for speed, scalability, and state-of-the-art AI integration:

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React, Vite, Tailwind CSS, Recharts | Interactive UI for recruiters, candidates, and interviewers. |
| **Backend API** | FastAPI, Python 3.11+ | High-performance async API server. |
| **Database** | SQLite, SQLAlchemy, FAISS | Relational data and dense vector approximations. |
| **NLP & ML** | HuggingFace, PyTorch, Sentence-Transformers | Core ML frameworks for embedding and entity extraction. |
| **GenAI** | OpenAI GPT / Google Gemini API | Conducts dynamic, multi-turn technical interviews. |

---

## 🧠 3. How It Works: The AI Pipeline

The system processes resumes and matches candidates through a sophisticated **9-layer pipeline**.

```mermaid
flowchart LR
    Upload(Document Upload) --> Parse(Text Extraction)
    Parse --> NER(BERT Entity Extraction)
    NER --> Chunk(Section Chunking)
    Chunk --> Embed(MiniLM Embedding)
    
    subgraph Hybrid Search Engine
        Embed --> FAISS(FAISS Dense)
        Chunk --> BM25(BM25 Sparse)
        FAISS --> RRF(Reciprocal Rank Fusion)
        BM25 --> RRF
    end
    
    RRF --> Boost(Skill Boost Engine)
    Boost --> Bias(Bias & Fairness Check)
    Bias --> Output(Ranked Matches)
    Output --> Chat(AI Tech Interview)
```

### 🔹 Layer Details

1. **Document Parsing**: Extracts text from PDFs (`PyMuPDF`) and DOCX (`python-docx`), preserving document structure.
2. **Named Entity Recognition (NER)**: Uses `dslim/bert-base-NER` to detect Skills, Job Titles, Companies, and Education.
3. **Chunking**: Splits parsed text into logical segments (Skills, Experience, Education, Summary) for fine-grained analysis.
4. **Vector Embedding**: Uses `all-MiniLM-L6-v2` to convert chunks into 384-dimensional dense vectors representing semantic meaning.
5. **Hybrid Search**: 
   - **Dense (FAISS)** matches conceptual meaning (e.g., "Fullstack Developer" matches "React/Node Engineer").
   - **Sparse (BM25)** ensures precise keyword matches.
6. **Reciprocal Rank Fusion (RRF)**: Merges dense and sparse ranks into a single unified score.
7. **Skill & Aptitude Boost**: Multiplies candidate scores based on how well their extracted skills overlap with the job description.
8. **Fairness Evaluation**: Strips out identifiers like Location or Company from the ranking algorithm and checks for biases (e.g., educational clustering).
9. **AI Interview**: Feeds candidate data to an LLM (GPT/Gemini) to conduct a personalized, interactive technical screening, scoring them question by question.

---

## 📊 4. System Advantages

- **Deep Semantic Understanding**: Goes beyond basic keyword searches; it understands context and synonyms using Sentence Transformers.
- **Ethical & Unbiased Hiring**: AI scoring runs through strict fairness checks that guarantee location-agnostic and employer-agnostic evaluations.
- **Explainable Ranking**: Recruiters don't just see a score; they see exactly _why_ a candidate scored highly (e.g., Skill Overlap: 80%, Semantic Match: 95%).
- **Interactive Vetting**: The AI Chatbot conducts pre-screenings that adapt dynamically based on the specific candidate's resume and the job's requirements.

---

_This architecture ensures high accuracy in matching while severely minimizing human and systemic biases in the hiring pipeline._
