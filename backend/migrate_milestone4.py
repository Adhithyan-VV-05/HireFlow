"""Database migration for Milestone 4 (Dashboard & Voice Screening)."""

import sqlite3
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(BASE_DIR, "hireflow.db")

print(f"[Migration M4] Checking database at {db_path}...")
if not os.path.exists(db_path):
    print("[Migration M4] Database does not exist yet; will be initialized on app startup.")
    sys.exit(0)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Update candidates table with screening columns and hired_at
cursor.execute("PRAGMA table_info(candidates)")
columns = [row[1] for row in cursor.fetchall()]

if "screening_score" not in columns:
    print("[Migration M4] Adding 'screening_score' to candidates...")
    cursor.execute("ALTER TABLE candidates ADD COLUMN screening_score REAL")

if "screening_summary" not in columns:
    print("[Migration M4] Adding 'screening_summary' to candidates...")
    cursor.execute("ALTER TABLE candidates ADD COLUMN screening_summary TEXT")

if "screening_recommendation" not in columns:
    print("[Migration M4] Adding 'screening_recommendation' to candidates...")
    cursor.execute("ALTER TABLE candidates ADD COLUMN screening_recommendation TEXT")

if "hired_at" not in columns:
    print("[Migration M4] Adding 'hired_at' to candidates...")
    cursor.execute("ALTER TABLE candidates ADD COLUMN hired_at DATETIME")

conn.commit()

# 2. Create voice_screening_sessions table
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='voice_screening_sessions'")
if not cursor.fetchone():
    print("[Migration M4] Creating 'voice_screening_sessions' table...")
    cursor.execute("""
        CREATE TABLE voice_screening_sessions (
            id TEXT PRIMARY KEY,
            candidate_id TEXT NOT NULL,
            job_id TEXT,
            interviewer_id TEXT,
            status TEXT DEFAULT 'ready',
            question_count INTEGER DEFAULT 3,
            current_question_index INTEGER DEFAULT 0,
            questions_json TEXT DEFAULT '[]',
            overall_score REAL DEFAULT 0.0,
            technical_score REAL DEFAULT 0.0,
            communication_score REAL DEFAULT 0.0,
            relevance_score REAL DEFAULT 0.0,
            completeness_score REAL DEFAULT 0.0,
            role_knowledge_score REAL DEFAULT 0.0,
            recommendation TEXT DEFAULT '',
            summary_report_json TEXT DEFAULT '{}',
            duration_seconds INTEGER DEFAULT 0,
            audio_stored BOOLEAN DEFAULT 0,
            started_at DATETIME,
            completed_at DATETIME,
            created_at DATETIME,
            FOREIGN KEY (candidate_id) REFERENCES candidates (id),
            FOREIGN KEY (job_id) REFERENCES jobs (id),
            FOREIGN KEY (interviewer_id) REFERENCES users (id)
        )
    """)
    conn.commit()

# 3. Create voice_screening_responses table
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='voice_screening_responses'")
if not cursor.fetchone():
    print("[Migration M4] Creating 'voice_screening_responses' table...")
    cursor.execute("""
        CREATE TABLE voice_screening_responses (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            question_index INTEGER NOT NULL,
            question TEXT NOT NULL,
            question_type TEXT DEFAULT 'technical',
            skill TEXT DEFAULT '',
            candidate_response TEXT DEFAULT '',
            duration_seconds REAL DEFAULT 0.0,
            score REAL DEFAULT 0.0,
            evaluation_json TEXT DEFAULT '{}',
            submitted_at DATETIME,
            FOREIGN KEY (session_id) REFERENCES voice_screening_sessions (id)
        )
    """)
    conn.commit()

# 4. Create user_feedbacks table
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_feedbacks'")
if not cursor.fetchone():
    print("[Migration M4] Creating 'user_feedbacks' table...")
    cursor.execute("""
        CREATE TABLE user_feedbacks (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            user_role TEXT DEFAULT 'recruiter',
            rating INTEGER NOT NULL,
            feedback_text TEXT DEFAULT '',
            feature TEXT DEFAULT 'recruitment_dashboard',
            created_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    conn.commit()

conn.close()
print("[Migration M4] Migration successfully applied!")
