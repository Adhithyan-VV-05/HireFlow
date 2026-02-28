
import sqlite3
import os

db_path = "hireflow.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if interviewer_id exists
    cursor.execute("PRAGMA table_info(interviews)")
    columns = [row[1] for row in cursor.fetchall()]
    
    if "interviewer_id" not in columns:
        print("Adding interviewer_id to interviews table...")
        cursor.execute("ALTER TABLE interviews ADD COLUMN interviewer_id TEXT")
        conn.commit()
    else:
        print("interviewer_id already exists.")
        
    conn.close()
else:
    print("Database not found.")
