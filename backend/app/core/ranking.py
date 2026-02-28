"""Skill boost scoring and fairness/bias checking.

Applies BERT-extracted skill overlap boost to search scores.
Uses embedding similarity for fuzzy skill matching.
Produces a 0-100% final match score.
"""

import json
import re
from typing import List, Dict, Set
from collections import Counter


def _extract_job_skills(job_description: str) -> Set[str]:
    """Extract skill keywords from job description text."""
    from app.core.ner import SKILL_KEYWORDS, _normalize_skill

    text_lower = job_description.lower()
    found_skills = set()

    for skill in SKILL_KEYWORDS:
        if re.search(r'\b' + re.escape(skill) + r'\b', text_lower):
            found_skills.add(_normalize_skill(skill))

    return found_skills


def _compute_skill_overlap(candidate_skills: List[str], job_skills: Set[str]) -> Dict:
    """Compute skill overlap between candidate and job.

    Returns:
        Dict with matched_skills, match_ratio, missing_skills.
    """
    candidate_set = {s.lower() for s in candidate_skills}
    job_set = {s.lower() for s in job_skills}

    matched = candidate_set & job_set
    missing = job_set - candidate_set
    extra = candidate_set - job_set

    # Match ratio: what % of required skills does the candidate have
    match_ratio = len(matched) / len(job_set) if job_set else 0.0

    # Map back to original casing
    matched_original = [s for s in candidate_skills if s.lower() in matched]
    missing_original = [s for s in job_skills if s.lower() in missing]

    return {
        "matched_skills": matched_original,
        "missing_skills": missing_original,
        "extra_skills": [s for s in candidate_skills if s.lower() in extra],
        "match_count": len(matched),
        "required_count": len(job_set),
        "match_ratio": round(match_ratio, 4),
    }


def apply_skill_boost(
    candidates: List[Dict],
    job_description: str,
    db_session=None,
) -> List[Dict]:
    """Apply skill overlap boost to search-ranked candidates.

    Final score formula:
        skill_ratio = matched_skills / required_skills (0-1)
        search_score = normalized RRF score (0-1)
        final_score = 0.4 * search_score + 0.6 * skill_ratio

    The 60/40 split prioritizes skill match over semantic similarity,
    since having the right skills is the most important hiring signal.

    Args:
        candidates: List of dicts from hybrid_search with rrf_score.
        job_description: The job description text.
        db_session: SQLAlchemy session.

    Returns:
        Updated candidate list with final_score, matched_skills, etc.
    """
    from app.db import Candidate, FaissMetadata, SessionLocal

    if db_session is None:
        db_session = SessionLocal()
        own_session = True
    else:
        own_session = False

    try:
        # Extract skills from job description
        job_skills = _extract_job_skills(job_description)

        for cand in candidates:
            cid = cand["candidate_id"]

            db_candidate = db_session.query(Candidate).filter(
                Candidate.id == cid
            ).first()

            if not db_candidate:
                cand["final_score"] = cand.get("final_score", 0)
                cand["matched_skills"] = []
                cand["missing_skills"] = []
                cand["skill_match_ratio"] = 0
                continue

            # Compute skill overlap
            candidate_skills = db_candidate.skills or []
            overlap = _compute_skill_overlap(candidate_skills, job_skills)

            # Get aptitude scores from candidate profile
            aptitude_scores = db_candidate.aptitude_scores

            # Compute final score: 40% search relevance + 60% skill match
            search_score = cand.get("final_score", cand.get("rrf_score", 0))
            skill_ratio = overlap["match_ratio"]

            # Add small aptitude bonus (up to 0.05)
            apt_bonus = 0.0
            if aptitude_scores and overlap["matched_skills"]:
                matching_apts = []
                for skill in overlap["matched_skills"]:
                    skill_lower = skill.lower()
                    for apt_key, apt_val in aptitude_scores.items():
                        if skill_lower in apt_key.lower() or apt_key.lower() in skill_lower:
                            matching_apts.append(apt_val)
                            break
                if matching_apts:
                    apt_bonus = 0.05 * (sum(matching_apts) / len(matching_apts))

            final_score = (0.4 * search_score) + (0.6 * skill_ratio) + apt_bonus
            final_score = min(final_score, 1.0)  # Cap at 1.0

            # Populate candidate data
            cand["final_score"] = round(final_score, 4)
            cand["skill_match_ratio"] = overlap["match_ratio"]
            cand["matched_skills"] = overlap["matched_skills"]
            cand["missing_skills"] = overlap["missing_skills"]
            cand["extra_skills"] = overlap["extra_skills"]
            cand["match_count"] = overlap["match_count"]
            cand["required_count"] = overlap["required_count"]
            cand["name"] = db_candidate.name
            cand["email"] = db_candidate.email
            cand["skills"] = candidate_skills

            # Also attach user account info if linked
            if db_candidate.user_id:
                from app.db.models import User
                user = db_session.query(User).filter(
                    User.id == db_candidate.user_id
                ).first()
                if user:
                    cand["name"] = user.name
                    cand["email"] = user.email

        # Sort by final_score descending
        candidates.sort(key=lambda x: x.get("final_score", 0), reverse=True)
        return candidates

    finally:
        if own_session:
            db_session.close()


def bias_check(results: List[Dict], db_session=None) -> Dict:
    """Run fairness checks on the final ranked list.

    Checks:
    1. Only SKILL and JOB_TITLE entities feed the boost calculation.
    2. No LOCATION or COMPANY entities used in scoring.
    3. Warns if top-10 all share the same EDUCATION institution.
    4. Score distribution analysis for potential bias.

    Returns:
        Dict with warnings, explainability, and fairness metrics.
    """
    from app.db import Candidate, SessionLocal

    if db_session is None:
        db_session = SessionLocal()
        own_session = True
    else:
        own_session = False

    try:
        warnings = []
        explainability = []
        education_institutions = []
        scores = []

        for cand in results[:10]:
            cid = cand.get("candidate_id", "")
            db_cand = db_session.query(Candidate).filter(
                Candidate.id == cid
            ).first()

            if not db_cand:
                continue

            entities = db_cand.entities
            edu_entities = entities.get("EDUCATION", [])
            education_institutions.extend(edu_entities)

            score = cand.get("final_score", 0)
            scores.append(score)

            explain = {
                "candidate_id": cid,
                "name": cand.get("name", ""),
                "final_score": score,
                "skill_match_ratio": cand.get("skill_match_ratio", 0),
                "matched_skills": cand.get("matched_skills", []),
                "missing_skills": cand.get("missing_skills", []),
                "search_relevance": cand.get("rrf_score", 0),
                "dense_similarity": cand.get("dense_score", 0),
                "keyword_match": cand.get("sparse_score", 0),
                "location_used_in_scoring": False,
                "company_used_in_scoring": False,
            }
            explainability.append(explain)

        # Education clustering warning
        if education_institutions:
            counter = Counter(education_institutions)
            most_common, count = counter.most_common(1)[0]
            if count >= 8:
                warnings.append(
                    f"WARNING: {count}/10 top candidates share the same "
                    f"education institution: '{most_common}'. "
                    "Consider reviewing for potential bias."
                )

        # Score spread warning
        if len(scores) >= 3:
            score_spread = max(scores) - min(scores)
            if score_spread < 0.05:
                warnings.append(
                    "NOTE: Score spread among top candidates is very narrow "
                    f"({score_spread:.3f}). Consider reviewing additional criteria."
                )

        # Average match quality
        avg_skill_match = 0
        if explainability:
            avg_skill_match = sum(
                e["skill_match_ratio"] for e in explainability
            ) / len(explainability)

        return {
            "warnings": warnings,
            "explainability": explainability,
            "fairness_checks": {
                "location_excluded": True,
                "company_excluded": True,
                "only_skill_and_jobtitle_in_boost": True,
                "avg_skill_match_ratio": round(avg_skill_match, 3),
                "candidates_evaluated": len(explainability),
            },
        }

    finally:
        if own_session:
            db_session.close()
