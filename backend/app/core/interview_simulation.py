"""AI Interview Simulation Engine for HireFlow AI.

Manages the end-to-end interactive interview simulation lifecycle:
question delivery, real candidate answer submission, multi-dimensional AI answer
evaluation, duplicate submission prevention, persistence across page refreshes,
live HR monitoring, and automatic ATS status synchronization upon completion.
"""

import json
import uuid
import re
import asyncio
from datetime import datetime
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session

from app.db.models import (
    Candidate,
    Job,
    User,
    InterviewSession,
    InterviewResponse,
    JobApplication
)
from app.core.llm_utils import call_llm
from app.core.question_generator import generate_interview_questions
from app.services.ats import get_ats_provider

# Real-time event broadcasting queues for live HR monitoring
_session_event_queues: Dict[str, List[asyncio.Queue]] = {}


def register_session_listener(session_id: str) -> asyncio.Queue:
    """Register an asynchronous queue to receive live interview progress events."""
    q = asyncio.Queue()
    if session_id not in _session_event_queues:
        _session_event_queues[session_id] = []
    _session_event_queues[session_id].append(q)
    return q


def unregister_session_listener(session_id: str, q: asyncio.Queue):
    """Unregister an event queue."""
    if session_id in _session_event_queues:
        if q in _session_event_queues[session_id]:
            _session_event_queues[session_id].remove(q)
        if not _session_event_queues[session_id]:
            del _session_event_queues[session_id]


def broadcast_session_event(session_id: str, data: Dict[str, Any]):
    """Broadcast an update event to all active listeners for this session."""
    if session_id in _session_event_queues:
        for q in _session_event_queues[session_id]:
            try:
                q.put_nowait(data)
            except Exception:
                pass


def start_simulation(
    candidate_id: str,
    job_id: str,
    interview_type: str = "mixed",
    num_questions: int = 5,
    technical_count: Optional[int] = None,
    behavioral_count: Optional[int] = None,
    situational_count: Optional[int] = None,
    hr_count: Optional[int] = None,
    resume_based_count: Optional[int] = None,
    category_weights: Optional[Dict[str, float]] = None,
    interviewer_id: Optional[str] = None,
    initial_status: str = "in_progress",
    recruiter_conditions: Optional[str] = None,
    db: Session = None
) -> Dict[str, Any]:
    """Initialize an AI interview simulation session and pre-generate the complete question set."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise ValueError(f"Candidate {candidate_id} not found")

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise ValueError(f"Job {job_id} not found")

    # Generate tailored interview questions using full Job and Candidate context
    generated = generate_interview_questions(
        job_title=job.title,
        job_description=job.description,
        required_skills=job.required_skills,
        candidate_skills=candidate.skills,
        candidate_resume_text=candidate.raw_text,
        candidate_name=candidate.name,
        interview_type=interview_type,
        num_questions=num_questions,
        technical_count=technical_count,
        behavioral_count=behavioral_count,
        situational_count=situational_count,
        hr_count=hr_count,
        resume_based_count=resume_based_count,
        category_weights=category_weights,
        recruiter_conditions=recruiter_conditions
    )
    questions = generated.get("questions", [])

    session_id = str(uuid.uuid4())
    session_status = "scheduled" if initial_status == "scheduled" else "in_progress"
    ats_target_status = "Interview Scheduled" if session_status == "scheduled" else "Interview In Progress"

    # Default category weights if not explicitly passed
    weights = category_weights or {
        "technical": 0.50,
        "behavioral": 0.20,
        "situational": 0.20,
        "hr": 0.10
    }

    session = InterviewSession(
        id=session_id,
        candidate_id=candidate_id,
        job_id=job_id,
        interviewer_id=interviewer_id,
        interview_type=interview_type,
        status=session_status,
        question_count=len(questions),
        current_question_index=0,
        overall_score=0.0,
        technical_score=0.0,
        behavioral_score=0.0,
        questions_json=json.dumps(questions),
        summary_report_json=json.dumps({"category_weights": weights}),
        started_at=datetime.utcnow() if session_status == "in_progress" else None,
        created_at=datetime.utcnow()
    )
    db.add(session)

    # Synchronize ATS stage
    try:
        ats = get_ats_provider()
        ats.update_candidate_status(
            candidate_id=candidate_id,
            new_status=ats_target_status,
            changed_by="AI Interviewer",
            notes=f"Interview {session_status} for '{job.title}' ({len(questions)} questions configured)",
            job_id=job_id,
            db=db
        )
    except Exception as e:
        print(f"[InterviewSimulation] ATS status sync warning: {e}")

    db.commit()

    first_q = questions[0] if questions else None
    return {
        "session_id": session_id,
        "candidate_id": candidate_id,
        "candidate_name": candidate.name,
        "job_id": job_id,
        "job_title": job.title,
        "interview_type": interview_type,
        "status": session_status,
        "question_count": len(questions),
        "current_question_index": 0,
        "category_weights": weights,
        "first_question": {
            "index": 0,
            "number": 1,
            "question": first_q.get("question") if first_q else "Ready to begin?",
            "options": first_q.get("options", {}) if first_q else {},
            "type": first_q.get("type", "technical") if first_q else "technical",
            "difficulty": first_q.get("difficulty", "intermediate") if first_q else "intermediate",
            "skill": first_q.get("skill", "") if first_q else "",
            "skills": first_q.get("skills", []) if first_q else [],
            "expected_topics": first_q.get("expected_topics", []) if first_q else [],
            "maximum_score": first_q.get("maximum_score", 10) if first_q else 10
        }
    }


def launch_simulation(session_id: str, user: Optional[User] = None, db: Session = None) -> Dict[str, Any]:
    """Launch/start a scheduled interview simulation when the candidate enters."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise ValueError(f"Session {session_id} not found")

    if session.status == "scheduled":
        session.status = "in_progress"
        session.started_at = datetime.utcnow()
        
        try:
            ats = get_ats_provider()
            ats.update_candidate_status(
                candidate_id=session.candidate_id,
                new_status="Interview In Progress",
                changed_by="Candidate Portal",
                notes="Candidate entered simulation room and commenced interview",
                job_id=session.job_id,
                db=db
            )
        except Exception as e:
            print(f"[InterviewSimulation] ATS sync warning on launch: {e}")
            
        db.commit()

        # Broadcast live status update to HR
        live_update = get_live_simulation_status(session_id, db)
        broadcast_session_event(session_id, live_update)

    return get_current_question(session_id, user=user, db=db)


def get_current_question(
    session_id: str,
    user: Optional[User] = None,
    db: Session = None
) -> Dict[str, Any]:
    """Retrieve the current pending question for an interview session."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise ValueError(f"Interview session {session_id} not found")

    # Authorization check: candidates can only access their own session
    if user and user.role == "candidate":
        cand = db.query(Candidate).filter(Candidate.user_id == user.id).first()
        if not cand or cand.id != session.candidate_id:
            raise PermissionError("Access denied: You are not authorized to view this interview session.")

    if session.status == "completed":
        return {
            "session_id": session_id,
            "status": "completed",
            "message": "This interview has already been completed.",
            "overall_score": session.overall_score,
            "summary_report": session.summary_report
        }

    questions = session.questions
    idx = session.current_question_index

    if idx >= len(questions):
        return complete_simulation(session_id, db=db)

    q = questions[idx]
    job = session.job
    candidate = session.candidate

    return {
        "session_id": session_id,
        "status": session.status,
        "candidate_id": session.candidate_id,
        "candidate_name": candidate.name if candidate else "Candidate",
        "job_id": session.job_id,
        "job_title": job.title if job else "General Role",
        "current_question_index": idx,
        "question_number": idx + 1,
        "total_questions": session.question_count,
        "question": {
            "index": idx,
            "number": idx + 1,
            "question": q.get("question"),
            "options": q.get("options", {}),
            "type": q.get("type", "technical"),
            "difficulty": q.get("difficulty", "intermediate"),
            "skill": q.get("skill", ""),
            "skills": q.get("skills", [q.get("skill", "")]),
            "expected_topics": q.get("expected_topics", q.get("expected_focus", [])),
            "maximum_score": q.get("maximum_score", 10)
        }
    }


def submit_candidate_answer(
    session_id: str,
    question_index: int,
    answer_text: str,
    user: Optional[User] = None,
    db: Session = None
) -> Dict[str, Any]:
    """Process candidate answer submission, evaluate via AI, advance session, and notify HR."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise ValueError(f"Interview session {session_id} not found")

    if session.status != "in_progress":
        return {
            "status": session.status,
            "message": "This interview session is no longer active.",
            "summary_report": session.summary_report
        }

    # Verify candidate authorization
    if user and user.role == "candidate":
        cand = db.query(Candidate).filter(Candidate.user_id == user.id).first()
        if not cand or cand.id != session.candidate_id:
            raise PermissionError("Unauthorized submission.")

    # Guard against duplicate or out-of-order submissions
    if question_index != session.current_question_index:
        raise ValueError(
            f"Invalid question index {question_index}. Expected current question index: {session.current_question_index}"
        )

    clean_answer = answer_text.strip()
    if not clean_answer:
        raise ValueError("Please select or provide an answer before submitting.")

    questions = session.questions
    if question_index >= len(questions):
        raise ValueError("Question index exceeds total question count.")

    current_q = questions[question_index]
    options = current_q.get("options", {})
    correct_opt = str(current_q.get("correct_option", "B")).strip().upper()
    explanation = current_q.get("explanation", "")

    # Extract chosen option letter ('A', 'B', 'C', 'D')
    chosen_letter = None
    clean_upper = clean_answer.upper()

    if clean_upper in ["A", "B", "C", "D"]:
        chosen_letter = clean_upper
    elif clean_upper.startswith(("OPTION A", "OPTION B", "OPTION C", "OPTION D")):
        parts = clean_upper.split()
        if len(parts) > 1 and parts[1] in ["A", "B", "C", "D"]:
            chosen_letter = parts[1]
    elif len(clean_upper) >= 2 and clean_upper[0] in ["A", "B", "C", "D"] and clean_upper[1] in [")", ".", ":", "-", " "]:
        chosen_letter = clean_upper[0]
    else:
        # Match option text if candidate or test passed full text
        for opt_key, opt_text in options.items():
            if clean_answer.lower() == opt_text.lower() or opt_text.lower() in clean_answer.lower():
                chosen_letter = opt_key.upper()
                break

    # Determine evaluation:
    if chosen_letter:
        is_correct = (chosen_letter == correct_opt)
        score_val = 10.0 if is_correct else 0.0
        chosen_text = options.get(chosen_letter, "")
        correct_text = options.get(correct_opt, "")

        if is_correct:
            feedback = f"✓ Correct! Option {chosen_letter} is the right answer. {explanation}"
            strengths = [
                f"Selected the correct option ({chosen_letter})",
                f"Accurately identified core solution for {current_q.get('skill', 'the requirement')}"
            ]
            improvements = []
        else:
            feedback = f"✗ Incorrect. You selected Option {chosen_letter}, but the correct answer is Option {correct_opt}. {explanation}"
            strengths = []
            improvements = [
                f"Review {current_q.get('skill', 'core concept')} principles.",
                f"Correct approach: Option {correct_opt} ({correct_text})."
            ]

        evaluation = {
            "score": score_val,
            "is_correct": is_correct,
            "selected_option": chosen_letter,
            "selected_text": chosen_text,
            "correct_option": correct_opt,
            "correct_text": correct_text,
            "feedback": feedback,
            "explanation": explanation,
            "strengths": strengths,
            "improvements": improvements
        }
        answer_to_save = f"Option {chosen_letter}: {chosen_text}" if chosen_text else f"Option {chosen_letter}"
    else:
        # Legacy free-text answer fallback (e.g. from test suite)
        evaluation = evaluate_answer_with_llm(
            question=current_q.get("question", ""),
            question_type=current_q.get("type", "technical"),
            skill=current_q.get("skill", ""),
            expected_focus=current_q.get("expected_topics", current_q.get("expected_focus", [])),
            candidate_answer=clean_answer,
            job_title=session.job.title if session.job else "Software Engineer"
        )
        score_val = float(evaluation.get("score", 7.0))
        answer_to_save = clean_answer

    # Save response record
    response_record = InterviewResponse(
        id=str(uuid.uuid4()),
        session_id=session_id,
        question_index=question_index,
        question=current_q.get("question", ""),
        question_type=current_q.get("type", "technical"),
        difficulty=current_q.get("difficulty", "intermediate"),
        skill=current_q.get("skill", ""),
        expected_focus_json=json.dumps(current_q.get("expected_topics", current_q.get("expected_focus", []))),
        candidate_answer=answer_to_save,
        score=score_val,
        evaluation_json=json.dumps(evaluation),
        submitted_at=datetime.utcnow()
    )
    db.add(response_record)

    # Advance current question index
    session.current_question_index += 1

    # Check if this was the last question
    if session.current_question_index >= session.question_count:
        db.commit()
        res = complete_simulation(session_id, db=db)
        # Broadcast completion to HR
        live_update = get_live_simulation_status(session_id, db)
        broadcast_session_event(session_id, live_update)
        return res

    db.commit()

    # Next question info
    next_idx = session.current_question_index
    next_q = questions[next_idx]

    # Broadcast live status update to HR
    live_update = get_live_simulation_status(session_id, db)
    broadcast_session_event(session_id, live_update)

    return {
        "status": "in_progress",
        "current_question_index": next_idx,
        "question_number": next_idx + 1,
        "total_questions": session.question_count,
        "evaluation_preview": {
            "score": score_val,
            "feedback": evaluation.get("feedback"),
            "strengths": evaluation.get("strengths", []),
            "improvements": evaluation.get("improvements", []),
            "is_correct": evaluation.get("is_correct"),
            "correct_option": evaluation.get("correct_option"),
            "selected_option": evaluation.get("selected_option")
        },
        "next_question": {
            "index": next_idx,
            "number": next_idx + 1,
            "question": next_q.get("question"),
            "options": next_q.get("options", {}),
            "type": next_q.get("type", "technical"),
            "difficulty": next_q.get("difficulty", "intermediate"),
            "skill": next_q.get("skill", "")
        }
    }


def evaluate_answer_with_llm(
    question: str,
    question_type: str,
    skill: str,
    expected_focus: List[str],
    candidate_answer: str,
    job_title: str
) -> Dict[str, Any]:
    """Evaluate candidate answer across technical accuracy, clarity, depth, and relevance."""
    focus_str = ", ".join(expected_focus) if expected_focus else "core domain principles"

    system_prompt = (
        "You are an expert technical interviewer evaluating a candidate's answer for the role of "
        f"{job_title}. Be fair, rigorous, constructive, and objective.\n\n"
        f"Question Asked: {question}\n"
        f"Category: {question_type} | Skill Area: {skill}\n"
        f"Expected Key Focus Points: {focus_str}\n\n"
        "Evaluate the candidate's answer on a 1 to 10 scale (where 10 is outstanding, 7 is solid professional competency, and 4 or below shows noticeable gaps).\n"
        "Output MUST be strictly valid JSON matching this exact structure with no surrounding markdown or explanation:\n"
        "{\n"
        '  "score": 8.0,\n'
        '  "technical_accuracy": 8,\n'
        '  "clarity": 8,\n'
        '  "depth": 7,\n'
        '  "relevance": 9,\n'
        '  "feedback": "Constructive, professional feedback analyzing what was good and what could be improved.",\n'
        '  "strengths": ["Demonstrates sound grasp of ...", "Clear explanation of ..."],\n'
        '  "improvements": ["Could discuss ... in greater detail", "Consider mentioning ..."]\n'
        "}"
    )

    messages = [
        {"role": "user", "content": f"Candidate Answer:\n{candidate_answer}"}
    ]

    try:
        response_text = call_llm(system_prompt, messages)
        eval_clean = response_text.strip()
        if eval_clean.startswith("```json"):
            eval_clean = eval_clean[7:]
        elif eval_clean.startswith("```"):
            eval_clean = eval_clean[3:]
        if eval_clean.endswith("```"):
            eval_clean = eval_clean[:-3]
        eval_clean = eval_clean.strip()

        parsed = json.loads(eval_clean)
        if isinstance(parsed, dict) and "score" in parsed:
            score = float(parsed["score"])
            return {
                "score": round(max(1.0, min(10.0, score)), 1),
                "technical_accuracy": int(parsed.get("technical_accuracy", 7)),
                "clarity": int(parsed.get("clarity", 7)),
                "depth": int(parsed.get("depth", 7)),
                "relevance": int(parsed.get("relevance", 8)),
                "feedback": parsed.get("feedback", "Good discussion of core principles."),
                "strengths": parsed.get("strengths", ["Answer addressed the key prompt."]),
                "improvements": parsed.get("improvements", ["Provide deeper implementation trade-offs."])
            }
    except Exception as e:
        print(f"[InterviewSimulation] LLM evaluation fallback invoked: {e}")

    # Fallback deterministic evaluation
    return _fallback_evaluate_answer(question, candidate_answer, expected_focus)


def _fallback_evaluate_answer(
    question: str,
    candidate_answer: str,
    expected_focus: List[str]
) -> Dict[str, Any]:
    """Rule-based deterministic evaluation fallback when LLM is unavailable."""
    words = candidate_answer.split()
    word_count = len(words)
    answer_lower = candidate_answer.lower()

    # Check how many expected focus topics are mentioned
    matched_focus = [f for f in expected_focus if f.lower() in answer_lower]
    focus_ratio = len(matched_focus) / len(expected_focus) if expected_focus else 0.5

    # Base score determined by length and focus match
    if word_count < 15:
        score = 4.5
        depth = 3
        clarity = 5
        feedback = "Answer is very brief. Elaborate with concrete architectural examples and practical context."
        strengths = ["Recognized the problem."]
        improvements = ["Elaborate on specific technical mechanisms.", "Add detail on production failure modes."]
    elif word_count < 45:
        score = 6.5 + (1.5 * focus_ratio)
        depth = 6
        clarity = 7
        feedback = "Solid high-level overview. Expanding on production trade-offs would demonstrate deeper mastery."
        strengths = ["Clear and concise response."] + ([f"Referenced {matched_focus[0]}"] if matched_focus else [])
        improvements = ["Discuss quantitative metrics or real-world implementation nuances."]
    else:
        score = 7.5 + (2.0 * focus_ratio)
        depth = 8
        clarity = 8
        feedback = "Comprehensive and structured response demonstrating strong domain competence and practical awareness."
        strengths = ["Detailed, articulate explanation.", "Addressed key operational considerations."]
        improvements = ["Mention specific edge cases or telemetry monitoring."]

    return {
        "score": round(max(1.0, min(10.0, score)), 1),
        "technical_accuracy": min(10, int(score)),
        "clarity": clarity,
        "depth": depth,
        "relevance": min(10, int(score + 1)),
        "feedback": feedback,
        "strengths": strengths,
        "improvements": improvements
    }


def complete_simulation(session_id: str, db: Session = None) -> Dict[str, Any]:
    """Finalize an interview simulation session, calculate category-weighted scores, and update ATS."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise ValueError(f"Interview session {session_id} not found")

    responses = db.query(InterviewResponse).filter(
        InterviewResponse.session_id == session_id
    ).order_by(InterviewResponse.question_index.asc()).all()

    if not responses:
        session.status = "completed"
        session.completed_at = datetime.utcnow()
        db.commit()
        return {"session_id": session_id, "status": "completed", "overall_score": 0.0}

    # Calculate category scores
    all_scores = [r.score for r in responses]
    tech_scores = [r.score for r in responses if r.question_type == "technical"]
    behav_scores = [r.score for r in responses if r.question_type == "behavioral"]
    sit_scores = [r.score for r in responses if r.question_type == "situational"]
    hr_scores = [r.score for r in responses if r.question_type == "hr"]

    avg_all = sum(all_scores) / len(all_scores) if all_scores else 0.0
    avg_tech = sum(tech_scores) / len(tech_scores) if tech_scores else avg_all
    avg_behav = sum(behav_scores) / len(behav_scores) if behav_scores else avg_all
    avg_sit = sum(sit_scores) / len(sit_scores) if sit_scores else avg_all
    avg_hr = sum(hr_scores) / len(hr_scores) if hr_scores else avg_all

    # Convert 1-10 scale to 0-100 scale
    tech_pct = round(avg_tech * 10, 1)
    behav_pct = round(avg_behav * 10, 1)
    sit_pct = round(avg_sit * 10, 1)
    hr_pct = round(avg_hr * 10, 1)
    unweighted_pct = round(avg_all * 10, 1)

    # Read category weights if configured
    stored_summary = session.summary_report or {}
    weights = stored_summary.get("category_weights", {
        "technical": 0.50,
        "behavioral": 0.20,
        "situational": 0.20,
        "hr": 0.10
    })

    # Apply category weights if relevant categories exist
    if tech_scores or behav_scores or sit_scores or hr_scores:
        w_total = 0.0
        weighted_sum = 0.0
        if tech_scores:
            w_tech = weights.get("technical", 0.50)
            weighted_sum += tech_pct * w_tech
            w_total += w_tech
        if behav_scores:
            w_behav = weights.get("behavioral", 0.20)
            weighted_sum += behav_pct * w_behav
            w_total += w_behav
        if sit_scores:
            w_sit = weights.get("situational", 0.20)
            weighted_sum += sit_pct * w_sit
            w_total += w_sit
        if hr_scores:
            w_hr = weights.get("hr", 0.10)
            weighted_sum += hr_pct * w_hr
            w_total += w_hr
        overall_pct = round(weighted_sum / w_total, 1) if w_total > 0 else unweighted_pct
    else:
        overall_pct = unweighted_pct

    # Gather collective strengths and improvements
    strengths_pool = []
    improvements_pool = []
    skills_covered = []

    for r in responses:
        eval_data = r.evaluation
        strengths_pool.extend(eval_data.get("strengths", []))
        improvements_pool.extend(eval_data.get("improvements", []))
        if r.skill and r.skill not in skills_covered:
            skills_covered.append(r.skill)

    unique_strengths = list(dict.fromkeys(strengths_pool))[:4]
    unique_improvements = list(dict.fromkeys(improvements_pool))[:4]

    recommendation = (
        "Strong Candidate: Demonstrates clear communication, sound architectural understanding, "
        "and solid problem-solving skills." if overall_pct >= 75 else
        "Promising Candidate: Demonstrates good core fundamentals with some areas for technical growth."
        if overall_pct >= 60 else
        "Requires Development: Foundational concepts were met with ambiguity; further domain study recommended."
    )

    questions_summary = []
    questions_list = session.questions or []
    for r in responses:
        matching_q = next((q for q in questions_list if q.get("number") == r.question_index + 1), {})
        eval_dict = r.evaluation or {}
        questions_summary.append({
            "question_index": r.question_index,
            "question": r.question,
            "options": matching_q.get("options", {}),
            "chosen_option": r.candidate_answer,
            "correct_option": matching_q.get("correct_option", eval_dict.get("correct_option", "")),
            "is_correct": eval_dict.get("is_correct", r.score >= 7.0),
            "score": r.score,
            "explanation": matching_q.get("explanation", eval_dict.get("explanation", ""))
        })

    report = {
        "candidate_id": session.candidate_id,
        "candidate_name": session.candidate.name if session.candidate else "Candidate",
        "job_title": session.job.title if session.job else "Target Role",
        "interview_type": session.interview_type,
        "questions_count": len(responses),
        "overall_score": overall_pct,
        "technical_score": tech_pct,
        "behavioral_score": behav_pct,
        "situational_score": sit_pct,
        "hr_score": hr_pct,
        "category_breakdown": {
            "technical": f"{tech_pct}/100",
            "behavioral": f"{behav_pct}/100",
            "situational": f"{sit_pct}/100",
            "hr": f"{hr_pct}/100"
        },
        "skills_evaluated": skills_covered,
        "strengths": unique_strengths or ["Thorough and engaged responses."],
        "areas_to_improve": unique_improvements or ["Continue broadening production monitoring experience."],
        "improvement_areas": unique_improvements or ["Continue broadening production monitoring experience."],
        "recommendation_notes": recommendation,
        "questions_summary": questions_summary,
        "completed_at": datetime.utcnow().isoformat()
    }

    session.overall_score = overall_pct
    session.technical_score = tech_pct
    session.behavioral_score = behav_pct
    session.summary_report_json = json.dumps(report)
    session.status = "completed"
    session.completed_at = datetime.utcnow()

    # Synchronize ATS stage to "Interview Completed"
    try:
        ats = get_ats_provider()
        ats.sync_interview_result(
            candidate_id=session.candidate_id,
            job_id=session.job_id,
            session_id=session.id,
            overall_score=overall_pct,
            summary=recommendation,
            db=db
        )
    except Exception as e:
        print(f"[InterviewSimulation] ATS sync warning on completion: {e}")

    db.commit()

    return {
        "session_id": session_id,
        "status": "completed",
        "overall_score": overall_pct,
        "technical_score": tech_pct,
        "behavioral_score": behav_pct,
        "summary_report": report
    }


def get_live_simulation_status(session_id: str, db: Session) -> Dict[str, Any]:
    """Retrieve real-time progress metrics for live HR monitoring."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise ValueError(f"Session {session_id} not found")

    responses = db.query(InterviewResponse).filter(
        InterviewResponse.session_id == session_id
    ).order_by(InterviewResponse.question_index.asc()).all()

    answered_count = len(responses)
    total_count = session.question_count
    remaining_count = max(0, total_count - answered_count)

    if session.status == "completed":
        current_status_text = "Interview Completed"
    elif session.status == "in_progress":
        current_status_text = f"Candidate is attending interview (answering question {session.current_question_index + 1} of {total_count})"
    else:
        current_status_text = "Interview Scheduled (awaiting candidate start)"

    recent_answers = []
    for r in responses:
        recent_answers.append({
            "question_index": r.question_index,
            "question": r.question,
            "question_type": r.question_type,
            "score": r.score,
            "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None
        })

    candidate = session.candidate
    job = session.job

    return {
        "session_id": session.id,
        "candidate_id": session.candidate_id,
        "candidate_name": candidate.name if candidate else "Candidate",
        "candidate_email": candidate.email if candidate else "",
        "job_id": session.job_id,
        "job_title": job.title if job else "General Role",
        "status": session.status,
        "interview_status": session.status,
        "progress": f"{answered_count} / {total_count}",
        "progress_percent": round((answered_count / total_count * 100), 1) if total_count > 0 else 0.0,
        "answered": answered_count,
        "answered_count": answered_count,
        "remaining": remaining_count,
        "remaining_count": remaining_count,
        "total_questions": total_count,
        "current_question_index": session.current_question_index,
        "current_status": current_status_text,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
        "overall_score": session.overall_score if session.status == "completed" else None,
        "recent_answers": recent_answers
    }


def get_simulation_report(
    session_id: str,
    user: Optional[User] = None,
    db: Session = None
) -> Dict[str, Any]:
    """Retrieve the full interview transcript, per-question evaluations, and final summary report."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise ValueError(f"Interview session {session_id} not found")

    if user and user.role == "candidate":
        cand = db.query(Candidate).filter(Candidate.user_id == user.id).first()
        if not cand or cand.id != session.candidate_id:
            raise PermissionError("Access denied.")

    responses = db.query(InterviewResponse).filter(
        InterviewResponse.session_id == session_id
    ).order_by(InterviewResponse.question_index.asc()).all()

    transcript = []
    questions_list = session.questions or []
    for r in responses:
        matching_q = next((q for q in questions_list if q.get("number") == r.question_index + 1), {})
        eval_dict = r.evaluation or {}
        transcript.append({
            "question_index": r.question_index,
            "question": r.question,
            "options": matching_q.get("options", {}),
            "correct_option": matching_q.get("correct_option", eval_dict.get("correct_option", "B")),
            "explanation": matching_q.get("explanation", eval_dict.get("explanation", "")),
            "question_type": r.question_type,
            "difficulty": r.difficulty,
            "skill": r.skill,
            "expected_focus": r.expected_focus,
            "candidate_answer": r.candidate_answer,
            "score": r.score,
            "evaluation": eval_dict,
            "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None
        })

    candidate = session.candidate
    job = session.job

    return {
        "session_id": session.id,
        "status": session.status,
        "candidate_id": session.candidate_id,
        "candidate_name": candidate.name if candidate else "Candidate",
        "candidate_email": candidate.email if candidate else "",
        "job_id": session.job_id,
        "job_title": job.title if job else "General Role",
        "interview_type": session.interview_type,
        "overall_score": session.overall_score,
        "technical_score": session.technical_score,
        "behavioral_score": session.behavioral_score,
        "question_count": session.question_count,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
        "transcript": transcript,
        "summary_report": session.summary_report
    }
