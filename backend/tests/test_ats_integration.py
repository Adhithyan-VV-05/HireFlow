"""Tests for Feature 2: ATS Integration & Candidate Pipeline Management."""

import pytest
from app.services.ats.mock_ats import MockATSProvider
from app.services.ats.base import VALID_ATS_STATUSES
from app.db.models import Candidate, CandidateStatusHistory, JobApplication


class TestMockATSProvider:
    """Direct tests for the database-backed MockATSProvider."""

    def test_create_and_retrieve_candidate(self, db, sample_job):
        """Verify candidate creation persists in SQLite and is retrievable."""
        provider = MockATSProvider()
        candidate_data = {
            "name": "Jordan Lee",
            "email": "jordan.lee@testats.com",
            "phone": "+1-555-8822",
            "source": "Mock ATS Import",
            "status": "Applied",
            "skills": ["Python", "FastAPI", "React"],
            "job_id": sample_job.id
        }

        created = provider.create_candidate(candidate_data, db)
        assert created["email"] == "jordan.lee@testats.com"
        assert created["current_status"] == "Applied"
        assert created["source"] == "Mock ATS Import"
        candidate_id = created["id"]

        # Check DB directly
        db_cand = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        assert db_cand is not None
        assert db_cand.name == "Jordan Lee"

        # Check retrieve via provider
        fetched = provider.get_candidate(candidate_id, db)
        assert fetched is not None
        assert fetched["id"] == candidate_id
        assert fetched["name"] == "Jordan Lee"

    def test_pipeline_status_transitions_and_audit_history(self, db, sample_job):
        """Verify full candidate stage progression with automatic audit logging."""
        provider = MockATSProvider()
        created = provider.create_candidate({
            "name": "Sam Taylor",
            "email": "sam.taylor@testats.com",
            "status": "Applied",
            "job_id": sample_job.id
        }, db)
        cand_id = created["id"]

        # Walk through stages
        stages = [
            ("Screening", "Passed initial resume review"),
            ("Shortlisted", "Shortlisted by hiring manager"),
            ("Interview Scheduled", "Invited to AI technical simulation"),
            ("Interview In Progress", "Candidate entered simulation room"),
            ("Interview Completed", "Candidate answered all questions with score 88"),
            ("Selected", "Strong hire recommendation"),
        ]

        for new_stage, note in stages:
            updated = provider.update_candidate_status(
                candidate_id=cand_id,
                new_status=new_stage,
                notes=note,
                changed_by="interviewer-1",
                db=db
            )
            assert updated["current_status"] == new_stage

        # Verify audit history (initial registration + 6 transitions = 7 entries)
        history = provider.get_candidate_history(cand_id, db)
        assert len(history) == len(stages) + 1
        assert history[0]["to_status"] == "Applied"
        assert history[1]["to_status"] == "Screening"
        assert history[-1]["to_status"] == "Selected"
        assert history[-1]["notes"] == "Strong hire recommendation"

        # Verify CandidateStatusHistory rows in DB
        db_history = db.query(CandidateStatusHistory).filter(
            CandidateStatusHistory.candidate_id == cand_id
        ).all()
        assert len(db_history) == len(stages) + 1

    def test_invalid_status_rejection(self, db):
        """Verify invalid statuses are rejected with ValueError."""
        provider = MockATSProvider()
        created = provider.create_candidate({
            "name": "Invalid Stage Test",
            "email": "invalid@testats.com",
            "status": "Applied"
        }, db)

        with pytest.raises(ValueError) as exc:
            provider.update_candidate_status(
                candidate_id=created["id"],
                new_status="PromotedToCEO",  # Non-existent stage
                db=db
            )
        assert "Invalid ATS status" in str(exc.value)

    def test_list_candidates_with_filtering(self, db, sample_job):
        """Verify listing candidates filters correctly by pipeline stage."""
        provider = MockATSProvider()
        # Create one in Applied, one in Selected
        c1 = provider.create_candidate({
            "name": "Applicant One",
            "email": "one@testats.com",
            "status": "Applied"
        }, db)
        c2 = provider.create_candidate({
            "name": "Applicant Two",
            "email": "two@testats.com",
            "status": "Selected"
        }, db)

        applied_list = provider.list_candidates({"status": "Applied"}, db)
        applied_emails = [c["email"] for c in applied_list]
        assert "one@testats.com" in applied_emails
        assert "two@testats.com" not in applied_emails

        selected_list = provider.list_candidates({"status": "Selected"}, db)
        selected_emails = [c["email"] for c in selected_list]
        assert "two@testats.com" in selected_emails
        assert "one@testats.com" not in selected_emails


class TestATSAPIEndpoints:
    """Test REST API endpoints for ATS integration."""

    def test_api_create_and_fetch_candidate(self, client, sample_job):
        """Test POST and GET /api/ats/candidates."""
        post_resp = client.post(
            "/api/ats/candidates",
            json={
                "name": "Elena Rostova",
                "email": "elena.rostova@ats-api.com",
                "phone": "+1-555-4321",
                "source": "LinkedIn ATS Sync",
                "status": "Applied",
                "skills": ["Python", "PyTorch", "Kubernetes"],
                "job_id": sample_job.id
            }
        )
        assert post_resp.status_code == 201
        data = post_resp.json()
        assert data["candidate"]["name"] == "Elena Rostova"
        cand_id = data["candidate"]["id"]

        # Fetch candidate by ID
        get_resp = client.get(f"/api/ats/candidates/{cand_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["email"] == "elena.rostova@ats-api.com"

    def test_api_update_status_and_get_history(self, client, sample_job):
        """Test PATCH /api/ats/candidates/{id}/status and GET /api/ats/candidates/{id}/history."""
        post_resp = client.post(
            "/api/ats/candidates",
            json={
                "name": "Marcus Aurelius",
                "email": "marcus@rome.test",
                "status": "Applied"
            }
        )
        cand_id = post_resp.json()["candidate"]["id"]

        # Update to Shortlisted
        patch_resp = client.patch(
            f"/api/ats/candidates/{cand_id}/status",
            json={
                "status": "Shortlisted",
                "notes": "Impressive background in distributed systems"
            }
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["details"]["current_status"] == "Shortlisted"

        # Check audit history endpoint (initial Applied + Shortlisted = 2 entries)
        hist_resp = client.get(f"/api/ats/candidates/{cand_id}/history")
        assert hist_resp.status_code == 200
        hist_data = hist_resp.json()["history"]
        assert len(hist_data) == 2
        assert hist_data[-1]["to_status"] == "Shortlisted"
        assert hist_data[-1]["notes"] == "Impressive background in distributed systems"

    def test_api_link_interview(self, client, sample_job):
        """Test POST /api/ats/candidates/{id}/interview."""
        post_resp = client.post(
            "/api/ats/candidates",
            json={
                "name": "Interview Candidate",
                "email": "interview.cand@ats-api.com",
                "status": "Shortlisted"
            }
        )
        cand_id = post_resp.json()["candidate"]["id"]

        link_resp = client.post(
            f"/api/ats/candidates/{cand_id}/interview",
            json={
                "job_id": sample_job.id,
                "interview_type": "technical",
                "question_count": 5
            }
        )
        assert link_resp.status_code == 200
        data = link_resp.json()
        assert "interview" in data
        assert data["interview"]["job_id"] == sample_job.id

    def test_api_ats_huggingface_match(self, client, sample_candidate, sample_job):
        """Test GET /api/ats/candidates/{candidate_id}/match/{job_id} using ATS intelligence."""
        resp = client.get(f"/api/ats/candidates/{sample_candidate.id}/match/{sample_job.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["candidate_id"] == sample_candidate.id
        assert data["job_id"] == sample_job.id
        assert "semantic_match_score" in data
        assert "composite_match_score" in data
        assert "matching_skills" in data
        assert "missing_skills" in data
        assert data["composite_match_score"] >= 0.0 and data["composite_match_score"] <= 1.0

