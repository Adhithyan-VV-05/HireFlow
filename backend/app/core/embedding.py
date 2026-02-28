"""Sentence embedding using all-MiniLM-L6-v2.

Generates 384-dim normalized vectors for resume section chunks.
"""

import numpy as np
from typing import Dict, List

from app.config import EMBEDDING_MODEL

# Global model instance
_model = None


def load_embedding_model(device: str = "cpu"):
    """Load embedding model. Call once at startup.

    Args:
        device: 'cuda' for GPU or 'cpu'.
    """
    global _model
    try:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(EMBEDDING_MODEL, device=device)
        print(f"[Embedding] Loaded {EMBEDDING_MODEL} on {device}")
    except Exception as e:
        print(f"[Embedding] Failed on {device}, falling back to CPU: {e}")
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(EMBEDDING_MODEL, device="cpu")
        print(f"[Embedding] Loaded {EMBEDDING_MODEL} on CPU")


def embed_text(text: str) -> np.ndarray:
    """Embed a single text string into a normalized vector.

    Args:
        text: Input text string.

    Returns:
        384-dim float32 numpy array (L2 normalized).
    """
    if _model is None:
        raise RuntimeError("Embedding model not loaded. Call load_embedding_model() first.")

    if not text or not text.strip():
        return np.zeros(384, dtype=np.float32)

    embedding = _model.encode(
        text,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return np.array(embedding, dtype=np.float32)


def embed_texts(texts: List[str]) -> np.ndarray:
    """Embed multiple texts into normalized vectors.

    Args:
        texts: List of text strings.

    Returns:
        (N, 384) float32 numpy array.
    """
    if _model is None:
        raise RuntimeError("Embedding model not loaded. Call load_embedding_model() first.")

    clean = [t if t and t.strip() else "empty" for t in texts]
    embeddings = _model.encode(
        clean,
        normalize_embeddings=True,
        show_progress_bar=False,
        batch_size=32,
    )
    return np.array(embeddings, dtype=np.float32)


def embed_chunks(chunks: Dict[str, str]) -> Dict[str, np.ndarray]:
    """Embed each section chunk separately.

    Args:
        chunks: Dict with keys like 'skills_chunk', 'experience_chunk', etc.

    Returns:
        Dict mapping chunk_type to normalized numpy array.
    """
    result = {}
    for chunk_type, text in chunks.items():
        result[chunk_type] = embed_text(text)
    return result
