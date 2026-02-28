"""FAISS vector index manager.

Uses IndexFlatIP (inner product on normalized vectors = cosine similarity).
Persists index to disk.
"""

import os
import numpy as np
from typing import Tuple

from app.config import FAISS_INDEX_PATH, FAISS_DIMENSION

# Global index instance
_index = None


def load_or_create(index_path: str = FAISS_INDEX_PATH) -> None:
    """Load FAISS index from disk or create a new one.

    Args:
        index_path: Path to the FAISS index file.
    """
    global _index
    import faiss

    if os.path.exists(index_path):
        _index = faiss.read_index(index_path)
        print(f"[FAISS] Loaded index from {index_path} with {_index.ntotal} vectors")
    else:
        _index = faiss.IndexFlatIP(FAISS_DIMENSION)
        print(f"[FAISS] Created new IndexFlatIP with dim={FAISS_DIMENSION}")


def add_vectors(vectors: np.ndarray) -> int:
    """Add vectors to the FAISS index.

    Args:
        vectors: (N, 384) float32 numpy array of normalized vectors.

    Returns:
        Starting vector ID for the added vectors.
    """
    global _index
    if _index is None:
        raise RuntimeError("FAISS index not initialized. Call load_or_create() first.")

    start_id = _index.ntotal
    vectors = np.ascontiguousarray(vectors, dtype=np.float32)
    if vectors.ndim == 1:
        vectors = vectors.reshape(1, -1)
    _index.add(vectors)
    return start_id


def search(query_vector: np.ndarray, top_k: int = 10) -> Tuple[np.ndarray, np.ndarray]:
    """Search the FAISS index for similar vectors.

    Args:
        query_vector: 384-dim float32 query vector (normalized).
        top_k: Number of results to return.

    Returns:
        Tuple of (scores array, ids array), each of shape (top_k,).
    """
    if _index is None:
        raise RuntimeError("FAISS index not initialized. Call load_or_create() first.")

    if _index.ntotal == 0:
        return np.array([]), np.array([])

    query = np.ascontiguousarray(query_vector.reshape(1, -1), dtype=np.float32)
    actual_k = min(top_k, _index.ntotal)
    scores, ids = _index.search(query, actual_k)
    return scores[0], ids[0]


def save(index_path: str = FAISS_INDEX_PATH) -> None:
    """Save the FAISS index to disk."""
    if _index is None:
        return
    import faiss
    faiss.write_index(_index, index_path)
    print(f"[FAISS] Saved index to {index_path} with {_index.ntotal} vectors")


def get_total_vectors() -> int:
    """Return the total number of vectors in the index."""
    if _index is None:
        return 0
    return _index.ntotal
