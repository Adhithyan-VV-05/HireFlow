"""Resume processing pipeline: parse → NER → chunk → embed → store → index."""

import os
import re
import json
import uuid
import numpy as np
from datetime import datetime
from typing import Optional

from app.config import UPLOAD_DIR
from app.db import Candidate, FaissMetadata
from app.core.parsing import extract_text
from app.core.ner import extract_entities
from app.core.chunking import split_sections
from app.core.embedding import embed_chunks
from app.core.index import add_vectors, save as save_index
from app.core.search import add_to_bm25
from app.core.llm_utils import evaluate_aptitude_with_llm


def _compute_aptitude_scores(skills: list, text: str) -> dict:
    """Wrapper for LLM aptitude evaluation to be used by the pipeline and import scripts."""
    return evaluate_aptitude_with_llm(skills, text)


def process_resume(file_content: bytes, filename: str, db_session, existing_candidate_id: Optional[str] = None) -> dict:
    """Run the full resume processing pipeline.

    Args:
        file_content: Raw file bytes.
        filename: Original filename.
        db_session: SQLAlchemy session.
        existing_candidate_id: Optional ID of candidate to update.

    Returns:
        Dict with candidate details and processing results.
    """
    ext = os.path.splitext(filename)[1].lower()

    # Save file to disk
    temp_id = str(uuid.uuid4())
    saved_filename = f"{temp_id}{ext}"
    filepath = os.path.join(UPLOAD_DIR, saved_filename)

    with open(filepath, "wb") as f:
        f.write(file_content)

    # Layer 1: Parse
    text = extract_text(filepath)
    if not text.strip():
        raise ValueError("Could not extract text from the uploaded file")

    # Layer 2: NER
    entities = extract_entities(text)
    skills = entities.get("SKILL", [])

    # Layer 3: Chunk
    chunks = split_sections(text, entities)

    # Layer 4: Embed
    embeddings = embed_chunks(chunks)

    # Extract candidate info
    name = _extract_name(text)
    email = _extract_email(text)

    # Calculate initial aptitude scores
    aptitude_scores = _compute_aptitude_scores(skills[:10], text)

    # Store candidate in SQLite
    candidate_id = existing_candidate_id or temp_id
    
    if existing_candidate_id:
        candidate = db_session.query(Candidate).filter(Candidate.id == candidate_id).first()
        if candidate:
            candidate.name = name
            candidate.email = email
            candidate.skills_json = json.dumps(skills)
            candidate.entities_json = json.dumps(entities)
            candidate.aptitude_scores_json = json.dumps(aptitude_scores)
            candidate.raw_text = text
            # candidate.created_at = datetime.utcnow() # Keep original join date?
        else:
            # Fallback if ID not found
            candidate_id = temp_id
            candidate = Candidate(
                id=candidate_id,
                name=name,
                email=email,
                skills_json=json.dumps(skills),
                entities_json=json.dumps(entities),
                aptitude_scores_json=json.dumps(aptitude_scores),
                raw_text=text,
                created_at=datetime.utcnow(),
            )
            db_session.add(candidate)
    else:
        candidate = Candidate(
            id=candidate_id,
            name=name,
            email=email,
            skills_json=json.dumps(skills),
            entities_json=json.dumps(entities),
            aptitude_scores_json=json.dumps(aptitude_scores),
            raw_text=text,
            created_at=datetime.utcnow(),
        )
        db_session.add(candidate)

    # Layer 5: Store in FAISS
    bm25_texts = []
    bm25_ids = []

    for chunk_type, embedding in embeddings.items():
        chunk_text = chunks.get(chunk_type, "")

        start_id = add_vectors(embedding.reshape(1, -1))

        metadata = {
            "skills_tags": skills,
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
        db_session.add(meta)

        bm25_texts.append(chunk_text)
        bm25_ids.append((candidate_id, chunk_type))

    db_session.commit()
    save_index()

    # Update BM25
    if bm25_texts:
        add_to_bm25(bm25_texts, bm25_ids)

    return {
        "candidate_id": candidate_id,
        "name": name,
        "email": email,
        "skills": skills,
        "job_titles": entities.get("JOB_TITLE", []),
        "entities": entities,
        "chunk_lengths": {k: len(v) for k, v in chunks.items()},
        "aptitude_scores": aptitude_scores,
        "file_name": filename,
        "file_path": filepath,
    }


def _extract_name(text: str) -> str:
    """Extract name from the first few lines of resume text."""
    lines = text.split("\n")
    for line in lines[:5]:
        stripped = line.strip()
        if stripped and len(stripped) < 60 and not any(c.isdigit() for c in stripped[:3]):
            return stripped
    return ""


def _extract_email(text: str) -> str:
    """Extract email address from text."""
    email_match = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', text)
    return email_match.group() if email_match else ""


