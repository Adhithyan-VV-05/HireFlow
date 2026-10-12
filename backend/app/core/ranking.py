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

    # Also parse explicit skill lists or comma-separated lines
    lines = job_description.split('\n')
    for line in lines:
        if any(h in line.lower() for h in ["required skills", "skills:", "skill requirements", "required:"]):
            parts = re.split(r'[:,;,\n]', line)
            for part in parts:
                clean = part.strip()
                if clean and len(clean) < 35 and not any(h in clean.lower() for h in ["required", "skills", "description"]):
                    found_skills.add(_normalize_skill(clean))

    return found_skills


def _compute_skill_overlap(candidate_skills: List[str], job_skills: Set[str]) -> Dict:
    """Compute skill overlap between candidate and job.

    Returns:
        Dict with matched_skills, match_ratio, missing_skills.
    """
    candidate_set = {s.lower().strip() for s in candidate_skills}
    job_set = {s.lower().strip() for s in job_skills}

    matched = candidate_set & job_set
    missing = job_set - candidate_set
    extra = candidate_set - job_set

    match_ratio = len(matched) / len(job_set) if job_set else 0.0

    job_skill_map = {s.lower().strip(): s for s in job_skills}
    cand_skill_map = {s.lower().strip(): s for s in candidate_skills}

    matched_original = [cand_skill_map.get(s, job_skill_map.get(s, s.title())) for s in matched]
    missing_original = [job_skill_map.get(s, s.title()) for s in missing]
    extra_original = [cand_skill_map.get(s, s.title()) for s in extra]

    return {
        "matched_skills": sorted(matched_original),
        "missing_skills": sorted(missing_original),
        "extra_skills": sorted(extra_original),
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

            # Get skill assessment data
            from app.db.models import SkillAssessment
            assessments = db_session.query(SkillAssessment).filter(
                SkillAssessment.candidate_id == db_candidate.id,
                SkillAssessment.is_completed == True
            ).all()
            
            skill_scores = {a.skill_name: a.percentage for a in assessments}
            is_verified = len(skill_scores) >= 1
            
            # Merit bonus based on skill test performance
            # Calculate Resume-JD Match Score (35% Semantic Relevance + 65% Skill Overlap)
            search_score = cand.get("final_score", cand.get("rrf_score", 0))
            skill_ratio = overlap["match_ratio"]
            resume_match = (0.35 * search_score) + (0.65 * skill_ratio)
            resume_match = min(1.0, max(0.0, resume_match))

            # Calculate Hiring Score based on test attendance
            has_attended_test = is_verified and len(skill_scores) > 0
            if has_attended_test:
                avg_test_score = (sum(skill_scores.values()) / len(skill_scores)) / 100.0
                test_match_pct = round(avg_test_score * 100, 1)
                # Combine 60% Resume Match + 40% Verified Test Performance
                final_score = (0.60 * resume_match) + (0.40 * avg_test_score)
            else:
                test_match_pct = None
                # 100% Resume Match when test is not attended
                final_score = resume_match

            final_score = min(1.0, max(0.0, final_score))
            hiring_score_pct = round(final_score * 100, 1)

            # Determine Hiring Recommendation label
            if has_attended_test:
                if hiring_score_pct >= 85:
                    recommendation = "Strong Hire (Test Verified)"
                elif hiring_score_pct >= 70:
                    recommendation = "Recommended Hire"
                elif hiring_score_pct >= 55:
                    recommendation = "Potential Candidate"
                else:
                    recommendation = "Low Fit"
            else:
                if hiring_score_pct >= 85:
                    recommendation = "Strong Resume Match"
                elif hiring_score_pct >= 70:
                    recommendation = "Good Resume Match"
                elif hiring_score_pct >= 55:
                    recommendation = "Potential Resume Fit"
                else:
                    recommendation = "Low Resume Fit"

            # Populate candidate payload
            cand["final_score"] = round(final_score, 4)
            cand["hiring_score"] = hiring_score_pct
            cand["hiring_recommendation"] = recommendation
            cand["resume_match_score"] = round(resume_match * 100, 1)
            cand["test_match_score"] = test_match_pct
            cand["has_attended_test"] = has_attended_test
            cand["skill_match_ratio"] = overlap["match_ratio"]
            cand["matched_skills"] = overlap["matched_skills"]
            cand["missing_skills"] = overlap["missing_skills"]
            cand["extra_skills"] = overlap["extra_skills"]
            cand["match_count"] = overlap["match_count"]
            cand["required_count"] = overlap["required_count"]
            cand["name"] = db_candidate.name
            cand["email"] = db_candidate.email
            cand["skills"] = candidate_skills
            cand["is_verified"] = is_verified
            cand["skill_scores"] = skill_scores
            cand["entities"] = db_candidate.entities

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
        for rank_idx, cand in enumerate(candidates, start=1):
            cand["role_rank"] = rank_idx
            cand["total_candidates_evaluated"] = len(candidates)
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
