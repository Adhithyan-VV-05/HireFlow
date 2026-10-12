"""Voice Screening Engine for HireFlow AI (Milestone 4).

Orchestrates voice screening sessions:
1. Dynamic oral question generation grounded in candidate skills, missing skills, and job requirements.
2. AI voice interviewer spoken scripts (TTS-ready).
3. Candidate spoken response evaluation across 5 key dimensions:
   - Technical Knowledge (30%)
   - Response Relevance (25%)
   - Communication & Clarity (20%)
   - Completeness (15%)
   - Role-Specific Knowledge (10%)
4. Preliminary assessment generation with scoring rules and workflow recommendation:
   - 'Proceed to Next Round' (score >= 75)
   - 'Requires Further Review' (60 <= score < 75)
   - 'Do Not Proceed at This Stage' (score < 60)
"""

import json
import re
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session

from app.db.models import (
    Candidate,
    Job,
    User,
    VoiceScreeningSession,
    VoiceScreeningResponse,
    CandidateStatusHistory,
)
from app.core.llm_utils import call_llm
from app.core.question_generator import generate_interview_questions
from app.services.ats.mock_ats import MockATSProvider


# Default domain-specific voice screening questions for fallback
VOICE_QUESTION_BANK = {
    "Full Stack": [
        {
            "question": "Can you explain how you handle state management and API communication between the frontend and backend in a high-scale web application?",
            "type": "architecture",
            "skill": "Full Stack Architecture",
            "difficulty": "intermediate",
            "expected_focus": ["state management", "API caching", "error handling", "REST or GraphQL", "data flow"]
        },
        {
            "question": "Describe a scenario where a database query or backend endpoint was causing severe latency. How did you identify and optimize the bottleneck?",
            "type": "technical",
            "skill": "Performance Optimization",
            "difficulty": "intermediate",
            "expected_focus": ["profiling", "indexing", "caching", "query optimization", "connection pooling"]
        },
        {
            "question": "How do you approach writing clean, maintainable asynchronous code when handling complex user interactions or real-time web sockets?",
            "type": "technical",
            "skill": "Async Programming",
            "difficulty": "intermediate",
            "expected_focus": ["async/await", "race conditions", "event loop", "web sockets", "resilience"]
        }
    ],
    "Machine Learning": [
        {
            "question": "Walk me through how you optimize inference latency for deep learning models or large language models when deploying to production environments.",
            "type": "technical",
            "skill": "Model Optimization & Inference",
            "difficulty": "advanced",
            "expected_focus": ["quantization", "batching", "GPU memory", "caching", "model pruning", "vLLM or ONNX"]
        },
        {
            "question": "How do you detect and mitigate data drift or model degradation once a machine learning system is active in production?",
            "type": "technical",
            "skill": "MLOps & Monitoring",
            "difficulty": "intermediate",
            "expected_focus": ["drift detection", "monitoring metrics", "automated retraining", "validation checks"]
        },
        {
            "question": "Can you explain the trade-offs between fine-tuning a pre-trained model versus implementing Retrieval-Augmented Generation (RAG)?",
            "type": "architecture",
            "skill": "LLM System Architecture",
            "difficulty": "advanced",
            "expected_focus": ["domain specificity", "hallucination prevention", "vector database", "compute costs", "context window"]
        }
    ],
    "DevOps": [
        {
            "question": "How would you design a multi-region disaster recovery and continuous deployment pipeline using Kubernetes and Infrastructure as Code?",
            "type": "architecture",
            "skill": "Kubernetes & Infrastructure",
            "difficulty": "advanced",
            "expected_focus": ["Terraform", "CI/CD automation", "ingress routing", "failover", "state synchronization"]
        },
        {
            "question": "Describe an incident where a production service was crashlooping or experiencing high memory usage. What commands and telemetry did you use to triage it?",
            "type": "scenario",
            "skill": "Troubleshooting & Observability",
            "difficulty": "intermediate",
            "expected_focus": ["kubectl logs/describe", "OOMKilled", "Prometheus/Grafana", "resource limits", "root cause"]
        },
        {
            "question": "What principles and security scanning tools do you integrate into your pipeline to ensure compliance and prevent secret leakage?",
            "type": "technical",
            "skill": "DevSecOps",
            "difficulty": "intermediate",
            "expected_focus": ["vulnerability scanning", "secret management", "least privilege", "SAST/DAST", "container security"]
        }
    ],
    "General Engineering": [
        {
            "question": "Could you provide a brief overview of your background and the most impactful technical project you have delivered recently?",
            "type": "behavioral",
            "skill": "Technical Overview",
            "difficulty": "entry",
            "expected_focus": ["project architecture", "personal contribution", "measurable impact", "technologies used"]
        },
        {
            "question": "When building critical software components, how do you balance rapid delivery with code quality, testing, and technical debt?",
            "type": "scenario",
            "skill": "Engineering Practices",
            "difficulty": "intermediate",
            "expected_focus": ["automated testing", "refactoring", "trade-offs", "code reviews", "maintainability"]
        },
        {
            "question": "How do you collaborate with cross-functional teams when system requirements are ambiguous or rapidly changing?",
            "type": "behavioral",
            "skill": "Collaboration & Communication",
            "difficulty": "intermediate",
            "expected_focus": ["clarification", "prototyping", "stakeholder communication", "iterative delivery"]
        }
    ]
}


def generate_voice_screening_questions(
    candidate: Candidate,
    job: Optional[Job],
    num_questions: int = 3
) -> List[Dict[str, Any]]:
    """Generate role-grounded oral screening questions for the candidate."""
    cand_skills = candidate.skills or []
    cand_skills_lower = {s.lower().strip() for s in cand_skills}
    job_title = job.title if job else "Software Engineer"
    required_skills = (job.required_skills if job else []) or ["Core Problem Solving", "System Design"]

    # Identify missing skills (skill gaps)
    missing_skills = [s for s in required_skills if s.lower().strip() not in cand_skills_lower]
    matched_skills = [s for s in required_skills if s.lower().strip() in cand_skills_lower]

    # Attempt LLM generation
    prompt = (
        f"You are an expert AI Voice Interviewer conducting a concise oral screening for the role of '{job_title}'.\n"
        f"Candidate Name: {candidate.name}\n"
        f"Candidate Verified Skills: {', '.join(cand_skills[:8])}\n"
        f"Matched Job Skills: {', '.join(matched_skills[:5]) if matched_skills else 'General alignment'}\n"
        f"Missing Skills / Growth Areas: {', '.join(missing_skills[:5]) if missing_skills else 'None identified'}\n\n"
        f"Generate exactly {num_questions} oral screening questions.\n"
        f"The questions must sound natural and conversational when read aloud by Text-to-Speech.\n"
        f"Include at least one question testing their core strengths, and one exploring how they handle their missing skill area.\n\n"
        f"Respond ONLY with a JSON array of {num_questions} objects with these exact keys:\n"
        f"- question (string, conversational question text for TTS)\n"
        f"- type (string: 'technical', 'architecture', 'scenario', or 'behavioral')\n"
        f"- skill (string: primary skill evaluated)\n"
        f"- difficulty (string: 'entry', 'intermediate', or 'advanced')\n"
        f"- expected_focus (array of 3-5 strings: key concepts candidate should mention)\n"
        f"Do not include markdown fences or other text."
    )

    try:
        response_text = call_llm(prompt, [{"role": "user", "content": "Generate the screening questions."}])
        clean_text = response_text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        elif clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        parsed = json.loads(clean_text.strip())
        if isinstance(parsed, list) and len(parsed) >= 1:
            questions = []
            for item in parsed[:num_questions]:
                questions.append({
                    "question": item.get("question", ""),
                    "type": item.get("type", "technical"),
                    "skill": item.get("skill", required_skills[0] if required_skills else "General"),
                    "difficulty": item.get("difficulty", "intermediate"),
                    "expected_focus": item.get("expected_focus", ["clarity", "architecture", "trade-offs"]),
                })
            return questions
    except Exception as e:
        print(f"[VoiceScreening] LLM question generation fallback: {e}")

    # Fallback to domain bank
    domain_key = "General Engineering"
    title_lower = job_title.lower()
    if any(k in title_lower for k in ["full stack", "frontend", "backend", "web"]):
        domain_key = "Full Stack"
    elif any(k in title_lower for k in ["ml", "ai", "data", "machine learning", "deep learning"]):
        domain_key = "Machine Learning"
    elif any(k in title_lower for k in ["devops", "cloud", "infra", "sre", "security"]):
        domain_key = "DevOps"

    bank_questions = VOICE_QUESTION_BANK.get(domain_key, VOICE_QUESTION_BANK["General Engineering"])
    # If missing skills exist, customize the first question's skill
    selected = []
    for i, q in enumerate(bank_questions[:num_questions]):
        q_copy = dict(q)
        if i == 0 and missing_skills:
            q_copy["question"] = f"This position requires expertise in {missing_skills[0]}. Could you discuss your experience or how you quickly get up to speed with {missing_skills[0]}?"
            q_copy["skill"] = missing_skills[0]
            q_copy["expected_focus"] = [missing_skills[0], "learning methodology", "practical application", "trade-offs"]
        elif matched_skills and i == 1:
            q_copy["skill"] = matched_skills[0]
        selected.append(q_copy)

    return selected


def evaluate_voice_response(
    question: str,
    candidate_response: str,
    skill: str,
    expected_focus: List[str],
    job_title: str
) -> Dict[str, Any]:
    """Evaluate candidate spoken response across 5 dimensions."""
    clean_text = candidate_response.strip()
    words = clean_text.split()
    word_count = len(words)

    # Empty / minimal response guard
    if word_count < 5:
        return {
            "score": 25.0,
            "technical_accuracy": 25.0,
            "relevance": 25.0,
            "communication": 30.0,
            "completeness": 20.0,
            "role_knowledge": 25.0,
            "feedback": "The response was very brief and did not provide sufficient detail to assess competency.",
            "strengths": ["Spoken response received"],
            "improvements": ["Provide concrete examples, technical explanations, and elaboration on key concepts."]
        }

    focus_str = ", ".join(expected_focus) if expected_focus else "core technical principles"
    prompt = (
        f"You are a technical recruiter evaluating a candidate's spoken response in a voice screening for the role of '{job_title}'.\n"
        f"Question Asked: {question}\n"
        f"Target Skill / Topic: {skill}\n"
        f"Expected Key Concepts: {focus_str}\n\n"
        f"Candidate Spoken Response Transcript:\n\"{clean_text}\"\n\n"
        f"Evaluate the response objectively on a scale of 0 to 100 for each of the 5 dimensions:\n"
        f"1. technical_accuracy (0-100): Accuracy of technical concepts mentioned\n"
        f"2. relevance (0-100): How directly the response addresses the prompt\n"
        f"3. communication (0-100): Clarity, structure, and articulate explanation\n"
        f"4. completeness (0-100): Thoroughness of the answer\n"
        f"5. role_knowledge (0-100): Domain knowledge appropriate for {job_title}\n\n"
        f"Respond ONLY with a JSON object in this exact format:\n"
        f"{{\n"
        f'  "technical_accuracy": 82.0,\n'
        f'  "relevance": 85.0,\n'
        f'  "communication": 80.0,\n'
        f'  "completeness": 75.0,\n'
        f'  "role_knowledge": 80.0,\n'
        f'  "feedback": "Specific constructive assessment of candidate\'s spoken response...",\n'
        f'  "strengths": ["Clear explanation of ...", "Accurate reference to ..."],\n'
        f'  "improvements": ["Could mention ...", "Expand on ..."]\n'
        f"}}"
    )

    try:
        response_text = call_llm(prompt, [{"role": "user", "content": "Evaluate spoken response."}])
        clean_eval = response_text.strip()
        if clean_eval.startswith("```json"):
            clean_eval = clean_eval[7:]
        elif clean_eval.startswith("```"):
            clean_eval = clean_eval[3:]
        if clean_eval.endswith("```"):
            clean_eval = clean_eval[:-3]
        parsed = json.loads(clean_eval.strip())

        t_acc = float(parsed.get("technical_accuracy", 75.0))
        rel = float(parsed.get("relevance", 75.0))
        comm = float(parsed.get("communication", 75.0))
        comp = float(parsed.get("completeness", 70.0))
        role_k = float(parsed.get("role_knowledge", 75.0))

        # Weighted score: 30% tech, 25% rel, 20% comm, 15% comp, 10% role
        overall = round(0.30 * t_acc + 0.25 * rel + 0.20 * comm + 0.15 * comp + 0.10 * role_k, 1)

        return {
            "score": max(0.0, min(100.0, overall)),
            "technical_accuracy": max(0.0, min(100.0, t_acc)),
            "relevance": max(0.0, min(100.0, rel)),
            "communication": max(0.0, min(100.0, comm)),
            "completeness": max(0.0, min(100.0, comp)),
            "role_knowledge": max(0.0, min(100.0, role_k)),
            "feedback": parsed.get("feedback", "Candidate communicated sound understanding."),
            "strengths": parsed.get("strengths", ["Addressed the core question effectively"]),
            "improvements": parsed.get("improvements", ["Provide deeper technical examples"])
        }
    except Exception as e:
        print(f"[VoiceScreening] LLM evaluation fallback: {e}")

    # Fallback deterministic evaluation
    return _fallback_evaluate_voice_answer(question, clean_text, expected_focus)


def _fallback_evaluate_voice_answer(
    question: str,
    candidate_response: str,
    expected_focus: List[str]
) -> Dict[str, Any]:
    """Deterministic rule-based evaluation of spoken response."""
    words = candidate_response.lower().split()
    word_count = len(words)

    # Concept overlap
    overlap_count = 0
    matched_concepts = []
    missing_concepts = []
    text_lower = candidate_response.lower()

    for concept in expected_focus:
        c_clean = concept.lower().strip()
        if c_clean in text_lower:
            overlap_count += 1
            matched_concepts.append(concept)
        else:
            missing_concepts.append(concept)

    focus_len = max(len(expected_focus), 1)
    overlap_ratio = overlap_count / focus_len

    # Score components
    length_bonus = min(20.0, (word_count / 80.0) * 20.0)  # Up to 20 pts for detailed answers
    concept_score = overlap_ratio * 60.0                   # Up to 60 pts for expected concepts
    base_score = 20.0                                     # Base 20 pts for participation

    raw_total = min(100.0, base_score + concept_score + length_bonus)

    t_acc = round(min(100.0, raw_total * 0.95), 1)
    rel = round(min(100.0, 50.0 + overlap_ratio * 45.0), 1)
    comm = round(min(100.0, 55.0 + min(40.0, (word_count / 60.0) * 40.0)), 1)
    comp = round(min(100.0, 40.0 + (word_count / 70.0) * 50.0), 1)
    role_k = round(min(100.0, 50.0 + overlap_ratio * 45.0), 1)

    overall = round(0.30 * t_acc + 0.25 * rel + 0.20 * comm + 0.15 * comp + 0.10 * role_k, 1)

    strengths = []
    if matched_concepts:
        strengths.append(f"Effectively addressed core concepts: {', '.join(matched_concepts[:3])}.")
    if word_count >= 40:
        strengths.append("Provided a well-developed, structured explanation.")
    else:
        strengths.append("Direct and concise response.")

    improvements = []
    if missing_concepts:
        improvements.append(f"Consider elaborating on {missing_concepts[0]} and related design principles.")
    if word_count < 30:
        improvements.append("Elaborate further with real-world scenarios or concrete technical examples.")

    return {
        "score": overall,
        "technical_accuracy": t_acc,
        "relevance": rel,
        "communication": comm,
        "completeness": comp,
        "role_knowledge": role_k,
        "feedback": f"Candidate demonstrated {('strong' if overall >= 75 else 'moderate' if overall >= 60 else 'basic')} understanding of {question[:40]}...",
        "strengths": strengths,
        "improvements": improvements
    }


def finalize_voice_screening_assessment(
    session: VoiceScreeningSession,
    db: Session
) -> Dict[str, Any]:
    """Calculate aggregate scores, assign workflow recommendation, and update Candidate."""
    responses = db.query(VoiceScreeningResponse).filter(
        VoiceScreeningResponse.session_id == session.id
    ).order_by(VoiceScreeningResponse.question_index.asc()).all()

    if not responses:
        session.status = "completed"
        session.completed_at = datetime.utcnow()
        session.overall_score = 0.0
        session.recommendation = "Do Not Proceed at This Stage"
        db.commit()
        return {"error": "No responses submitted for this screening session."}

    # Aggregate averages across the 5 dimensions
    count = len(responses)
    tech_avg = round(sum(r.score for r in responses) / count, 1) # default
    rel_avg = 70.0
    comm_avg = 70.0
    comp_avg = 70.0
    role_avg = 70.0

    evals = []
    for r in responses:
        ev = r.evaluation or {}
        evals.append(ev)

    if evals and any("technical_accuracy" in ev for ev in evals):
        tech_avg = round(sum(ev.get("technical_accuracy", 70.0) for ev in evals) / count, 1)
        rel_avg = round(sum(ev.get("relevance", 70.0) for ev in evals) / count, 1)
        comm_avg = round(sum(ev.get("communication", 70.0) for ev in evals) / count, 1)
        comp_avg = round(sum(ev.get("completeness", 70.0) for ev in evals) / count, 1)
        role_avg = round(sum(ev.get("role_knowledge", 70.0) for ev in evals) / count, 1)

    # Weighted overall score (0-100)
    overall_score = round(
        0.30 * tech_avg +
        0.25 * rel_avg +
        0.20 * comm_avg +
        0.15 * comp_avg +
        0.10 * role_avg,
        1
    )

    # Explicit Workflow Recommendation Rules:
    # >= 75: Proceed to Next Round
    # 60 <= score < 75: Requires Further Review
    # < 60: Do Not Proceed at This Stage
    if overall_score >= 75.0:
        recommendation = "Proceed to Next Round"
        action_note = "Strong screening performance. Recommended to schedule in-depth technical interview."
    elif overall_score >= 60.0:
        recommendation = "Requires Further Review"
        action_note = "Competent performance with moderate gaps. Recruiter follow-up or portfolio review recommended."
    else:
        recommendation = "Do Not Proceed at This Stage"
        action_note = "Candidate did not meet threshold requirements on core technical dimensions."

    # Update session
    session.status = "completed"
    session.completed_at = datetime.utcnow()
    session.overall_score = overall_score
    session.technical_score = tech_avg
    session.relevance_score = rel_avg
    session.communication_score = comm_avg
    session.completeness_score = comp_avg
    session.role_knowledge_score = role_avg
    session.recommendation = recommendation

    summary_report = {
        "overall_score": overall_score,
        "recommendation": recommendation,
        "action_note": action_note,
        "dimension_breakdown": {
            "technical_knowledge": tech_avg,
            "response_relevance": rel_avg,
            "communication_clarity": comm_avg,
            "completeness": comp_avg,
            "role_knowledge": role_avg
        },
        "total_questions_answered": count,
        "completed_at": session.completed_at.isoformat(),
        "recording_storage_note": "Session transcript and dimension evaluations are permanently stored. Audio buffer processed in-session."
    }
    session.summary_report = summary_report

    # Update candidate profile single source of truth
    candidate = db.query(Candidate).filter(Candidate.id == session.candidate_id).first()
    if candidate:
        candidate.current_status = "Screened"
        candidate.screening_score = overall_score
        candidate.screening_summary = f"{recommendation} ({overall_score}%). Tech: {tech_avg}%, Comm: {comm_avg}%, Relevance: {rel_avg}%."
        candidate.screening_recommendation = recommendation

        # Record in ATS status history
        history = CandidateStatusHistory(
            id=str(uuid.uuid4()),
            candidate_id=candidate.id,
            job_id=session.job_id,
            from_status=candidate.current_status,
            to_status="Screened",
            changed_by="AI Voice Screener",
            notes=f"Voice screening completed. Score: {overall_score}%. Recommendation: {recommendation}.",
            created_at=datetime.utcnow()
        )
        db.add(history)

    db.commit()

    try:
        from app.routes.analytics import invalidate_analytics_cache
        invalidate_analytics_cache()
    except Exception:
        pass

    return {
        "session_id": session.id,
        "candidate_id": session.candidate_id,
        "candidate_name": candidate.name if candidate else "",
        "job_id": session.job_id,
        "job_title": session.job.title if session.job else "",
        "status": "completed",
        "overall_score": overall_score,
        "recommendation": recommendation,
        "dimension_breakdown": summary_report["dimension_breakdown"],
        "action_note": action_note,
        "responses": [
            {
                "question_index": r.question_index,
                "question": r.question,
                "skill": r.skill,
                "candidate_response": r.candidate_response,
                "score": r.score,
                "evaluation": r.evaluation
            }
            for r in responses
        ],
        "recording_storage_note": summary_report["recording_storage_note"],
        "completed_at": session.completed_at.isoformat()
    }
