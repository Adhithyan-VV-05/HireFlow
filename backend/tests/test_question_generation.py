"""Tests for Feature 1: Role-Specific Interview Question Generation."""

import pytest
from unittest.mock import patch

from app.core.question_generator import (
    generate_interview_questions,
    _parse_and_validate_questions_json,
)
from app.core.question_bank import QUESTION_BANK, get_fallback_questions


class TestRoleSpecificQuestionGeneration:
    """Test suite for question generation across various job roles and scenarios."""

    @pytest.mark.parametrize("job_role", [
        "Senior ML Engineer",
        "Data Scientist",
        "Software Engineer",
        "Full Stack Developer",
        "DevOps Engineer",
        "Backend Developer",
        "Frontend Developer",
        "Cloud Architect",
    ])
    def test_question_generation_for_multiple_roles(self, job_role):
        """Verify questions can be generated for multiple distinct engineering roles."""
        result = generate_interview_questions(
            job_title=job_role,
            job_description=f"Core responsibilities and system architecture for {job_role}",
            required_skills=["Python", "Cloud", "Git"],
            num_questions=4,
            interview_type="mixed",
        )

        assert "questions" in result
        questions = result["questions"]
        assert len(questions) == 4
        assert result["job_role"] == job_role
        assert result["generated_by"] in ["llm", "fallback_bank"]

        # Verify each question conforms to the required schema
        for q in questions:
            assert "question" in q and isinstance(q["question"], str)
            assert len(q["question"]) > 10
            assert q["type"] in {"technical", "behavioral", "situational", "resume-based"}
            assert q["difficulty"] in {"entry", "intermediate", "advanced"}
            assert "skill" in q and isinstance(q["skill"], str)
            assert "expected_focus" in q and isinstance(q["expected_focus"], list)
            assert len(q["expected_focus"]) > 0

    def test_resume_grounded_question_generation(self):
        """Verify candidate resume text and skills are incorporated into question context."""
        resume_snippet = (
            "Alex Chen: Senior ML Engineer who built a distributed LLM inference engine using "
            "vLLM, TensorRT-LLM, and Triton, reducing latency by 45% for 10M daily requests."
        )
        candidate_skills = ["vLLM", "TensorRT-LLM", "Triton", "PyTorch", "Kubernetes"]

        result = generate_interview_questions(
            job_title="Senior ML Engineer",
            job_description="Architect scalable inference infrastructure for large generative AI models.",
            required_skills=["PyTorch", "CUDA", "vLLM", "Docker"],
            candidate_skills=candidate_skills,
            candidate_resume_text=resume_snippet,
            candidate_name="Alex Chen",
            num_questions=5,
            interview_type="mixed"
        )

        assert len(result["questions"]) == 5
        assert result["job_role"] == "Senior ML Engineer"
        for q in result["questions"]:
            assert q["type"] in {"technical", "behavioral", "situational", "resume-based"}
            assert len(q["expected_focus"]) > 0

    def test_fallback_generator_resilience(self):
        """Verify fallback bank returns robust, validated questions if LLM is unavailable."""
        with patch("app.core.question_generator.call_llm", side_effect=RuntimeError("LLM API key exhausted")):
            result = generate_interview_questions(
                job_title="Data Scientist",
                num_questions=5,
                interview_type="mixed"
            )

            assert len(result["questions"]) == 5
            assert result["generated_by"] == "fallback_bank"
            for q in result["questions"]:
                assert "question" in q
                assert "type" in q
                assert "difficulty" in q
                assert "skill" in q
                assert len(q["expected_focus"]) > 0

    def test_json_parser_and_validator(self):
        """Verify the JSON response parser handles markdown fences and cleans responses."""
        raw_json_with_fences = """```json
        {
          "job_role": "Software Engineer",
          "questions": [
            {
              "question": "How do you handle distributed transactions across microservices using the Saga pattern?",
              "type": "technical",
              "difficulty": "advanced",
              "skill": "Microservices",
              "expected_focus": ["orchestration", "choreography", "compensating transactions"]
            },
            {
              "question": "Describe a conflict you had with a product manager regarding technical debt and how you resolved it.",
              "type": "behavioral",
              "difficulty": "intermediate",
              "skill": "Communication",
              "expected_focus": ["prioritization", "impact metrics", "collaboration"]
            }
          ]
        }
        ```"""

        parsed = _parse_and_validate_questions_json(raw_json_with_fences, "Software Engineer", 2)
        assert parsed is not None
        assert len(parsed["questions"]) == 2
        assert parsed["questions"][0]["skill"] == "Microservices"
        assert parsed["questions"][1]["type"] == "behavioral"


class TestQuestionGenerationEndpoints:
    """Test API routes for question generation."""

    def test_generate_questions_with_job_and_candidate(self, client, sample_job, sample_candidate):
        """Test POST /api/interviews/questions/generate with existing job and candidate."""
        response = client.post(
            "/api/interviews/questions/generate",
            json={
                "job_id": sample_job.id,
                "candidate_id": sample_candidate.id,
                "question_type": "mixed",
                "num_questions": 4,
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "questions" in data
        assert len(data["questions"]) == 4
        assert data["job_role"] == sample_job.title

    def test_generate_questions_with_job_title_only(self, client):
        """Test POST /api/interviews/questions/generate with ad-hoc job title."""
        response = client.post(
            "/api/interviews/questions/generate",
            json={
                "job_title": "Full Stack Developer",
                "experience_level": "Senior",
                "question_type": "technical",
                "num_questions": 3,
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["questions"]) == 3
        assert data["job_role"] == "Full Stack Developer"

    def test_generate_questions_missing_title_and_id(self, client):
        """Test POST /api/interviews/questions/generate fails when no job info provided."""
        response = client.post(
            "/api/interviews/questions/generate",
            json={
                "num_questions": 3,
            }
        )

        assert response.status_code == 400
        assert "Either 'job_title' or valid 'job_id' must be provided" in response.json()["detail"]

    def test_question_generation_category_counts(self, client):
        """Test POST /api/interviews/questions/generate with explicit category counts."""
        response = client.post(
            "/api/interviews/questions/generate",
            json={
                "job_title": "Senior ML Engineer",
                "experience_level": "Senior",
                "num_questions": 7,
                "technical_count": 3,
                "behavioral_count": 2,
                "situational_count": 1,
                "hr_count": 1
            }
        )
        assert response.status_code == 200
        data = response.json()
        questions = data["questions"]
        assert len(questions) == 7

        types = [q["type"] for q in questions]
        assert types.count("technical") >= 1
        assert types.count("behavioral") >= 1

    @pytest.mark.parametrize("count", [5, 10, 15])
    def test_multiple_question_counts(self, client, count):
        """Verify generation respects 5, 10, and 15 total questions exactly."""
        response = client.post(
            "/api/interviews/questions/generate",
            json={
                "job_title": "Software Engineer",
                "experience_level": "Intermediate",
                "num_questions": count
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["questions"]) == count

