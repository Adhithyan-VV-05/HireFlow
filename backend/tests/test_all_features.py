"""Comprehensive Verification Test Suite for All 7 HireFlow AI Core Features:

Feature 1: Resume upload and PDF/DOCX extraction.
Feature 2: Resume parsing and candidate profiling (name, education, skills, experience, projects, certifications).
Feature 3: Candidate-job matching and hiring score calculation.
Feature 4: Skill-gap analysis and ATS candidate management & status tracking.
Feature 5: Role-specific interview questions (technical, behavioral, situational, descriptive, MCQ) & candidate practice.
Feature 6: AI interview simulation and answer evaluation (overall score, question-level feedback, strengths, improvements).
Feature 7: Recruitment analytics dashboard (Streamlit) and voice-based screening (speech-to-text).
"""

import json
import os
import pytest
from datetime import datetime

from app.core.parsing import extract_text
from app.core.ner import extract_entities
from app.core.profiler import extract_candidate_profile
from app.core.question_generator import generate_interview_questions
from app.core.interview_simulation import start_simulation, submit_candidate_answer
from app.core.voice_screening import (
    generate_voice_screening_questions,
    evaluate_voice_response,
    finalize_voice_screening_assessment
)
from app.services.ats.mock_ats import MockATSProvider
from app.routes.upskilling import skill_matches
from app.db.models import (
    Candidate,
    Job,
    User,
    JobApplication,
    InterviewSession,
    VoiceScreeningSession,
    VoiceScreeningResponse
)


SAMPLE_RESUME_TEXT = """
Sarah Connor
Email: sarah.connor@example.com
Phone: +1-555-0199
Location: San Francisco, CA

Professional Summary
Senior Software Engineer with 6+ years of experience specializing in full-stack distributed systems, Python, FastAPI, React, and cloud native architectures.

Education
Master of Science in Computer Science from Stanford University (2018 - 2020)
Bachelor of Technology in Information Technology from MIT Academy (2014 - 2018)

Technical Skills
Python, FastAPI, Django, JavaScript, TypeScript, React, Docker, Kubernetes, AWS, PostgreSQL, Redis, Machine Learning, Git

Work Experience
Senior Software Engineer at Cyberdyne Systems (Jan 2021 - Present)
- Architected resilient microservices utilizing FastAPI and Redis caching, cutting latency by 45%.
- Led cloud migration of PostgreSQL databases to AWS RDS with zero downtime.

Full Stack Developer at Tech Corp (Jun 2018 - Dec 2020)
- Designed interactive candidate dashboards using React and TypeScript.
- Implemented automated CI/CD pipelines using Docker and GitHub Actions.

Projects
HireFlow AI Platform (Python, FastAPI, React, FAISS)
- Built an intelligent talent matching and ATS synchronization platform processing 100k+ resumes.
Real-Time Telemetry Engine (Go, Kafka, Redis)
- Deployed high-throughput event processing pipelines handling 50k events/second.

Certifications
AWS Certified Solutions Architect from Amazon Web Services (2022)
Deep Learning Specialization from Coursera (2021)
"""


# ── Feature 1: Resume Upload and PDF/DOCX Extraction ──────────────────────────
class TestFeature1ResumeExtraction:
    def test_extract_text_txt(self, tmp_path):
        f = tmp_path / "sample_resume.txt"
        f.write_text(SAMPLE_RESUME_TEXT, encoding="utf-8")
        extracted = extract_text(str(f))
        assert "Sarah Connor" in extracted
        assert "Stanford University" in extracted
        assert "AWS Certified Solutions Architect" in extracted

    def test_unsupported_format_raises_error(self, tmp_path):
        f = tmp_path / "resume.xyz"
        f.write_text("random content", encoding="utf-8")
        with pytest.raises(ValueError, match="Unsupported file format"):
            extract_text(str(f))


# ── Feature 2: Resume Parsing & Candidate Profiling ───────────────────────────
class TestFeature2CandidateProfiling:
    def test_extract_candidate_profile_structure(self):
        entities = extract_entities(SAMPLE_RESUME_TEXT)
        profile = extract_candidate_profile(SAMPLE_RESUME_TEXT, entities=entities)

        # 1. Name & Contact
        assert profile["name"] == "Sarah Connor"
        assert profile["email"] == "sarah.connor@example.com"
        assert "555" in profile["phone"]

        # 2. Education (name, degrees, institutions)
        assert len(profile["education"]) >= 1
        edu_degrees = [e["degree"].lower() for e in profile["education"]]
        assert any("master" in d or "bachelor" in d for d in edu_degrees)

        # 3. Skills
        assert "Python" in profile["skills"] or "python" in [s.lower() for s in profile["skills"]]
        assert len(profile["skills_by_category"]) > 0

        # 4. Experience (job titles, companies, durations)
        assert len(profile["experience"]) >= 1
        exp_titles = [e["title"].lower() for e in profile["experience"]]
        assert any("engineer" in t or "developer" in t for t in exp_titles)

        # 5. Projects (names, tech stack, descriptions)
        assert len(profile["projects"]) >= 1
        proj_names = [p["name"].lower() for p in profile["projects"]]
        assert any("hireflow" in p or "platform" in p or "telemetry" in p for p in proj_names)

        # 6. Certifications (credentials, issuers)
        assert len(profile["certifications"]) >= 1
        cert_names = [c["name"].lower() for c in profile["certifications"]]
        assert any("aws" in c or "deep learning" in c or "solutions" in c for c in cert_names)


# ── Feature 3: Candidate-Job Matching & Hiring Scores ─────────────────────────
class TestFeature3CandidateJobMatching:
    def test_skill_overlap_and_matching(self, db, sample_job):
        cand = Candidate(
            id="cand-matching-test-1",
            name="Sarah Connor",
            email="sarah.match@test.com",
            skills_json=json.dumps(["Python", "PyTorch", "Transformers", "Distributed Systems", "MLOps"]),
            raw_text=SAMPLE_RESUME_TEXT
        )
        db.add(cand)
        db.commit()

        # Job requires ["Python", "PyTorch", "Transformers", "Distributed Systems", "MLOps"]
        job_skills = sample_job.required_skills
        cand_skills = cand.skills

        matched = [s for s in job_skills if any(skill_matches(cs, s) for cs in cand_skills)]
        missing = [s for s in job_skills if not any(skill_matches(cs, s) for cs in cand_skills)]
        match_score = round((len(matched) / len(job_skills)) * 100, 1)

        assert len(matched) >= 3
        assert match_score >= 60.0
        assert "Python" in matched or "python" in [m.lower() for m in matched]


# ── Feature 4: Skill-Gap Analysis & ATS Candidate Management ───────────────────
class TestFeature4SkillGapAndATS:
    def test_skill_gap_analysis(self, sample_job):
        cand_skills = ["React", "JavaScript", "CSS"]
        job_skills = ["Python", "FastAPI", "React", "Docker"]

        matched = [js for js in job_skills if any(skill_matches(cs, js) for cs in cand_skills)]
        missing = [js for js in job_skills if not any(skill_matches(cs, js) for cs in cand_skills)]

        assert "React" in matched
        assert "Python" in missing
        assert "FastAPI" in missing

    def test_ats_status_tracking_and_history(self, db, sample_job):
        provider = MockATSProvider()
        created = provider.create_candidate({
            "name": "Alex Vance",
            "email": "alex.vance@ats-flow.com",
            "status": "Applied",
            "job_id": sample_job.id
        }, db)

        cand_id = created["id"]
        assert created["current_status"] == "Applied"

        # Update stage to Screened
        res1 = provider.update_candidate_status(cand_id, "Screened", changed_by="AI Screener", notes="Voice screening cleared", db=db)
        assert res1["current_status"] == "Screened"

        # Update stage to Interviewed
        res2 = provider.update_candidate_status(cand_id, "Interviewed", changed_by="HR Lead", notes="Technical simulation passed", db=db)
        assert res2["current_status"] == "Interviewed"

        # Check history audit trail
        history = provider.get_candidate_history(cand_id, db)
        assert len(history) >= 2
        logged_statuses = [h["to_status"] for h in history]
        assert "Screened" in logged_statuses
        assert "Interviewed" in logged_statuses


# ── Feature 5: Role-Specific Questions (MCQ & Descriptive) ────────────────────
class TestFeature5RoleSpecificQuestions:
    def test_generate_interview_questions_breakdown(self):
        res = generate_interview_questions(
            job_title="Senior Backend Engineer",
            required_skills=["Python", "PostgreSQL", "System Design"],
            interview_type="mixed",
            num_questions=5,
            technical_count=2,
            behavioral_count=1,
            situational_count=1,
            hr_count=1
        )

        assert res["job_role"] == "Senior Backend Engineer"
        assert len(res["questions"]) == 5

        types = [q.get("type") for q in res["questions"]]
        assert "technical" in types
        assert "behavioral" in types
        assert "situational" in types
        assert "hr" in types

        # Check MCQ fields exist
        for q in res["questions"]:
            assert "options" in q
            assert len(q["options"]) == 4
            assert "correct_option" in q
            assert "explanation" in q


# ── Feature 6: AI Interview Simulation & Answer Evaluation ─────────────────────
class TestFeature6InterviewSimulation:
    def test_simulation_lifecycle_and_evaluation(self, db, sample_job):
        cand = Candidate(
            id="cand-sim-feature-6",
            name="Elena Gilbert",
            email="elena.sim@test.com",
            skills_json=json.dumps(["Python", "FastAPI", "Docker"]),
            raw_text=SAMPLE_RESUME_TEXT
        )
        db.add(cand)
        db.commit()

        # Start simulation session
        session_info = start_simulation(
            candidate_id=cand.id,
            job_id=sample_job.id,
            num_questions=2,
            db=db
        )
        session_id = session_info["session_id"]
        assert session_info["status"] == "in_progress"
        assert session_info["question_count"] == 2

        # Submit answer to question 0
        ans_0 = submit_candidate_answer(
            session_id=session_id,
            question_index=0,
            answer_text="Option B: Correct optimized architectural solution",
            db=db
        )
        assert ans_0["status"] == "in_progress"
        assert "evaluation_preview" in ans_0
        assert "feedback" in ans_0["evaluation_preview"]

        # Submit answer to question 1 (completes simulation)
        ans_1 = submit_candidate_answer(
            session_id=session_id,
            question_index=1,
            answer_text="Option B",
            db=db
        )
        assert ans_1["status"] == "completed"
        assert "overall_score" in ans_1
        assert "summary_report" in ans_1
        assert "strengths" in ans_1["summary_report"]
        assert "improvement_areas" in ans_1["summary_report"]


# ── Feature 7: Recruitment Analytics (Streamlit) & Voice Screening ────────────
class TestFeature7AnalyticsAndVoiceScreening:
    def test_streamlit_script_exists_and_loads(self):
        streamlit_path = os.path.join(os.path.dirname(__file__), "..", "..", "streamlit_app.py")
        assert os.path.exists(streamlit_path), "streamlit_app.py must exist in project root"
        with open(streamlit_path, "r", encoding="utf-8") as f:
            code = f.read()
        assert "st.set_page_config" in code
        assert "Executive KPIs" in code
        assert "5-Dimensional Assessment Rubric" in code

    def test_voice_screening_rubric_and_lifecycle(self, db, sample_job):
        cand = Candidate(
            id="cand-voice-feature-7",
            name="Morgan Reed",
            email="morgan.voice@test.com",
            skills_json=json.dumps(["Python", "Kubernetes", "AWS"]),
            raw_text=SAMPLE_RESUME_TEXT
        )
        db.add(cand)
        db.commit()

        # 1. Generate oral questions
        questions = generate_voice_screening_questions(cand, sample_job, num_questions=2)
        assert len(questions) == 2
        assert "question" in questions[0]
        assert "expected_focus" in questions[0]

        # 2. Evaluate candidate oral response across 5 dimensions
        eval_resp = evaluate_voice_response(
            question=questions[0]["question"],
            candidate_response="We designed our microservices using FastAPI, Redis caching, and async workers to keep latency under 50ms.",
            skill=questions[0]["skill"],
            expected_focus=questions[0]["expected_focus"],
            job_title=sample_job.title
        )
        assert eval_resp["score"] > 0
        assert "technical_accuracy" in eval_resp
        assert "relevance" in eval_resp
        assert "communication" in eval_resp
        assert "completeness" in eval_resp
        assert "role_knowledge" in eval_resp
        assert len(eval_resp["strengths"]) > 0

        # 3. Create session and finalize assessment
        v_sess = VoiceScreeningSession(
            id="v-sess-feature-7-test",
            candidate_id=cand.id,
            job_id=sample_job.id,
            status="in_progress",
            question_count=2,
            questions_json=json.dumps(questions)
        )
        db.add(v_sess)

        resp0 = VoiceScreeningResponse(
            id="v-resp-0",
            session_id=v_sess.id,
            question_index=0,
            question=questions[0]["question"],
            skill=questions[0]["skill"],
            candidate_response="FastAPI async workers with Redis caching.",
            score=eval_resp["score"],
            evaluation_json=json.dumps(eval_resp)
        )
        db.add(resp0)
        db.commit()

        final_result = finalize_voice_screening_assessment(v_sess, db)
        assert final_result["overall_score"] > 0
        assert final_result["recommendation"] in ["Proceed to Next Round", "Requires Further Review", "Do Not Proceed at This Stage"]

        # Check candidate ATS stage updated to Screened
        db.refresh(cand)
        assert cand.current_status == "Screened"
        assert cand.screening_score is not None
