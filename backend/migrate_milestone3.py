"""Database migration for Milestone 3 (ATS & Interview Simulation)."""

import sqlite3
import os
import sys

# Find database file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(BASE_DIR, "hireflow.db")

print(f"[Migration] Checking database at {db_path}...")
if not os.path.exists(db_path):
    print("[Migration] Database does not exist yet; will be initialized on app startup.")
    sys.exit(0)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Update candidates table with phone, source, current_status
cursor.execute("PRAGMA table_info(candidates)")
columns = [row[1] for row in cursor.fetchall()]

if "phone" not in columns:
    print("[Migration] Adding 'phone' to candidates...")
    cursor.execute("ALTER TABLE candidates ADD COLUMN phone TEXT DEFAULT ''")

if "source" not in columns:
    print("[Migration] Adding 'source' to candidates...")
    cursor.execute("ALTER TABLE candidates ADD COLUMN source TEXT DEFAULT 'Direct'")

if "current_status" not in columns:
    print("[Migration] Adding 'current_status' to candidates...")
    cursor.execute("ALTER TABLE candidates ADD COLUMN current_status TEXT DEFAULT 'Applied'")

conn.commit()

# 2. Create candidate_status_history table
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='candidate_status_history'")
if not cursor.fetchone():
    print("[Migration] Creating 'candidate_status_history' table...")
    cursor.execute("""
        CREATE TABLE candidate_status_history (
            id TEXT PRIMARY KEY,
            candidate_id TEXT NOT NULL,
            job_id TEXT,
            from_status TEXT,
            to_status TEXT NOT NULL,
            changed_by TEXT,
            notes TEXT,
            created_at DATETIME,
            FOREIGN KEY (candidate_id) REFERENCES candidates (id),
            FOREIGN KEY (job_id) REFERENCES jobs (id)
        )
    """)
    conn.commit()

# 3. Create interview_sessions table
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='interview_sessions'")
if not cursor.fetchone():
    print("[Migration] Creating 'interview_sessions' table...")
    cursor.execute("""
        CREATE TABLE interview_sessions (
            id TEXT PRIMARY KEY,
            candidate_id TEXT NOT NULL,
            job_id TEXT NOT NULL,
            interviewer_id TEXT,
            interview_type TEXT DEFAULT 'mixed',
            status TEXT DEFAULT 'in_progress',
            question_count INTEGER DEFAULT 5,
            current_question_index INTEGER DEFAULT 0,
            overall_score REAL DEFAULT 0.0,
            technical_score REAL DEFAULT 0.0,
            behavioral_score REAL DEFAULT 0.0,
            questions_json TEXT DEFAULT '[]',
            summary_report_json TEXT DEFAULT '{}',
            started_at DATETIME,
            completed_at DATETIME,
            created_at DATETIME,
            FOREIGN KEY (candidate_id) REFERENCES candidates (id),
            FOREIGN KEY (job_id) REFERENCES jobs (id),
            FOREIGN KEY (interviewer_id) REFERENCES users (id)
        )
    """)
    conn.commit()

# 4. Create interview_responses table
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='interview_responses'")
if not cursor.fetchone():
    print("[Migration] Creating 'interview_responses' table...")
    cursor.execute("""
        CREATE TABLE interview_responses (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            question_index INTEGER NOT NULL,
            question TEXT NOT NULL,
            question_type TEXT DEFAULT 'technical',
            difficulty TEXT DEFAULT 'intermediate',
            skill TEXT DEFAULT '',
            expected_focus_json TEXT DEFAULT '[]',
            candidate_answer TEXT DEFAULT '',
            score REAL DEFAULT 0.0,
            evaluation_json TEXT DEFAULT '{}',
            submitted_at DATETIME,
            FOREIGN KEY (session_id) REFERENCES interview_sessions (id)
        )
    """)
    conn.commit()

conn.close()
print("[Migration] Milestone 3 database migration complete successfully!")
