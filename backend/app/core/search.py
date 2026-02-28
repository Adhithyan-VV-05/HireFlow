"""Hybrid search with BM25 + FAISS dense retrieval + RRF fusion.

Dense path: Encode query with MiniLM, search FAISS IndexFlatIP.
Sparse path: BM25Okapi over tokenized chunk texts.
Fusion: Reciprocal Rank Fusion (RRF) with configurable weights.
Enhancement: Chunk-type weighting for skills_chunk > full > experience > education.
"""

import numpy as np
from typing import List, Dict
from collections import defaultdict

from rank_bm25 import BM25Okapi

# Global BM25 index
_bm25_index = None
_bm25_corpus_ids = []  # List of (candidate_id, chunk_type) tuples
_bm25_texts = []       # Parallel list of raw texts

# Chunk-type weights: skills_chunk should matter most for matching
CHUNK_WEIGHTS = {
    "skills_chunk": 2.0,
    "experience_chunk": 1.5,
    "education_chunk": 0.8,
    "summary_chunk": 1.2,
    "full_chunk": 1.0,
}

# RRF parameters
RRF_K = 60
DENSE_WEIGHT = 0.6   # Dense (semantic) contributes more
SPARSE_WEIGHT = 0.4  # Sparse (keyword) is supplementary


def build_bm25_index(texts: List[str], corpus_ids: List[tuple]) -> None:
    """Build or rebuild the BM25 index.

    Args:
        texts: List of chunk text strings.
        corpus_ids: Parallel list of (candidate_id, chunk_type) tuples.
    """
    global _bm25_index, _bm25_corpus_ids, _bm25_texts

    _bm25_texts = texts
    _bm25_corpus_ids = corpus_ids
    tokenized = [text.lower().split() for text in texts]
    _bm25_index = BM25Okapi(tokenized)
    print(f"[BM25] Built index with {len(texts)} documents")


def add_to_bm25(texts: List[str], corpus_ids: List[tuple]) -> None:
    """Add new documents to BM25 index by rebuilding it."""
    global _bm25_texts, _bm25_corpus_ids
    _bm25_texts.extend(texts)
    _bm25_corpus_ids.extend(corpus_ids)
    build_bm25_index(_bm25_texts, _bm25_corpus_ids)


def _dense_search(query: str, top_k: int = 20) -> List[Dict]:
    """Dense vector search via FAISS."""
    from app.core.embedding import embed_text
    from app.core.index import search as faiss_search

    query_vec = embed_text(query)
    scores, ids = faiss_search(query_vec, top_k=top_k)

    results = []
    for score, vid in zip(scores, ids):
        if vid >= 0:
            results.append({"vector_id": int(vid), "score": float(score)})
    return results


def _sparse_search(query: str, top_k: int = 20) -> List[Dict]:
    """BM25 sparse search."""
    if _bm25_index is None or not _bm25_texts:
        return []

    tokenized_query = query.lower().split()
    scores = _bm25_index.get_scores(tokenized_query)

    top_indices = np.argsort(scores)[::-1][:top_k]
    results = []
    for idx in top_indices:
        if scores[idx] > 0:
            results.append({"index": int(idx), "score": float(scores[idx])})
    return results


def hybrid_search(
    query: str,
    top_k: int = 10,
    db_session=None,
) -> List[Dict]:
    """Run hybrid search combining dense and sparse retrieval with weighted RRF.

    Improvements over basic RRF:
    1. Chunk-type weighting: skills_chunk vectors get 2x weight
    2. Weighted fusion: dense (0.6) + sparse (0.4)
    3. Per-candidate score aggregation across all their chunks
    4. Normalized final scores for better comparability

    Args:
        query: Job description or search query.
        top_k: Number of results to return.
        db_session: SQLAlchemy session for metadata lookup.

    Returns:
        Ranked list of dicts with candidate_id, scores, and metadata.
    """
    from app.db import FaissMetadata, SessionLocal

    if db_session is None:
        db_session = SessionLocal()
        own_session = True
    else:
        own_session = False

    try:
        # === Dense Search (Semantic) ===
        dense_results = _dense_search(query, top_k=top_k * 5)

        # Map vector_ids to candidates, applying chunk-type weights
        dense_candidates = defaultdict(float)
        dense_max = defaultdict(float)
        for r in dense_results:
            meta = db_session.query(FaissMetadata).filter(
                FaissMetadata.vector_id == r["vector_id"]
            ).first()
            if meta:
                chunk_weight = CHUNK_WEIGHTS.get(meta.chunk_type, 1.0)
                weighted_score = r["score"] * chunk_weight
                dense_candidates[meta.candidate_id] += weighted_score
                dense_max[meta.candidate_id] = max(
                    dense_max[meta.candidate_id], r["score"]
                )

        # === Sparse Search (Keyword) ===
        sparse_results = _sparse_search(query, top_k=top_k * 5)
        sparse_candidates = defaultdict(float)
        sparse_max = defaultdict(float)
        for r in sparse_results:
            if r["index"] < len(_bm25_corpus_ids):
                cid, chunk_type = _bm25_corpus_ids[r["index"]]
                chunk_weight = CHUNK_WEIGHTS.get(chunk_type, 1.0)
                weighted_score = r["score"] * chunk_weight
                sparse_candidates[cid] += weighted_score
                sparse_max[cid] = max(sparse_max[cid], r["score"])

        # === Weighted RRF Fusion ===
        rrf_scores = defaultdict(float)

        # Dense RRF with weight
        dense_ranked = sorted(
            dense_candidates.items(),
            key=lambda x: x[1],
            reverse=True,
        )
        for rank, (cid, _) in enumerate(dense_ranked):
            rrf_scores[cid] += DENSE_WEIGHT * (1.0 / (RRF_K + rank + 1))

        # Sparse RRF with weight
        sparse_ranked = sorted(
            sparse_candidates.items(),
            key=lambda x: x[1],
            reverse=True,
        )
        for rank, (cid, _) in enumerate(sparse_ranked):
            rrf_scores[cid] += SPARSE_WEIGHT * (1.0 / (RRF_K + rank + 1))

        # === Normalize scores to 0-1 range ===
        if rrf_scores:
            max_score = max(rrf_scores.values())
            min_score = min(rrf_scores.values())
            score_range = max_score - min_score if max_score > min_score else 1.0
        else:
            max_score = 0
            score_range = 1.0

        ranked = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)

        results = []
        for cid, score in ranked[:top_k]:
            normalized = (score - min_score) / score_range if score_range > 0 else 0
            results.append({
                "candidate_id": cid,
                "rrf_score": round(score, 6),
                "final_score": round(normalized, 4),
                "dense_score": round(dense_max.get(cid, 0), 4),
                "sparse_score": round(sparse_max.get(cid, 0), 4),
            })

        return results

    finally:
        if own_session:
            db_session.close()
