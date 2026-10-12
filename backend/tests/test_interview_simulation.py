"""Tests for Feature 3: AI-Powered Interactive Interview Simulation."""

import pytest
from app.core.interview_simulation import (
    start_simulation,
    get_current_question,
    submit_candidate_answer,
    complete_simulation,
    get_simulation_report,
    _fallback_evaluate_answer,
)
from app.db.models import InterviewSession, InterviewResponse, Candidate, CandidateStatusHistory


class TestInterviewSimulationEngine:
    """Core business logic tests for interview simulation."""

    def test_full_simulation_lifecycle(self, db, sample_job, sample_candidate, candidate_user):
        """Walk through an entire end-to-end interview simulation:
        start -> answer Q0 -> answer Q1 -> complete -> verify ATS status & report.
        """
        # Step 1: Start simulation with 2 questions
        session_info = start_simulation(
            candidate_id=sample_candidate.id,
            job_id=sample_job.id,
            interview_type="mixed",
            num_questions=2,
            db=db
        )

        session_id = session_info["session_id"]
        assert session_info["status"] == "in_progress"
        assert session_info["question_count"] == 2
        assert session_info["current_question_index"] == 0

        # Candidate ATS status should be "Interview In Progress"
        db.refresh(sample_candidate)
        assert sample_candidate.current_status == "Interview In Progress"

        # Step 2: Fetch current question (Q0)
        q0 = get_current_question(session_id, user=candidate_user, db=db)
        assert q0["current_question_index"] == 0
        assert q0["total_questions"] == 2
        assert "question" in q0
        assert "question" in q0["question"]

        # Step 3: Candidate submits answer for Q0
        ans0 = (
            "In PyTorch, I handle multi-GPU distributed training using DistributedDataParallel (DDP) "
            "with torchrun. For model parallelism on large LLMs, I leverage FSDP or DeepSpeed ZeRO-3 "
            "to shard model weights, gradients, and optimizer states across nodes."
        )
        res0 = submit_candidate_answer(
            session_id=session_id,
            question_index=0,
            answer_text=ans0,
            user=candidate_user,
            db=db
        )

        assert res0["status"] == "in_progress"
        assert res0["current_question_index"] == 1
        assert "evaluation_preview" in res0
        assert res0["evaluation_preview"]["score"] >= 1.0

        # Step 4: Duplicate submission check - submitting Q0 again should fail
        with pytest.raises(ValueError) as exc:
            submit_candidate_answer(
                session_id=session_id,
                question_index=0,  # Wrong index! Current is 1
                answer_text="Trying to submit Q0 again",
                user=candidate_user,
                db=db
            )
        assert "Expected current question index: 1" in str(exc.value)

        # Step 5: Fetch Q1
        q1 = get_current_question(session_id, user=candidate_user, db=db)
        assert q1["current_question_index"] == 1

        # Step 6: Submit final answer for Q1
        ans1 = (
            "When faced with ambiguous stakeholder requirements, I first schedule an alignment meeting "
            "to understand the business objective and define quantifiable success metrics (e.g., latency SLA, "
            "F1 score target). I create an RFC document with architecture tradeoffs and iterate based on feedback."
        )
        res1 = submit_candidate_answer(
            session_id=session_id,
            question_index=1,
            answer_text=ans1,
            user=candidate_user,
            db=db
        )

        assert res1["status"] == "completed"
        assert "overall_score" in res1

        # Step 7: Verify Session completion state
        session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
        assert session.status == "completed"
        assert session.overall_score is not None
        assert session.overall_score >= 0 and session.overall_score <= 100

        # Step 8: Verify ATS status synchronized to "Interview Completed"
        db.refresh(sample_candidate)
        assert sample_candidate.current_status == "Interview Completed"

        # Verify audit history logged "Interview Completed"
        histories = db.query(CandidateStatusHistory).filter(
            CandidateStatusHistory.candidate_id == sample_candidate.id
        ).all()
        history_statuses = [h.to_status for h in histories]
        assert "Interview In Progress" in history_statuses
        assert "Interview Completed" in history_statuses

        # Step 9: Verify complete report
        report = get_simulation_report(session_id, user=candidate_user, db=db)
        assert report["status"] == "completed"
        assert len(report["transcript"]) == 2
        assert "summary_report" in report
        assert "strengths" in report["summary_report"]
        assert "areas_to_improve" in report["summary_report"]
        assert report["overall_score"] == session.overall_score

    def test_fallback_evaluator_scoring(self):
        """Test the heuristic evaluation fallback for various answer qualities."""
        question_text = "Describe the difference between bagging and boosting in ensemble learning."
        expected_focus = ["variance reduction", "bias reduction", "sequential", "parallel"]

        # Very short answer
        short_res = _fallback_evaluate_answer(
            question=question_text,
            candidate_answer="They are both ensemble learning methods.",
            expected_focus=expected_focus
        )
        assert short_res["score"] < 6.0
        assert short_res["depth"] <= 4

        # Comprehensive answer matching competencies
        good_answer = (
            "Bagging trains models in parallel to achieve variance reduction through averaging like Random Forest, "
            "whereas boosting trains models in a sequential manner where each model corrects residual errors to achieve "
            "bias reduction. Both are fundamental ensemble techniques."
        )
        good_res = _fallback_evaluate_answer(
            question=question_text,
            candidate_answer=good_answer,
            expected_focus=expected_focus
        )
        assert good_res["score"] >= 7.5
        assert len(good_res["strengths"]) > 0


class TestInterviewSimulationEndpoints:
    """Test REST API routes for simulation lifecycle."""

    def test_simulation_api_flow(self, candidate_client, sample_candidate, sample_job):
        """Verify API endpoints: start -> get current -> submit answer -> get report."""
        # 1. Start simulation
        start_resp = candidate_client.post(
            "/api/interviews/simulation/start",
            json={
                "candidate_id": sample_candidate.id,
                "job_id": sample_job.id,
                "interview_type": "technical",
                "num_questions": 1
            }
        )
        assert start_resp.status_code == 200
        start_data = start_resp.json()
        session_id = start_data["session_id"]
        assert start_data["status"] == "in_progress"

        # 2. Get current question
        q_resp = candidate_client.get(f"/api/interviews/simulation/{session_id}/current")
        assert q_resp.status_code == 200
        q_data = q_resp.json()
        assert q_data["current_question_index"] == 0
        assert "question" in q_data

        # 3. Submit candidate answer
        ans_resp = candidate_client.post(
            f"/api/interviews/simulation/{session_id}/answer",
            json={
                "question_index": 0,
                "answer": "I use Docker containers and Kubernetes deployments with health probes and autoscaling to manage high availability services."
            }
        )
        assert ans_resp.status_code == 200
        ans_data = ans_resp.json()
        assert ans_data["status"] == "completed"

        # 4. Get report
        rep_resp = candidate_client.get(f"/api/interviews/simulation/{session_id}/report")
        assert rep_resp.status_code == 200
        rep_data = rep_resp.json()
        assert rep_data["status"] == "completed"
        assert len(rep_data["transcript"]) == 1
        assert rep_data["overall_score"] is not None

    def test_scheduled_and_launch_simulation_flow(self, client, sample_candidate, sample_job, db):
        """Test scheduling an interview with initial_status='scheduled', then candidate launches it."""
        # 1. Schedule with initial_status="scheduled"
        sched_resp = client.post(
            "/api/interviews/simulation/start",
            json={
                "candidate_id": sample_candidate.id,
                "job_id": sample_job.id,
                "interview_type": "mixed",
                "num_questions": 3,
                "technical_count": 2,
                "behavioral_count": 1,
                "initial_status": "scheduled"
            }
        )
        assert sched_resp.status_code == 200
        sched_data = sched_resp.json()
        session_id = sched_data["session_id"]
        assert sched_data["status"] == "scheduled"

        # Candidate ATS status should be "Interview Scheduled"
        db.refresh(sample_candidate)
        assert sample_candidate.current_status == "Interview Scheduled"

        # 2. Check live status while scheduled
        live_resp = client.get(f"/api/interviews/simulation/{session_id}/live-status")
        assert live_resp.status_code == 200
        live_data = live_resp.json()
        assert live_data["status"] == "scheduled"
        assert live_data["answered"] == 0
        assert live_data["remaining"] == 3
        assert live_data["progress_percent"] == 0.0

        # 3. Launch simulation
        launch_resp = client.post(f"/api/interviews/simulation/{session_id}/launch")
        assert launch_resp.status_code == 200
        launch_data = launch_resp.json()
        assert launch_data["status"] == "in_progress"

        # Candidate ATS status should transition to "Interview In Progress"
        db.refresh(sample_candidate)
        assert sample_candidate.current_status == "Interview In Progress"

        # 4. Check active simulations list
        recruiter_active_resp = client.get("/api/interviews/simulation/active")
        assert recruiter_active_resp.status_code == 200
        active_sessions = recruiter_active_resp.json()["active_simulations"]
        active_ids = [s["session_id"] for s in active_sessions]
        assert session_id in active_ids

        # 5. Answer question 0 and verify progress increments
        ans_resp = client.post(
            f"/api/interviews/simulation/{session_id}/answer",
            json={
                "question_index": 0,
                "answer": "We evaluate loss divergence and monitor feature distribution shifts using KS statistics."
            }
        )
        assert ans_resp.status_code == 200

        # 6. Verify live status reflects answer
        live_after = client.get(f"/api/interviews/simulation/{session_id}/live-status").json()
        assert live_after["answered"] == 1
        assert live_after["remaining"] == 2
        assert live_after["progress_percent"] == pytest.approx(33.3, abs=0.5)

