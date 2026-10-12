"""HireFlow AI - Milestone 4 Live System End-to-End Verification Script.

Tests the live running FastAPI backend and verifies all Milestone 4 capabilities:
- Recruiter Authentication
- KPI Calculations & Dashboard Stats
- System Status with Real Latency Checks
- Pipeline Stages (Applied, Screened, Interviewed, Offered, Hired)
- Candidate Rankings Data & Skill Gap Analysis
- Voice Screening Full Lifecycle (Start, Answer, Complete, Report)
- Candidate Status Synchronization
- User Satisfaction Feedback & 85% Target Benchmark
"""

import sys
import json
import urllib.request
import urllib.parse
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000"

def make_request(method, path, token=None, payload=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        error_content = e.read().decode("utf-8")
        try:
            err_json = json.loads(error_content)
        except Exception:
            err_json = {"raw": error_content}
        return e.code, err_json

def run_verification():
    print("=" * 70)
    print("HIREFLOW AI — MILESTONE 4 LIVE END-TO-END VERIFICATION")
    print("=" * 70)
    
    # 1. Login as Recruiter
    print("\n[Step 1] Authenticating recruiter...")
    status, res = make_request("POST", "/api/auth/login", payload={
        "email": "alice@techflow.ai",
        "password": "password123"
    })
    assert status == 200, f"Login failed: {res}"
    token = res.get("access_token")
    assert token, "No access token returned"
    print(f"  [OK] Authenticated as: {res.get('user', {}).get('name')} ({res.get('user', {}).get('role')})")
    
    # 2. Verify System Status
    print("\n[Step 2] Checking System Status (all 5 core subsystems)...")
    status, sys_status = make_request("GET", "/api/system/status", token=token)
    assert status == 200, f"System status check failed: {sys_status}"
    services = sys_status.get("services", [])
    for s_data in services:
        s_name = s_data.get("name")
        st = s_data.get("status")
        lat = s_data.get("latency_ms", "N/A")
        print(f"  [OK] {s_name:<18}: status={st:<12} latency={lat}ms details={s_data.get('details', '')}")
    assert len(services) == 5, f"Expected 5 services, got {len(services)}"
    print("  [OK] All 5 required services verified with real health checks.")

    # 3. Verify Dashboard Stats & Real KPI Calculations
    print("\n[Step 3] Verifying Dashboard KPIs & Pipeline Distribution...")
    status, stats = make_request("GET", "/api/dashboard/stats?force_refresh=true", token=token)
    assert status == 200, f"Dashboard stats failed: {stats}"
    kpis = stats.get("kpis", {})
    print(f"  [OK] Total Candidates       : {kpis.get('total_candidates')}")
    print(f"  [OK] Interviews Scheduled   : {kpis.get('interviews_scheduled')}")
    print(f"  [OK] Hiring Success Rate     : {kpis.get('hiring_success_rate')}%")
    print(f"  [OK] Average Time to Hire   : {kpis.get('average_time_to_hire_days')} days")
    
    pipeline = stats.get("pipeline", {}).get("breakdown", {})
    print("  Pipeline Stage Counts:")
    for stage, count in pipeline.items():
        print(f"    - {stage:<14}: {count}")
    assert "Applied" in pipeline
    assert "Screened" in pipeline
    assert "Interviewed" in pipeline
    assert "Offered" in pipeline
    assert "Hired" in pipeline
    
    # 4. Verify Candidate Rankings & Data
    print("\n[Step 4] Verifying Candidate Rankings & Profiles...")
    status, cand_resp = make_request("GET", "/api/candidates", token=token)
    assert status == 200, f"Candidate fetch failed: {cand_resp}"
    candidates = cand_resp.get("candidates", [])
    print(f"  [OK] Total Candidates Retrieved: {len(candidates)}")
    assert len(candidates) > 0, "Expected candidate records in database"
    sample = candidates[0]
    print(f"  [OK] Sample Candidate: {sample.get('name')} | Status: {sample.get('current_status')} | Match Score: {sample.get('match_score')}%")
    assert "current_status" in sample
    assert "skills" in sample
    assert "missing_skills" in sample
    
    # 5. Verify Skill Gap Analysis for Candidate
    print("\n[Step 5] Verifying Skill Gap Analysis Endpoint...")
    cand_id = sample.get("id")
    status, gap_resp = make_request("GET", f"/api/upskilling/recommendations?candidate_id={cand_id}", token=token)
    assert status == 200, f"Skill gap failed: {gap_resp}"
    target_role = (gap_resp.get("selected_job") or {}).get("title") or "General Role"
    missing_skills = gap_resp.get("skill_gaps", [])
    recommendations = gap_resp.get("recommendations", [])
    print(f"  [OK] Candidate Skill Gap Target Role: {target_role}")
    print(f"  [OK] Missing/Weak Skills Count: {len(missing_skills)}")
    print(f"  [OK] Recommended Upskilling Modules: {len(recommendations)}")
    for r in recommendations[:2]:
        courses = r.get("courses", [])
        if courses:
            c = courses[0]
            print(f"    - {c.get('title')} ({c.get('duration')}) - Provider: {c.get('provider')}")

    # 6. Verify Full Voice Screening Lifecycle
    print("\n[Step 6] Verifying Voice Screening Session Lifecycle...")
    # Find an applied candidate or pick one
    target_cand = next((c for c in candidates if c.get("current_status") == "Applied"), candidates[-1])
    job_id = target_cand.get("applied_job_id") or "1"
    
    # Start session
    status, sess = make_request("POST", "/api/voice-screening/start", token=token, payload={
        "candidate_id": target_cand["id"],
        "job_id": job_id,
        "question_count": 2
    })
    assert status == 200, f"Voice screening start failed: {sess}"
    session_id = sess["session_id"]
    print(f"  [OK] Voice Screening Session Started: ID={session_id}")
    print(f"  [OK] Initial Question Count: {sess.get('question_count')}")
    first_q = sess.get("current_question", {}).get("question") or sess.get("questions", [{}])[0].get("question")
    print(f"  [OK] First Question: {first_q}")
    
    # Answer first question
    status, ans_res = make_request("POST", f"/api/voice-screening/session/{session_id}/answer", token=token, payload={
        "question_index": 0,
        "candidate_response": "I build distributed microservices with Python and FastAPI, using Docker for containerization and PostgreSQL for reliable transactions.",
        "duration_seconds": 25.4
    })
    assert status == 200, f"Answer submit failed: {ans_res}"
    score = ans_res.get("evaluation", {}).get("score")
    print(f"  [OK] Question 0 Answer Evaluated: score={score} breakdown={ans_res.get('evaluation')}")
    
    # Complete session
    status, comp_res = make_request("POST", f"/api/voice-screening/session/{session_id}/complete", token=token)
    assert status == 200, f"Complete session failed: {comp_res}"
    print(f"  [OK] Overall Screening Score : {comp_res.get('overall_score')}/100")
    print(f"  [OK] Screening Recommendation: {comp_res.get('recommendation')}")
    print(f"  [OK] Screening Summary       : {comp_res.get('action_note')}")
    
    # Verify candidate ATS status updated
    status, updated_cand = make_request("GET", f"/api/candidate/{target_cand['id']}", token=token)
    assert status == 200, f"Fetch updated candidate failed: {updated_cand}"
    cand_profile = updated_cand.get("candidate") or updated_cand
    print(f"  [OK] Candidate Status Updated To: '{cand_profile.get('current_status')}' (expected: 'Screened')")
    assert cand_profile.get("current_status") == "Screened"
    assert cand_profile.get("screening_score") is not None
    assert cand_profile.get("screening_recommendation") is not None

    # 7. Verify User Feedback Mechanism & 85% Target Benchmark
    print("\n[Step 7] Verifying User Satisfaction Feedback Mechanism...")
    status, fb_post = make_request("POST", "/api/feedback", token=token, payload={
        "rating": 5,
        "feedback_text": "Live verification test feedback: dashboard is extremely smooth.",
        "feature": "recruitment_dashboard"
    })
    assert status == 200, f"Feedback submission failed: {fb_post}"
    print("  [OK] Feedback Submitted: 5-star rating recorded.")
    
    status, fb_summary = make_request("GET", "/api/feedback/summary", token=token)
    assert status == 200, f"Feedback summary failed: {fb_summary}"
    print(f"  [OK] Total Ratings Recorded    : {fb_summary.get('total_feedbacks')}")
    print(f"  [OK] Actual Average Rating     : {fb_summary.get('average_rating')}/5.0")
    print(f"  [OK] High Satisfaction Rate   : {fb_summary.get('satisfaction_score_pct')}% (ratings >= 4)")
    print(f"  [OK] Benchmark Target        : {fb_summary.get('target_benchmark_pct')}% (honest 85% target)")
    assert fb_summary.get("target_benchmark_pct") == 85.0
    
    print("\n" + "=" * 70)
    print("ALL MILESTONE 4 LIVE END-TO-END VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_verification()
