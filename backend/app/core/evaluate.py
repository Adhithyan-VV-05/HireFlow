"""Evaluation metrics for search quality.

Computes P@5, Hit Rate@10, NDCG@10, and TF-IDF baseline comparison.
"""

import numpy as np
from typing import List, Dict
from collections import defaultdict


# Hardcoded test fixtures for evaluation
TEST_FIXTURES = [
    {
        "query": "Senior Python developer with Django and AWS experience for backend role",
        "relevant_candidates": ["test-candidate-001", "test-candidate-003", "test-candidate-005"],
    },
    {
        "query": "React frontend developer with TypeScript and Node.js experience",
        "relevant_candidates": ["test-candidate-002", "test-candidate-004"],
    },
    {
        "query": "Data scientist with machine learning and Python skills",
        "relevant_candidates": ["test-candidate-001", "test-candidate-005"],
    },
    {
        "query": "DevOps engineer with Docker, Kubernetes, and CI/CD pipeline experience",
        "relevant_candidates": ["test-candidate-003"],
    },
    {
        "query": "Full stack developer with Java Spring Boot and Angular",
        "relevant_candidates": ["test-candidate-002", "test-candidate-004"],
    },
]


def precision_at_k(retrieved: List[str], relevant: List[str], k: int = 5) -> float:
    """Compute Precision@K."""
    retrieved_k = retrieved[:k]
    relevant_set = set(relevant)
    hits = sum(1 for r in retrieved_k if r in relevant_set)
    return hits / k if k > 0 else 0.0


def hit_rate_at_k(retrieved: List[str], relevant: List[str], k: int = 10) -> float:
    """Compute Hit Rate@K."""
    retrieved_k = retrieved[:k]
    relevant_set = set(relevant)
    return 1.0 if any(r in relevant_set for r in retrieved_k) else 0.0


def ndcg_at_k(retrieved: List[str], relevant: List[str], k: int = 10) -> float:
    """Compute NDCG@K (Normalized Discounted Cumulative Gain)."""
    relevant_set = set(relevant)
    retrieved_k = retrieved[:k]

    dcg = 0.0
    for i, rid in enumerate(retrieved_k):
        if rid in relevant_set:
            dcg += 1.0 / np.log2(i + 2)

    ideal_k = min(len(relevant), k)
    idcg = sum(1.0 / np.log2(i + 2) for i in range(ideal_k))

    return dcg / idcg if idcg > 0 else 0.0


def _tfidf_baseline_search(query: str, db_session=None) -> List[str]:
    """Simple TF-IDF cosine similarity baseline."""
    from app.db import FaissMetadata, SessionLocal
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    if db_session is None:
        db_session = SessionLocal()
        own_session = True
    else:
        own_session = False

    try:
        records = db_session.query(FaissMetadata).all()
        if not records:
            return []

        texts = [r.chunk_text for r in records]
        cids = [r.candidate_id for r in records]

        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform(texts + [query])

        query_vec = tfidf_matrix[-1]
        doc_vecs = tfidf_matrix[:-1]

        similarities = cosine_similarity(query_vec, doc_vecs).flatten()

        candidate_scores = defaultdict(float)
        for i, sim in enumerate(similarities):
            cid = cids[i]
            candidate_scores[cid] = max(candidate_scores[cid], sim)

        ranked = sorted(candidate_scores.items(), key=lambda x: x[1], reverse=True)
        return [cid for cid, _ in ranked]

    finally:
        if own_session:
            db_session.close()


def run_evaluation(db_session=None) -> Dict:
    """Run full evaluation comparing baselines and hybrid search."""
    from app.core.search import hybrid_search

    results = {
        "tfidf_baseline": {"precision_at_5": [], "hit_rate_at_10": [], "ndcg_at_10": []},
        "hybrid_search": {"precision_at_5": [], "hit_rate_at_10": [], "ndcg_at_10": []},
        "num_test_queries": len(TEST_FIXTURES),
    }

    for fixture in TEST_FIXTURES:
        query = fixture["query"]
        relevant = fixture["relevant_candidates"]

        tfidf_results = _tfidf_baseline_search(query, db_session)
        results["tfidf_baseline"]["precision_at_5"].append(
            precision_at_k(tfidf_results, relevant, 5)
        )
        results["tfidf_baseline"]["hit_rate_at_10"].append(
            hit_rate_at_k(tfidf_results, relevant, 10)
        )
        results["tfidf_baseline"]["ndcg_at_10"].append(
            ndcg_at_k(tfidf_results, relevant, 10)
        )

        try:
            hybrid_results = hybrid_search(query, top_k=10, db_session=db_session)
            hybrid_ids = [r["candidate_id"] for r in hybrid_results]
        except Exception:
            hybrid_ids = []

        results["hybrid_search"]["precision_at_5"].append(
            precision_at_k(hybrid_ids, relevant, 5)
        )
        results["hybrid_search"]["hit_rate_at_10"].append(
            hit_rate_at_k(hybrid_ids, relevant, 10)
        )
        results["hybrid_search"]["ndcg_at_10"].append(
            ndcg_at_k(hybrid_ids, relevant, 10)
        )

    for method in ["tfidf_baseline", "hybrid_search"]:
        for metric in ["precision_at_5", "hit_rate_at_10", "ndcg_at_10"]:
            values = results[method][metric]
            avg = sum(values) / len(values) if values else 0.0
            results[method][f"avg_{metric}"] = round(avg, 4)

    return results
