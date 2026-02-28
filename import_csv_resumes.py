#!/usr/bin/env python3
"""
import_csv_resumes.py — Bulk import resume_data.csv into HireFlow AI database.

Usage:
  # Import first 100 rows (safe test run)
  uv run python import_csv_resumes.py --limit 100

  # Import rows 100-500
  uv run python import_csv_resumes.py --offset 100 --limit 400

  # Import everything (will take a long time for 200k+ rows)
  uv run python import_csv_resumes.py

  # Use a different CSV file
  uv run python import_csv_resumes.py --csv path/to/other.csv

The script:
  1. Reads each row of the CSV
  2. Reconstructs a plain-text resume from the structured columns
  3. Runs NER (entity extraction) and skill keyword matching
  4. Chunks and embeds the resume text
  5. Stores the Candidate record + FAISS vectors in the database
  6. Skips rows that have already been imported (idempotent via email dedup)
"""

import argparse
import ast
import csv
import hashlib
import json
import os
import sys
import uuid
from datetime import datetime
from pathlib import Path

# ── Path setup so we can import the backend app ──────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))
os.chdir(BACKEND_DIR)

# Load .env manually before importing app modules
from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")


# ── Imports from the app (after path/env setup) ───────────────────────────────
from app.db.session import SessionLocal, engine, Base
from app.db.models import Candidate, FaissMetadata


def _safe_parse_list(raw: str) -> list[str]:
    """Parse a Python-style list string like ['a', 'b'] into a real list.
    Returns [] on any error."""
    if not raw or raw.strip() in ("", "None", "[]"):
        return []
    try:
        val = ast.literal_eval(raw.strip())
        if isinstance(val, list):
            return [str(v).strip() for v in val if v and str(v).strip() not in ("None", "")]
        return [str(val).strip()]
    except Exception:
        # Fallback: treat comma-separated plain text
        return [s.strip() for s in raw.strip("[]'\"").split(",") if s.strip()]


def _build_resume_text(row: dict) -> str:
    """Reconstruct a readable resume plain-text from a CSV row."""
    parts = []

    objective = row.get("career_objective", "").strip()
    if objective:
        parts.append(f"Career Objective\n{objective}")

    skills = _safe_parse_list(row.get("skills", ""))
    if skills:
        parts.append(f"Skills\n{', '.join(skills)}")

    positions = _safe_parse_list(row.get("positions", ""))
    companies = _safe_parse_list(row.get("professional_company_names", ""))
    start_dates = _safe_parse_list(row.get("start_dates", ""))
    end_dates = _safe_parse_list(row.get("end_dates", ""))
    responsibilities = row.get("responsibilities", "").strip()

    if positions or companies:
        exp_lines = ["Work Experience"]
        for i in range(max(len(positions), len(companies))):
            pos = positions[i] if i < len(positions) else ""
            co = companies[i] if i < len(companies) else ""
            start = start_dates[i] if i < len(start_dates) else ""
            end = end_dates[i] if i < len(end_dates) else ""
            line = f"  {pos}" + (f" at {co}" if co else "") + (f" ({start} – {end})" if start else "")
            exp_lines.append(line)
        if responsibilities:
            exp_lines.append(f"  Responsibilities: {responsibilities[:500]}")
        parts.append("\n".join(exp_lines))

    edu_institution = _safe_parse_list(row.get("educational_institution_name", ""))
    degrees = _safe_parse_list(row.get("degree_names", ""))
    major = _safe_parse_list(row.get("major_field_of_studies", ""))
    passing = _safe_parse_list(row.get("passing_years", ""))

    if edu_institution or degrees:
        edu_lines = ["Education"]
        for i in range(max(len(edu_institution), len(degrees))):
            inst = edu_institution[i] if i < len(edu_institution) else ""
            deg = degrees[i] if i < len(degrees) else ""
            maj = major[i] if i < len(major) else ""
            yr = passing[i] if i < len(passing) else ""
            line = f"  {deg}" + (f" in {maj}" if maj else "") + (f" from {inst}" if inst else "") + (f" ({yr})" if yr else "")
            edu_lines.append(line)
        parts.append("\n".join(edu_lines))

    cert_skills = _safe_parse_list(row.get("certification_skills", ""))
    cert_providers = _safe_parse_list(row.get("certification_providers", ""))
    if cert_skills:
        cert_line = "Certifications\n  " + ", ".join(
            f"{s}" + (f" ({cert_providers[i]})" if i < len(cert_providers) else "")
            for i, s in enumerate(cert_skills)
        )
        parts.append(cert_line)

    languages = _safe_parse_list(row.get("languages", ""))
    if languages:
        parts.append(f"Languages\n  {', '.join(languages)}")

    location = row.get("locations", "").strip()
    if location and location not in ("None", "[]"):
        locs = _safe_parse_list(location)
        if locs:
            parts.append(f"Location\n  {', '.join(locs)}")

    return "\n\n".join(parts)


def _make_candidate_name(row: dict, idx: int) -> str:
    """Generate a candidate name (CSV usually doesn't include real names)."""
    pos = _safe_parse_list(row.get("positions", ""))
    if pos:
        return f"Candidate {idx + 1} ({pos[0][:30]})"
    return f"Candidate {idx + 1}"


def _make_email(row: dict, idx: int) -> str:
    """Generate a unique deterministic email per row."""
    objective = row.get("career_objective", "")
    skills = row.get("skills", "")
    fingerprint = hashlib.md5(f"{idx}:{objective[:80]}:{skills[:80]}".encode()).hexdigest()[:10]
    return f"csv_{fingerprint}@import.hireflow"


def load_models():
    """Load NER + embedding models (done once)."""
    from app.services.ml_models import load_all_models
    load_all_models()
    print("[Import] ML models loaded.")


def process_row(row: dict, idx: int, db) -> bool:
    """Process a single CSV row into a Candidate record.
    Returns True if inserted, False if skipped (duplicate)."""
    from app.core.ner import extract_entities
    from app.core.chunking import split_sections
    from app.core.embedding import embed_chunks
    from app.core.index import add_vectors, save as save_index
    from app.core.search import add_to_bm25
    from app.services.pipeline import _compute_aptitude_scores

    email = _make_email(row, idx)
    name = _make_candidate_name(row, idx)

    # Idempotency: skip if already in DB
    existing = db.query(Candidate).filter(Candidate.email == email).first()
    if existing:
        return False

    resume_text = _build_resume_text(row)
    if not resume_text.strip():
        return False

    candidate_id = str(uuid.uuid4())

    # ── NER ──────────────────────────────────────────────────────────────────
    try:
        entities = extract_entities(resume_text)
    except Exception as e:
        print(f"  [warn] NER failed for row {idx}: {e}")
        entities = {"SKILL": [], "JOB_TITLE": [], "COMPANY": [], "DATE": [], "EDUCATION": [], "LOCATION": []}

    # Enrich skills from the structured CSV column (more reliable than NER alone)
    csv_skills = _safe_parse_list(row.get("skills", ""))
    all_skills = list(dict.fromkeys(entities.get("SKILL", []) + csv_skills))  # dedup, preserve order
    entities["SKILL"] = all_skills

    # Enrich JOB_TITLE from positions column
    csv_positions = _safe_parse_list(row.get("positions", ""))
    existing_jt = set(jt.lower() for jt in entities.get("JOB_TITLE", []))
    for p in csv_positions:
        if p.lower() not in existing_jt:
            entities["JOB_TITLE"].append(p)
            existing_jt.add(p.lower())

    # ── Chunk + Embed ─────────────────────────────────────────────────────────
    try:
        chunks = split_sections(resume_text, entities)
        embeddings = embed_chunks(chunks)
    except Exception as e:
        print(f"  [warn] Chunk/embed failed for row {idx}: {e}")
        return False

    # ── Store Candidate ───────────────────────────────────────────────────────
    candidate = Candidate(
        id=candidate_id,
        user_id=None,  # CSV imports have no associated user account
        name=name,
        email=email,
        skills_json=json.dumps(all_skills),
        entities_json=json.dumps(entities),
        raw_text=resume_text[:5000],  # cap to avoid huge DB rows
        created_at=datetime.utcnow(),
    )
    db.add(candidate)

    # ── Store FAISS vectors ───────────────────────────────────────────────────
    aptitude_scores = _compute_aptitude_scores(all_skills[:10], resume_text)
    bm25_texts, bm25_ids = [], []

    for chunk_type, embedding in embeddings.items():
        chunk_text = chunks.get(chunk_type, "")
        start_id = add_vectors(embedding.reshape(1, -1))

        metadata = {
            "skills_tags": all_skills,
            "years_exp": 0,
            "seniority": "unknown",
            "aptitude_scores": aptitude_scores,
        }
        meta = FaissMetadata(
            vector_id=start_id,
            candidate_id=candidate_id,
            chunk_type=chunk_type,
            chunk_text=chunk_text,
            metadata_json=json.dumps(metadata),
        )
        db.add(meta)
        bm25_texts.append(chunk_text)
        bm25_ids.append((candidate_id, chunk_type))

    db.commit()
    save_index()
    if bm25_texts:
        add_to_bm25(bm25_texts, bm25_ids)

    return True


def main():
    parser = argparse.ArgumentParser(description="Bulk import resume_data.csv into HireFlow AI DB")
    parser.add_argument("--csv", default=str(SCRIPT_DIR / "resume_data.csv"), help="Path to CSV file")
    parser.add_argument("--limit", type=int, default=None, help="Max rows to import (default: all)")
    parser.add_argument("--offset", type=int, default=0, help="Skip first N rows")
    parser.add_argument("--batch-size", type=int, default=50, help="Commit and save index every N rows")
    args = parser.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"[Error] CSV not found: {csv_path}")
        sys.exit(1)

    print(f"[Import] Loading ML models...")
    load_models()

    print(f"[Import] Opening: {csv_path}")
    print(f"[Import] offset={args.offset}, limit={args.limit or 'all'}, batch_size={args.batch_size}")

    db = SessionLocal()
    inserted = 0
    skipped = 0
    errors = 0

    try:
        with open(csv_path, encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for global_idx, row in enumerate(reader):
                if global_idx < args.offset:
                    continue
                local_idx = global_idx - args.offset
                if args.limit is not None and local_idx >= args.limit:
                    break

                try:
                    result = process_row(row, global_idx, db)
                    if result:
                        inserted += 1
                    else:
                        skipped += 1
                except Exception as e:
                    errors += 1
                    print(f"  [error] Row {global_idx}: {e}")

                if (local_idx + 1) % args.batch_size == 0:
                    print(f"  [progress] Processed {local_idx + 1} rows | "
                          f"inserted={inserted} skipped={skipped} errors={errors}")

    finally:
        db.close()

    print(f"\n[Import] Done!")
    print(f"  Inserted : {inserted}")
    print(f"  Skipped  : {skipped}  (already in DB)")
    print(f"  Errors   : {errors}")


if __name__ == "__main__":
    main()
