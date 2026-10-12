"""Seed script for Milestone 4: Enrich candidate pipeline, voice screenings, and analytics."""

import os
import sys
import uuid
import json
from datetime import datetime, timedelta

# Add backend directory to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from app.db.session import SessionLocal, init_db
from app.db.models import (
    Candidate,
    Job,
    JobApplication,
    CandidateStatusHistory,
    InterviewSession,
    VoiceScreeningSession,
    VoiceScreeningResponse,
    UserFeedback,
    User
)

def seed_m4():
    print("[Seed M4] Initializing database and enriching data...")
    init_db()
    db = SessionLocal()

    try:
        now = datetime.utcnow()
        jobs = db.query(Job).all()
        if not jobs:
            print("[Seed M4] No jobs found; run seed_db.py first.")
            return

        candidates = db.query(Candidate).all()
        if not candidates:
            print("[Seed M4] No candidates found; run seed_db.py first.")
            return

        interviewer = db.query(User).filter(User.role == "interviewer").first()
        interviewer_id = interviewer.id if interviewer else None

        # Map candidates by name
        cand_map = {c.name.strip().lower(): c for c in candidates}

        # 1. Aarav Sharma -> Hired (applied 14 days ago, hired 3 days ago = 11 days time to hire)
        aarav = cand_map.get("aarav sharma")
        if aarav:
            aarav.created_at = now - timedelta(days=14)
            aarav.current_status = "Hired"
            aarav.hired_at = now - timedelta(days=3)
            aarav.screening_score = 92.0
            aarav.screening_summary = "Proceed to Next Round (92.0%). Outstanding full-stack capabilities."
            aarav.screening_recommendation = "Proceed to Next Round"

            # Create or update application
            app = db.query(JobApplication).filter(JobApplication.candidate_id == aarav.id).first()
            if not app:
                app = JobApplication(
                    id=str(uuid.uuid4()),
                    job_id=jobs[0].id,
                    candidate_id=aarav.id,
                    status="accepted",
                    overall_score=0.92,
                    created_at=now - timedelta(days=14)
                )
                db.add(app)
            else:
                app.status = "accepted"

            # Status history trail
            db.query(CandidateStatusHistory).filter(CandidateStatusHistory.candidate_id == aarav.id).delete()
            history_stages = [
                ("Applied", now - timedelta(days=14), "Initial application received"),
                ("Screened", now - timedelta(days=11), "Voice screening passed with 92% score"),
                ("Interview Scheduled", now - timedelta(days=8), "Scheduled for technical round"),
                ("Interview Completed", now - timedelta(days=6), "Completed system design panel"),
                ("Offered", now - timedelta(days=4), "Official offer extended"),
                ("Hired", now - timedelta(days=3), "Offer accepted. Welcome to the team!"),
            ]
            for stage, t, note in history_stages:
                db.add(CandidateStatusHistory(
                    id=str(uuid.uuid4()),
                    candidate_id=aarav.id,
                    job_id=jobs[0].id,
                    from_status="Applied" if stage == "Screened" else None,
                    to_status=stage,
                    changed_by="Recruiter",
                    notes=note,
                    created_at=t
                ))

        # 2. Isha Gupta -> Offered (applied 10 days ago, offered 2 days ago)
        isha = cand_map.get("isha gupta")
        if isha:
            isha.created_at = now - timedelta(days=10)
            isha.current_status = "Offered"
            isha.screening_score = 86.0
            isha.screening_summary = "Proceed to Next Round (86.0%). Strong cybersecurity & network knowledge."
            isha.screening_recommendation = "Proceed to Next Round"

            app = db.query(JobApplication).filter(JobApplication.candidate_id == isha.id).first()
            target_job = next((j for j in jobs if "security" in j.title.lower()), jobs[0])
            if not app:
                app = JobApplication(
                    id=str(uuid.uuid4()),
                    job_id=target_job.id,
                    candidate_id=isha.id,
                    status="pending",
                    overall_score=0.88,
                    created_at=now - timedelta(days=10)
                )
                db.add(app)

            db.query(CandidateStatusHistory).filter(CandidateStatusHistory.candidate_id == isha.id).delete()
            for stage, t, note in [
                ("Applied", now - timedelta(days=10), "Application submitted"),
                ("Screened", now - timedelta(days=7), "Voice screening passed"),
                ("Interview Completed", now - timedelta(days=4), "Technical interview completed"),
                ("Offered", now - timedelta(days=2), "Offer extended"),
            ]:
                db.add(CandidateStatusHistory(
                    id=str(uuid.uuid4()),
                    candidate_id=isha.id,
                    job_id=target_job.id,
                    to_status=stage,
                    changed_by="Recruiter",
                    notes=note,
                    created_at=t
                ))

        # 3. Rohan Verma -> Interview Completed (applied 9 days ago, interview done)
        rohan = cand_map.get("rohan verma")
        if rohan:
            rohan.created_at = now - timedelta(days=9)
            rohan.current_status = "Interview Completed"
            rohan.screening_score = 88.0
            rohan.screening_summary = "Proceed to Next Round (88.0%). Deep expertise in Kubernetes & Terraform."
            rohan.screening_recommendation = "Proceed to Next Round"

            target_job = next((j for j in jobs if "devops" in j.title.lower() or "infra" in j.title.lower()), jobs[0])
            app = db.query(JobApplication).filter(JobApplication.candidate_id == rohan.id).first()
            if not app:
                app = JobApplication(
                    id=str(uuid.uuid4()),
                    job_id=target_job.id,
                    candidate_id=rohan.id,
                    status="reviewed",
                    overall_score=0.85,
                    created_at=now - timedelta(days=9)
                )
                db.add(app)

        # 4. Ananya Reddy -> Screened (Voice screening completed with 84%)
        ananya = cand_map.get("ananya reddy")
        if ananya:
            ananya.created_at = now - timedelta(days=7)
            ananya.current_status = "Screened"
            ananya.screening_score = 84.0
            ananya.screening_summary = "Proceed to Next Round (84.0%). Tech: 85%, Comm: 82%, Relevance: 86%."
            ananya.screening_recommendation = "Proceed to Next Round"

            target_job = next((j for j in jobs if "ai" in j.title.lower() or "ml" in j.title.lower()), jobs[0])
            app = db.query(JobApplication).filter(JobApplication.candidate_id == ananya.id).first()
            if not app:
                app = JobApplication(
                    id=str(uuid.uuid4()),
                    job_id=target_job.id,
                    candidate_id=ananya.id,
                    status="reviewed",
                    overall_score=0.84,
                    created_at=now - timedelta(days=7)
                )
                db.add(app)

            # Create realistic VoiceScreeningSession for Ananya
            session_id = f"voice-session-{ananya.id[:8]}"
            existing_sess = db.query(VoiceScreeningSession).filter(VoiceScreeningSession.id == session_id).first()
            if not existing_sess:
                sess = VoiceScreeningSession(
                    id=session_id,
                    candidate_id=ananya.id,
                    job_id=target_job.id,
                    interviewer_id=interviewer_id,
                    status="completed",
                    question_count=3,
                    current_question_index=3,
                    overall_score=84.0,
                    technical_score=85.0,
                    relevance_score=86.0,
                    communication_score=82.0,
                    completeness_score=80.0,
                    role_knowledge_score=85.0,
                    recommendation="Proceed to Next Round",
                    summary_report_json=json.dumps({
                        "overall_score": 84.0,
                        "recommendation": "Proceed to Next Round",
                        "action_note": "Strong screening performance. Recommended to schedule in-depth technical interview.",
                        "dimension_breakdown": {
                            "technical_knowledge": 85.0,
                            "response_relevance": 86.0,
                            "communication_clarity": 82.0,
                            "completeness": 80.0,
                            "role_knowledge": 85.0
                        },
                        "total_questions_answered": 3,
                        "completed_at": (now - timedelta(days=2)).isoformat(),
                        "recording_storage_note": "Session transcript and dimension evaluations are permanently stored. Audio buffer processed in-session."
                    }),
                    duration_seconds=185,
                    started_at=now - timedelta(days=2, hours=1),
                    completed_at=now - timedelta(days=2),
                    created_at=now - timedelta(days=2, hours=1),
                )
                db.add(sess)

                # Add 3 responses
                q_responses = [
                    (
                        "Can you explain your experience building machine learning data pipelines and how you handle distributed training?",
                        "I have built pipelines using PyTorch and Kubeflow where we shard data across multiple GPU workers. We used distributed data parallel with gradient accumulation to fit larger batch sizes.",
                        "PyTorch",
                        86.0
                    ),
                    (
                        "How do you monitor and handle model drift once deployed in a production service?",
                        "We track prediction latency, confidence distribution, and ground truth feedback. When Jensen-Shannon divergence exceeds 0.15, an automated retraining alert is triggered.",
                        "MLOps",
                        85.0
                    ),
                    (
                        "What is your approach to optimizing inference speed for LLM endpoints?",
                        "We evaluate KV caching, dynamic tensor batching, and int8 or fp8 quantization with vLLM to maximize throughput per GPU.",
                        "Model Optimization",
                        82.0
                    )
                ]
                for idx, (q_text, ans_text, skill_name, sc) in enumerate(q_responses):
                    db.add(VoiceScreeningResponse(
                        id=str(uuid.uuid4()),
                        session_id=session_id,
                        question_index=idx,
                        question=q_text,
                        question_type="technical",
                        skill=skill_name,
                        candidate_response=ans_text,
                        duration_seconds=45.0,
                        score=sc,
                        evaluation_json=json.dumps({
                            "score": sc,
                            "technical_accuracy": sc + 1,
                            "relevance": sc + 2,
                            "communication": sc - 1,
                            "completeness": sc,
                            "role_knowledge": sc + 1,
                            "feedback": "Articulate explanation with clear references to production trade-offs.",
                            "strengths": ["Clear technical articulation", f"Solid grasp of {skill_name}"],
                            "improvements": ["Could mention specific benchmarking metrics."]
                        }),
                        submitted_at=now - timedelta(days=2)
                    ))

        # 5. Karthik Nair -> Screened (Voice screening completed with 68%)
        karthik = cand_map.get("karthik nair")
        if karthik:
            karthik.created_at = now - timedelta(days=6)
            karthik.current_status = "Screened"
            karthik.screening_score = 68.0
            karthik.screening_summary = "Requires Further Review (68.0%). Good backend fundamentals, moderate gaps in distributed systems."
            karthik.screening_recommendation = "Requires Further Review"

            target_job = next((j for j in jobs if "backend" in j.title.lower()), jobs[0])
            app = db.query(JobApplication).filter(JobApplication.candidate_id == karthik.id).first()
            if not app:
                db.add(JobApplication(
                    id=str(uuid.uuid4()),
                    job_id=target_job.id,
                    candidate_id=karthik.id,
                    status="pending",
                    overall_score=0.72,
                    created_at=now - timedelta(days=6)
                ))

        # 6. Meera Patel -> Interview Scheduled
        meera = cand_map.get("meera patel")
        if meera:
            meera.created_at = now - timedelta(days=5)
            meera.current_status = "Interview Scheduled"

        # 7. Arjun Das -> Rejected (completed hiring process)
        arjun = cand_map.get("arjun das")
        if arjun:
            arjun.created_at = now - timedelta(days=12)
            arjun.current_status = "Rejected"
            db.query(CandidateStatusHistory).filter(CandidateStatusHistory.candidate_id == arjun.id).delete()
            for stage, t, note in [
                ("Applied", now - timedelta(days=12), "Application submitted"),
                ("Screened", now - timedelta(days=9), "Screening conducted"),
                ("Rejected", now - timedelta(days=4), "Does not meet Senior QA criteria at this time"),
            ]:
                db.add(CandidateStatusHistory(
                    id=str(uuid.uuid4()),
                    candidate_id=arjun.id,
                    job_id=jobs[0].id,
                    to_status=stage,
                    changed_by="Recruiter",
                    notes=note,
                    created_at=t
                ))

        # 8. User Feedback
        if db.query(UserFeedback).count() == 0:
            feedbacks = [
                (5, "The AI voice screening and automated transcript evaluation saved our engineering panel over 4 hours per candidate!"),
                (5, "Love the unified pipeline and instant candidate ranking. The UI feels clean, fast, and professional."),
                (4, "Great matching accuracy and skill gap recommendations. Helpful course links."),
                (5, "The live waveform indicator and browser speech-to-text worked flawlessly during our screening trials."),
                (4, "Comprehensive dashboard KPIs. The time-to-hire calculation is completely transparent."),
            ]
            for rating, comment in feedbacks:
                db.add(UserFeedback(
                    id=str(uuid.uuid4()),
                    user_id=interviewer_id,
                    user_role="recruiter",
                    rating=rating,
                    feedback_text=comment,
                    feature="recruitment_dashboard",
                    created_at=now - timedelta(hours=12)
                ))

        db.commit()
        print("[Seed M4] Milestone 4 data enrichment completed successfully!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_m4()
