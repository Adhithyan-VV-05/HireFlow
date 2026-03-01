import os
import uuid
import json
import sqlite3
from datetime import datetime
from app.core.auth import hash_password
from app.db.session import SessionLocal
from app.db.models import User, Candidate, Job, FaissMetadata

DB_PATH = "hireflow.db"

def clear_db():
    print("Clearing database...")
    if os.path.exists(DB_PATH):
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        tables = [
            "job_applications", "interviews", "aptitude_tests", "faiss_metadata", 
            "jobs", "candidates", "users"
        ]
        for table in tables:
            try:
                cursor.execute(f"DELETE FROM {table}")
                print(f"Cleared {table}")
            except Exception as e:
                print(f"Error clearing {table}: {e}")
        conn.commit()
        conn.close()
    else:
        print("Database file not found.")

def seed():
    db = SessionLocal()
    try:
        # 1. Create Recruiters (Role: interviewer)
        recruiters = [
            {
                "id": str(uuid.uuid4()),
                "name": "Alice Miller",
                "email": "alice@techflow.ai",
                "password": "password123",
                "role": "interviewer",
                "company": "TechFlow"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Bob Johnson",
                "email": "bob@cloudscale.io",
                "password": "password123",
                "role": "interviewer",
                "company": "CloudScale"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Charlie Brown",
                "email": "charlie@visionlabs.tech",
                "password": "password123",
                "role": "interviewer",
                "company": "VisionLabs"
            }
        ]

        for r in recruiters:
            user = User(
                id=r["id"],
                name=r["name"],
                email=r["email"],
                hashed_password=hash_password(r["password"]),
                role=r["role"],
                created_at=datetime.utcnow()
            )
            db.add(user)
        
        db.commit()
        print("Recruiters created.")

        # 2. Create Job Openings (2 per recruiter)
        job_data = [
            # Alice's Jobs
            {
                "title": "Senior Full Stack Developer",
                "owner_id": recruiters[0]["id"],
                "desc": "Join TechFlow to build next-gen AI recruitment platforms. Requires 5+ years experience in React, Node.js, and scaling high-traffic applications.",
                "skills": ["React", "Node.js", "MongoDB", "TypeScript", "AWS"],
                "deadline": "2026-04-01"
            },
            {
                "title": "Frontend Product Engineer",
                "owner_id": recruiters[0]["id"],
                "desc": "Focus on UX/UI implementation using modern frameworks. You will work closely with designers to build fluid, glassmorphic interfaces.",
                "skills": ["React", "CSS", "Figma", "Web Performance", "JavaScript"],
                "deadline": "2026-03-25"
            },
            # Bob's Jobs
            {
                "title": "Infrastructure Architect (DevOps)",
                "owner_id": recruiters[1]["id"],
                "desc": "Architect and manage our global Kubernetes clusters across multiple clouds. Expertise in Infrastructure as Code is essential.",
                "skills": ["Kubernetes", "Terraform", "Jenkins", "OCI", "Shell Scripting"],
                "deadline": "2026-05-15"
            },
            {
                "title": "Cloud Security Consultant",
                "owner_id": recruiters[1]["id"],
                "desc": "Ensure the security and compliance of our cloud assets. Conduct regular audits, penetration tests, and response drills.",
                "skills": ["Network Security", "Pentesting", "IAM", "Cloud Custodian", "ISO 27001"],
                "deadline": "2026-04-10"
            },
            # Charlie's Jobs
            {
                "title": "AI Infrastructure Lead (MLOps)",
                "owner_id": recruiters[2]["id"],
                "desc": "Lead the team responsible for training and deploying LLMs at scale. Manage GPU optimization and data pipelines.",
                "skills": ["Python", "MLflow", "Kubeflow", "PyTorch", "Kubernetes"],
                "deadline": "2026-05-01"
            },
            {
                "title": "Senior Backend Systems Engineer",
                "owner_id": recruiters[2]["id"],
                "desc": "Core engineering role focused on high-concurrency systems and low-latency API development using Go and Rust.",
                "skills": ["Go", "Rust", "Kafka", "PostgreSQL", "gRPC"],
                "deadline": "2026-04-20"
            }
        ]

        for j in job_data:
            job = Job(
                id=str(uuid.uuid4()),
                owner_id=j["owner_id"],
                title=j["title"],
                description=j["desc"],
                required_skills_json=json.dumps(j["skills"]),
                deadline=datetime.fromisoformat(j["deadline"]),
                created_at=datetime.utcnow()
            )
            db.add(job)
        
        db.commit()
        print("Jobs created.")

        # 3. Create 10 Candidates
        candidates_data = [
            {"name": "Aarav Sharma", "email": "aarav@example.com", "domain": "Full Stack", "gender": "Male", "skills": ["React", "Node.js", "MongoDB", "Express", "TypeScript", "AWS", "Docker"]},
            {"name": "Isha Gupta", "email": "isha@example.com", "domain": "Cybersecurity", "gender": "Female", "skills": ["Penetration Testing", "Kali Linux", "Wireshark", "Metasploit", "Cryptography", "Network Security"]},
            {"name": "Rohan Verma", "email": "rohan@example.com", "domain": "DevOps", "gender": "Male", "skills": ["Kubernetes", "Terraform", "CI/CD", "Jenkins", "Ansible", "Azure", "Prometheus"]},
            {"name": "Ananya Reddy", "email": "ananya@example.com", "domain": "MLOps", "gender": "Female", "skills": ["Python", "PyTorch", "MLflow", "Kubeflow", "Docker", "Scikit-learn", "SQL"]},
            {"name": "Karthik Nair", "email": "karthik@example.com", "domain": "Backend", "gender": "Male", "skills": ["Go", "PostgreSQL", "Redis", "gRPC", "Kafka", "Microservices"]},
            {"name": "Meera Patel", "email": "meera@example.com", "domain": "Data Analyst", "gender": "Female", "skills": ["Tableau", "Power BI", "Python", "SQL", "Statistics", "Excel", "Pandas"]},
            {"name": "Vikram Singh", "email": "vikram@example.com", "domain": "Mobile Dev", "gender": "Male", "skills": ["Flutter", "Dart", "Firebase", "iOS", "Android", "GraphQL"]},
            {"name": "Sarah Khan", "email": "sarah@example.com", "domain": "UI/UX Designer", "gender": "Female", "skills": ["Figma", "Adobe XD", "User Research", "Prototyping", "Wireframing", "CSS/SCSS"]},
            {"name": "Arjun Das", "email": "arjun@example.com", "domain": "QA Automation", "gender": "Male", "skills": ["Selenium", "Cypress", "Playwright", "PyTest", "Java", "JIRA"]},
            {"name": "Priya Iyer", "email": "priya@example.com", "domain": "System Admin", "gender": "Female", "skills": ["Linux", "Bash Scripting", "Nginx", "Apache", "Virtualization", "Backup & Recovery"]}
        ]

        for c in candidates_data:
            user_id = str(uuid.uuid4())
            cand_id = str(uuid.uuid4())
            
            # Create User for candidate
            user = User(
                id=user_id,
                name=c["name"],
                email=c["email"],
                hashed_password=hash_password("password123"),
                role="candidate",
                created_at=datetime.utcnow()
            )
            db.add(user)
            
            # Create Candidate Profile
            cand = Candidate(
                id=cand_id,
                user_id=user_id,
                name=c["name"],
                email=c["email"],
                skills=c["skills"],
                entities={"DOMAIN": [c["domain"]], "GENDER": [c["gender"]]},
                aptitude_scores={"Analytical": 0.85, "Communication": 0.90, "Technical": 0.88},
                created_at=datetime.utcnow()
            )
            db.add(cand)
            
            # Add FAISS Metadata so Search works (Required for index logic)
            chunk_text = f"Candidate Profile for {c['name']}. Domain: {c['domain']}. Skills: {', '.join(c['skills'])}."
            meta = FaissMetadata(
                candidate_id=cand_id,
                chunk_type="full_profile",
                chunk_text=chunk_text,
                metadata_json=json.dumps({"domain": c["domain"], "skills": c["skills"]})
            )
            db.add(meta)

        db.commit()
        print("Candidates created.")

    finally:
        db.close()

if __name__ == "__main__":
    clear_db()
    seed()
    print("\n--- DATABASE SEEDED SUCCESSFULLY ---")
    print("Recruiters (interviewer role): alice@techflow.ai, bob@cloudscale.io, charlie@visionlabs.tech")
    print("Password for all users: password123")
