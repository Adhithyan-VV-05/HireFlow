
import sqlite3
import os

db_path = "hireflow.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("Clearing all records from the 'interviews' table...")
    cursor.execute("DELETE FROM interviews")
    conn.commit()
    
    print("Cleanup complete.")
    conn.close()
else:
    print("Database not found.")
