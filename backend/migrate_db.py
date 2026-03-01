
import sqlite3
import os

db_path = "hireflow.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. interviews table migrations
    cursor.execute("PRAGMA table_info(interviews)")
    columns = [row[1] for row in cursor.fetchall()]
    if "interviewer_id" not in columns:
        print("Adding interviewer_id to interviews table...")
        cursor.execute("ALTER TABLE interviews ADD COLUMN interviewer_id TEXT")
        conn.commit()

    # 2. jobs table migrations
    cursor.execute("PRAGMA table_info(jobs)")
    job_columns = [row[1] for row in cursor.fetchall()]
    if "deadline" not in job_columns:
        print("Adding deadline to jobs table...")
        cursor.execute("ALTER TABLE jobs ADD COLUMN deadline DATETIME")
        conn.commit()

    # 3. job_applications table migrations
    cursor.execute("PRAGMA table_info(job_applications)")
    app_columns = [row[1] for row in cursor.fetchall()]
    if "portfolio_url" not in app_columns:
        print("Adding portfolio_url to job_applications table...")
        cursor.execute("ALTER TABLE job_applications ADD COLUMN portfolio_url TEXT")
        conn.commit()
    if "start_date" not in app_columns:
        print("Adding start_date to job_applications table...")
        cursor.execute("ALTER TABLE job_applications ADD COLUMN start_date TEXT")
        conn.commit()
    if "applied_resume_id" not in app_columns:
        print("Adding applied_resume_id to job_applications table...")
        cursor.execute("ALTER TABLE job_applications ADD COLUMN applied_resume_id TEXT")
        conn.commit()

    # 4. resumes table
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='resumes'")
    if not cursor.fetchone():
        print("Creating resumes table...")
        cursor.execute("""
            CREATE TABLE resumes (
                id TEXT PRIMARY KEY,
                candidate_id TEXT NOT NULL,
                file_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME,
                FOREIGN KEY (candidate_id) REFERENCES candidates (id)
            )
        """)
        conn.commit()

    print("Migration check complete.")
    conn.close()
else:
    print("Database not found.")
