"""Unit and integration tests for Milestone 4 (Dashboard, Voice Screening, and Analytics)."""

import pytest
import uuid
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from app.db.models import (
    Candidate,
    Job,
    JobApplication,
    Interview,
    InterviewSession,
    VoiceScreeningSession,
    VoiceScreeningResponse,
    CandidateStatusHistory,
    UserFeedback,
    User
)
from app.core.voice_screening import (
    generate_voice_screening_questions,
    evaluate_voice_response,
    finalize_voice_screening_assessment
)


class TestDashboardAndAnalyticsCalculations:
    """Tests for KPI metrics, pipeline stages, hiring success rate, and time-to-hire."""

    def test_kpi_total_candidates_and_interviews(self, client, db, sample_candidate, sample_job):
        """Verify Total Candidates and Interviews Scheduled reflect actual database records."""
        resp = client.get("/api/dashboard/stats?force_refresh=true")
        assert resp.status_code == 200
        data = resp.json()

        assert "kpis" in data
        kpis = data["kpis"]
        assert kpis["total_candidates"] >= 1
        assert "interviews_scheduled" in kpis
        assert isinstance(kpis["interviews_scheduled"], int)

    def test_hiring_success_rate_formula(self, client, db, interviewer_user):
        """Verify Hiring Success Rate = successful_hires / completed_processes * 100."""
        # Create 1 Hired and 1 Rejected candidate
        hired_cand = Candidate(
            id=str(uuid.uuid4()),
            name="Hired Candidate Test",
            email="hired@test.com",
            current_status="Hired",
            hired_at=datetime.utcnow(),
            created_at=datetime.utcnow() - timedelta(days=10)
        )
        rejected_cand = Candidate(
            id=str(uuid.uuid4()),
            name="Rejected Candidate Test",
            email="rejected@test.com",
            current_status="Rejected",
            created_at=datetime.utcnow() - timedelta(days=8)
        )
        db.add(hired_cand)
        db.add(rejected_cand)
        db.commit()

        resp = client.get("/api/dashboard/stats?force_refresh=true")
        assert resp.status_code == 200
        kpis = resp.json()["kpis"]

        # Hired should be at least 1, rejected at least 1
        assert kpis["successful_hires_count"] >= 1
        assert kpis["completed_processes_count"] >= 2
        expected_rate = round((kpis["successful_hires_count"] / kpis["completed_processes_count"]) * 100, 1)
        assert kpis["hiring_success_rate"] == expected_rate

    def test_average_time_to_hire_calculation(self, client, db):
        """Verify Average Time to Hire is calculated from candidate application date to hire date."""
        # Create a candidate with known duration: applied 12 days ago, hired 2 days ago = 10 days
        cand = Candidate(
            id=str(uuid.uuid4()),
            name="Time To Hire Test",
            email="time2hire@test.com",
            current_status="Hired",
            created_at=datetime.utcnow() - timedelta(days=12),
            hired_at=datetime.utcnow() - timedelta(days=2)
        )
        db.add(cand)
        db.commit()

        resp = client.get("/api/dashboard/stats?force_refresh=true")
        assert resp.status_code == 200
        kpis = resp.json()["kpis"]
        assert kpis["average_time_to_hire_days"] is not None
        assert kpis["average_time_to_hire_days"] > 0

    def test_pipeline_stages_breakdown(self, client, db):
        """Verify recruitment pipeline tracks Applied, Screened, Interviewed, Offered, and Hired."""
        resp = client.get("/api/dashboard/stats?force_refresh=true")
        assert resp.status_code == 200
        pipeline = resp.json()["pipeline"]

        stages = [s["stage"] for s in pipeline["stages"]]
        assert "Applied" in stages
        assert "Screened" in stages
        assert "Interviewed" in stages
        assert "Offered" in stages
        assert "Hired" in stages


class TestVoiceScreeningLogicAndLifecycle:
    """Hardware-independent testing for Voice Screening orchestration."""

    def test_voice_question_generation(self, db, sample_candidate, sample_job):
        """Verify questions generated for oral screening are tailored and TTS-ready."""
        questions = generate_voice_screening_questions(
            candidate=sample_candidate,
            job=sample_job,
            num_questions=3
        )
        assert len(questions) == 3
        for q in questions:
            assert "question" in q and len(q["question"]) > 10
            assert "skill" in q
            assert "expected_focus" in q and len(q["expected_focus"]) > 0

    def test_voice_response_evaluation_multi_dimensions(self):
        """Verify spoken answer evaluation evaluates 5 distinct competency dimensions."""
        question = "How do you handle model latency and memory optimization in deep learning deployment?"
        sample_answer = "We implement INT8 quantization and TensorRT-LLM with KV-caching to reduce memory footprint and latency."
        expected_focus = ["quantization", "latency", "memory", "caching", "TensorRT"]

        eval_result = evaluate_voice_response(
            question=question,
            candidate_response=sample_answer,
            skill="Model Optimization",
            expected_focus=expected_focus,
            job_title="ML Engineer"
        )

        assert "score" in eval_result
        assert "technical_accuracy" in eval_result
        assert "relevance" in eval_result
        assert "communication" in eval_result
        assert "completeness" in eval_result
        assert "role_knowledge" in eval_result
        assert "feedback" in eval_result
        assert 0.0 <= eval_result["score"] <= 100.0

    def test_full_voice_screening_api_session_lifecycle(self, client, db, sample_candidate, sample_job):
        """Verify full lifecycle: start session -> submit STT answers -> evaluate -> update candidate."""
        # 1. Start voice screening
        start_resp = client.post(
            "/api/voice-screening/start",
            json={
                "candidate_id": sample_candidate.id,
                "job_id": sample_job.id,
                "question_count": 2
            }
        )
        assert start_resp.status_code == 200
        session_data = start_resp.json()
        session_id = session_data["session_id"]
        assert session_data["status"] == "ready"
        assert len(session_data["questions"]) == 2

        # 2. Submit Question 0 response
        ans0_resp = client.post(
            f"/api/voice-screening/session/{session_id}/answer",
            json={
                "question_index": 0,
                "candidate_response": "We use PyTorch distributed data parallel with gradient accumulation.",
                "duration_seconds": 32.5
            }
        )
        assert ans0_resp.status_code == 200
        ans0_data = ans0_resp.json()
        assert ans0_data["is_completed"] is False
        assert ans0_data["next_question_index"] == 1

        # 3. Submit Question 1 (Final question) response
        ans1_resp = client.post(
            f"/api/voice-screening/session/{session_id}/answer",
            json={
                "question_index": 1,
                "candidate_response": "We monitor prediction latency and Jensen-Shannon divergence to identify data drift.",
                "duration_seconds": 40.0
            }
        )
        assert ans1_resp.status_code == 200
        ans1_data = ans1_resp.json()
        assert ans1_data["is_completed"] is True
        assert "final_report" in ans1_data

        final_report = ans1_data["final_report"]
        assert final_report["overall_score"] > 0
        assert final_report["recommendation"] in ["Proceed to Next Round", "Requires Further Review", "Do Not Proceed at This Stage"]

        # 4. Verify candidate record was updated in database
        db.refresh(sample_candidate)
        assert sample_candidate.current_status == "Screened"
        assert sample_candidate.screening_score is not None
        assert sample_candidate.screening_recommendation == final_report["recommendation"]

        # 5. Fetch full report endpoint
        report_resp = client.get(f"/api/voice-screening/session/{session_id}/report")
        assert report_resp.status_code == 200
        assert len(report_resp.json()["responses"]) == 2


class TestSystemStatusAndUserFeedback:
    """Tests for system health check and user satisfaction mechanism."""

    def test_system_status_endpoint(self, client):
        """Verify system health endpoint performs real checks and returns latency."""
        resp = client.get("/api/system/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["overall_status"] in ["operational", "degraded"]
        assert len(data["services"]) >= 4

        service_names = [s["name"] for s in data["services"]]
        assert "Database" in service_names
        assert "AI Service" in service_names
        assert "Voice Service" in service_names
        assert "Resume Parser" in service_names

    def test_user_feedback_submission_and_target_calculation(self, client, db):
        """Verify user satisfaction ratings calculate actual score against 85% target."""
        # Submit 2 ratings: 5 and 4 -> 100% >= 4
        sub1 = client.post("/api/feedback", json={"rating": 5, "feedback_text": "Great screening automation!"})
        assert sub1.status_code == 200

        sub2 = client.post("/api/feedback", json={"rating": 4, "feedback_text": "Accurate transcriptions."})
        assert sub2.status_code == 200

        summary_resp = client.get("/api/feedback/summary")
        assert summary_resp.status_code == 200
        summary = summary_resp.json()

        assert summary["total_feedbacks"] >= 2
        assert summary["average_rating"] >= 4.0
        assert summary["target_benchmark_pct"] == 85.0
        assert "satisfaction_score_pct" in summary
