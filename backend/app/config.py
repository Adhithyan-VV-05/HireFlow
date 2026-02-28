"""Centralized configuration for HireFlow AI backend."""

import os
from dotenv import load_dotenv

# Load .env file
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

# Base directory of the backend
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Upload directory
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Database
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'hireflow.db')}")

# FAISS index
FAISS_INDEX_PATH = os.path.join(BASE_DIR, "hireflow.index")
FAISS_DIMENSION = 384

# CORS
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

# Embedding model
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# NER model
NER_MODEL = "dslim/bert-base-NER"

# JWT Auth
SECRET_KEY = os.getenv("SECRET_KEY", "hireflow-dev-secret-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
