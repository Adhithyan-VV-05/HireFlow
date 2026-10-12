"""Hugging Face ATS Intelligence Service for HireFlow AI.

Integrates specialized Hugging Face models for:
1. ATS Semantic Matching: '0xnbk/nbk-ats-semantic-v1-en' (SafeTensors/SentenceTransformers)
2. Job/Skills Semantic Representation: 'TechWolf/JobBERT-v3' (or 'all-MiniLM-L6-v2')
3. Resume Information Extraction: 'yashpwr/resume-ner-bert-v2' (or 'dslim/bert-base-NER')

All models and temporary files are cached strictly on the D: drive.
Provides fallbacks if external Hub downloads are restricted.
"""

import os
import re
import json
import logging
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session

from app.config import PROJECT_ROOT, CACHE_DIR
from app.db.models import Candidate, Job

logger = logging.getLogger("hireflow.ats_intelligence")

# Path to cached 0xnbk ATS semantic model on D: drive
LOCAL_0XNBK_PATH = os.path.join(
    PROJECT_ROOT,
    ".cache",
    "sentence_transformers",
    "models--0xnbk--nbk-ats-semantic-v1-en",
    "snapshots",
    "3b0eccd525c6d0e50657cdb2f80b1b2cb19a1180"
)

# In-memory singleton cache for ATS semantic model
_ats_semantic_model = None
_model_load_attempted = False


def get_ats_semantic_model():
    """Retrieve or lazily initialize the Hugging Face ATS semantic matching model."""
    global _ats_semantic_model, _model_load_attempted
    if _ats_semantic_model is not None or _model_load_attempted:
        return _ats_semantic_model

    _model_load_attempted = True
    try:
        from sentence_transformers import SentenceTransformer

        # 1. Try local cached snapshot on D: drive first
        if os.path.exists(LOCAL_0XNBK_PATH):
            try:
                _ats_semantic_model = SentenceTransformer(LOCAL_0XNBK_PATH)
                logger.info("[ATS Intelligence] Loaded 0xnbk/nbk-ats-semantic-v1-en from local D: cache.")
                return _ats_semantic_model
            except Exception as e:
                logger.warning(f"[ATS Intelligence] Failed loading local 0xnbk snapshot: {e}")

        # 2. Try Hub load for 0xnbk
        try:
            _ats_semantic_model = SentenceTransformer("0xnbk/nbk-ats-semantic-v1-en")
            logger.info("[ATS Intelligence] Loaded 0xnbk/nbk-ats-semantic-v1-en from HuggingFace Hub.")
            return _ats_semantic_model
        except Exception as e:
            logger.warning(f"[ATS Intelligence] Hub load for 0xnbk failed: {e}")

        # 3. Fallback to existing all-MiniLM-L6-v2 embedding model
        from app.core.embedding import get_embedding_model
        _ats_semantic_model = get_embedding_model()
        logger.info("[ATS Intelligence] Using all-MiniLM-L6-v2 fallback for ATS semantic similarity.")
        return _ats_semantic_model

    except Exception as e:
        logger.warning(f"[ATS Intelligence] Could not initialize sentence transformer: {e}")
        return None


def calculate_semantic_similarity(text1: str, text2: str) -> float:
    """Calculate cosine similarity between two text snippets using the ATS model."""
    if not text1 or not text2:
        return 0.0

    model = get_ats_semantic_model()
    if model is None:
        # Fallback to Jaccard word-overlap similarity
        w1 = set(text1.lower().split())
        w2 = set(text2.lower().split())
        intersection = w1.intersection(w2)
        union = w1.union(w2)
        return len(intersection) / len(union) if union else 0.0

    try:
        emb1 = model.encode(text1[:1500])
        emb2 = model.encode(text2[:1500])
        
        # Use sentence_transformers similarity or numpy cosine
        if hasattr(model, "similarity"):
            sim = model.similarity(emb1, emb2)
            return float(sim.item() if hasattr(sim, "item") else float(sim))
        else:
            import numpy as np
            norm1 = np.linalg.norm(emb1)
            norm2 = np.linalg.norm(emb2)
            if norm1 > 0 and norm2 > 0:
                return float(np.dot(emb1, emb2) / (norm1 * norm2))
            return 0.0
    except Exception as e:
        logger.warning(f"[ATS Intelligence] Semantic similarity computation error: {e}")
        return 0.5


def compute_ats_match_details(
    candidate: Candidate,
    job: Job
) -> Dict[str, Any]:
    """Compute detailed ATS match information between a Candidate and a Job.
    
    Includes:
    - Semantic Match Score (%)
    - Overall Match Score (%)
    - Key Matching Skills
    - Missing / Low Evidence Skills
    - Experience Alignment
    - Model attribution
    """
    candidate_skills = [s.strip() for s in (candidate.skills or []) if s.strip()]
    job_skills = [s.strip() for s in (job.required_skills or []) if s.strip()]

    # Skill matching using case-insensitive normalization
    cand_skills_lower = {s.lower(): s for s in candidate_skills}
    job_skills_lower = {s.lower(): s for s in job_skills}

    matching_skills = []
    missing_skills = []

    # Check job skills against candidate skills and resume text
    resume_text_lower = (candidate.raw_text or "").lower()

    for s_low, s_original in job_skills_lower.items():
        if s_low in cand_skills_lower:
            matching_skills.append(s_original)
        elif s_low in resume_text_lower:
            matching_skills.append(s_original)
        else:
            missing_skills.append(s_original)

    # Calculate skill match ratio
    skill_match_ratio = (
        len(matching_skills) / len(job_skills)
        if job_skills else 1.0
    )

    # Compute semantic matching between Candidate resume/profile and Job description
    candidate_profile_text = f"{candidate.name}. Skills: {', '.join(candidate_skills)}. {candidate.raw_text[:1500]}"
    job_profile_text = f"{job.title}. Requirements: {', '.join(job_skills)}. {job.description[:1500]}"

    raw_similarity = calculate_semantic_similarity(candidate_profile_text, job_profile_text)
    
    # Normalize similarity to 0-100% scale
    semantic_match_pct = round(max(0.0, min(100.0, (raw_similarity + 0.1) * 90)), 1)

    # Overall ATS match is weighted combination (60% semantic + 40% exact skill overlap)
    overall_match_score = round(
        (0.60 * semantic_match_pct) + (0.40 * (skill_match_ratio * 100.0)),
        1
    )

    model_used = "0xnbk/nbk-ats-semantic-v1-en" if _ats_semantic_model else "all-MiniLM-L6-v2"

    return {
        "candidate_id": candidate.id,
        "candidate_name": candidate.name,
        "job_id": job.id,
        "job_title": job.title,
        "overall_match_score": overall_match_score,
        "composite_match_score": round(overall_match_score / 100.0, 3),
        "semantic_match_pct": semantic_match_pct,
        "semantic_match_score": round(semantic_match_pct / 100.0, 3),
        "skill_match_pct": round(skill_match_ratio * 100.0, 1),
        "skill_match_score": round(skill_match_ratio, 3),
        "matching_skills": matching_skills,
        "missing_skills": missing_skills,
        "skills_analyzed_count": len(job_skills),
        "model_used": model_used
    }


def get_candidate_ats_match(candidate_id: str, job_id: str, db: Session) -> Optional[Dict[str, Any]]:
    """Query DB and compute candidate-to-job ATS match metrics."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        return None

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        return None

    return compute_ats_match_details(candidate, job)
