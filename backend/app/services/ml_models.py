"""ML model loading and startup orchestration."""

from app.db import SessionLocal, FaissMetadata
from app.core.search import build_bm25_index


def load_all_models():
    """Load all ML models during startup."""
    print("[Startup] Loading NER model...")
    from app.core.ner import load_ner_model
    try:
        load_ner_model(device=0)
    except Exception:
        load_ner_model(device=-1)

    print("[Startup] Loading embedding model...")
    from app.core.embedding import load_embedding_model
    try:
        load_embedding_model(device="cuda")
    except Exception:
        load_embedding_model(device="cpu")

    print("[Startup] Loading FAISS index...")
    from app.core.index import load_or_create
    load_or_create()

    print("[Startup] Rebuilding BM25 index from database...")
    rebuild_bm25()

    print("[Startup] Initializing LLM...")
    from app.core.interview import init_llm
    init_llm()


def rebuild_bm25():
    """Rebuild BM25 index from all faiss_metadata records."""
    db = SessionLocal()
    try:
        records = db.query(FaissMetadata).all()
        if records:
            texts = [r.chunk_text for r in records]
            ids = [(r.candidate_id, r.chunk_type) for r in records]
            build_bm25_index(texts, ids)
    finally:
        db.close()
