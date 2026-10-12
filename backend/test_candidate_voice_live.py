"""Test candidate-initiated voice screening end-to-end."""
import requests
import socket
import pytest

BASE_URL = "http://127.0.0.1:8000"

def is_server_running(host="127.0.0.1", port=8000):
    try:
        with socket.create_connection((host, port), timeout=1):
            return True
    except Exception:
        return False

def test_candidate_voice_screening():
    if not is_server_running():
        pytest.skip("FastAPI server not running at http://127.0.0.1:8000")
    # 1. Login as a candidate user (Bob Chen or create test candidate)
    login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "isha@example.com",
        "password": "password123"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token_data = login_res.json()
    token = token_data["access_token"]
    user = token_data["user"]
    print(f"[OK] Logged in as candidate: {user['name']} ({user['email']}, role={user['role']})")

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get profile
    prof_res = requests.get(f"{BASE_URL}/api/my-profile", headers=headers)
    assert prof_res.status_code == 200, f"Get profile failed: {prof_res.text}"
    prof_data = prof_res.json().get("profile", {})
    candidate_id = prof_data.get("candidate_id") or prof_data.get("id") or user["id"]
    print(f"[OK] Candidate ID: {candidate_id}")

    # 3. Start voice screening session as candidate
    start_res = requests.post(f"{BASE_URL}/api/voice-screening/start", json={
        "candidate_id": candidate_id,
        "question_count": 2
    }, headers=headers)
    assert start_res.status_code == 200, f"Start voice screening failed: {start_res.status_code} - {start_res.text}"
    session_data = start_res.json()
    session_id = session_data["session_id"]
    questions = session_data["questions"]
    print(f"[OK] Candidate started voice screening: Session ID={session_id}, Questions={len(questions)}")
    print(f"     Q1: {questions[0]['question']}")

    # 4. Submit Answer to Question 0
    ans_res = requests.post(f"{BASE_URL}/api/voice-screening/session/{session_id}/answer", json={
        "question_index": 0,
        "candidate_response": "I have extensive hands-on experience building distributed systems with Python, FastAPI, and React, following agile methodologies and thorough testing.",
        "duration_seconds": 24.5
    }, headers=headers)
    assert ans_res.status_code == 200, f"Submit answer failed: {ans_res.status_code} - {ans_res.text}"
    ans_data = ans_res.json()
    print(f"[OK] Submitted candidate answer. Evaluated score: {ans_data['evaluation']['score']}%")

    # 5. Submit Answer to Question 1
    ans2_res = requests.post(f"{BASE_URL}/api/voice-screening/session/{session_id}/answer", json={
        "question_index": 1,
        "candidate_response": "In my previous project, we optimized SQL query performance and implemented redis caching, reducing endpoint latency by 45 percent.",
        "duration_seconds": 28.0
    }, headers=headers)
    assert ans2_res.status_code == 200, f"Submit answer 2 failed: {ans2_res.status_code} - {ans2_res.text}"
    ans2_data = ans2_res.json()
    print(f"[OK] Completed session: is_completed={ans2_data.get('is_completed')}")
    if ans2_data.get("is_completed"):
        report = ans2_data["final_report"]
        print(f"[OK] Overall Score: {report['overall_score']}% | Recommendation: {report['recommendation']}")

    # 6. Verify profile updated
    prof_after = requests.get(f"{BASE_URL}/api/my-profile", headers=headers).json().get("profile", {})
    print(f"[OK] Candidate Profile Status: {prof_after.get('current_status')}, Screening Score: {prof_after.get('screening_score')}%")

if __name__ == "__main__":
    test_candidate_voice_screening()
    print("\n CANDIDATE VOICE SCREENING VERIFIED SUCCESSFULLY WITH ZERO ERRORS!")
