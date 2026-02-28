"""Resume section chunking.

Splits resume text into exactly four named chunks using regex-based
section header detection and heuristic fallbacks.
"""

import re
from typing import Dict


# Section header patterns (case-insensitive)
SECTION_PATTERNS = {
    "skills": [
        r'(?i)^[\s]*(?:technical\s+)?skills?\s*(?:&\s*(?:tools|technologies))?\s*[:|\-|–]?\s*$',
        r'(?i)^[\s]*(?:core\s+)?competenc(?:ies|e)\s*[:|\-|–]?\s*$',
        r'(?i)^[\s]*technologies?\s*(?:used)?\s*[:|\-|–]?\s*$',
        r'(?i)^[\s]*tools?\s*(?:&\s*technologies?)?\s*[:|\-|–]?\s*$',
        r'(?i)^[\s]*programming\s*(?:languages?)?\s*[:|\-|–]?\s*$',
    ],
    "experience": [
        r'(?i)^[\s]*(?:work\s+)?experience\s*[:|\-|–]?\s*$',
        r'(?i)^[\s]*(?:professional\s+)?experience\s*[:|\-|–]?\s*$',
        r'(?i)^[\s]*employment\s*(?:history)?\s*[:|\-|–]?\s*$',
        r'(?i)^[\s]*work\s+history\s*[:|\-|–]?\s*$',
        r'(?i)^[\s]*career\s*(?:history|summary)?\s*[:|\-|–]?\s*$',
        r'(?i)^[\s]*projects?\s*[:|\-|–]?\s*$',
    ],
    "education": [
        r'(?i)^[\s]*education(?:al)?\s*(?:background|qualifications?)?\s*[:|\-|–]?\s*$',
        r'(?i)^[\s]*academic\s*(?:background|qualifications?)?\s*[:|\-|–]?\s*$',
        r'(?i)^[\s]*qualifications?\s*[:|\-|–]?\s*$',
        r'(?i)^[\s]*certifications?\s*(?:&\s*education)?\s*[:|\-|–]?\s*$',
    ],
    "summary": [
        r'(?i)^[\s]*(?:professional\s+)?summary\s*[:|\-|–]?\s*$',
        r'(?i)^[\s]*(?:career\s+)?objective\s*[:|\-|–]?\s*$',
        r'(?i)^[\s]*profile\s*(?:summary)?\s*[:|\-|–]?\s*$',
        r'(?i)^[\s]*about\s*(?:me)?\s*[:|\-|–]?\s*$',
        r'(?i)^[\s]*introduction\s*[:|\-|–]?\s*$',
        r'(?i)^[\s]*overview\s*[:|\-|–]?\s*$',
    ],
}


def split_sections(text: str, entities: dict = None) -> Dict[str, str]:
    """Split resume text into exactly four named section chunks.

    Args:
        text: Full resume plain text.
        entities: Optional BERT NER entities dict for heuristic fallback.

    Returns:
        Dict with keys: skills_chunk, experience_chunk,
        education_chunk, summary_chunk.
    """
    lines = text.split("\n")
    sections = _detect_sections(lines)

    result = {
        "skills_chunk": "",
        "experience_chunk": "",
        "education_chunk": "",
        "summary_chunk": "",
    }

    if sections:
        result = _extract_chunks_from_sections(lines, sections)

    result = _fill_missing_chunks(text, result, entities or {})

    return result


def _detect_sections(lines: list) -> Dict[str, int]:
    """Detect section start line indices using regex patterns."""
    sections = {}

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped or len(stripped) > 80:
            continue

        for section_name, patterns in SECTION_PATTERNS.items():
            for pattern in patterns:
                if re.match(pattern, stripped):
                    if section_name not in sections:
                        sections[section_name] = i
                    break

    return sections


def _extract_chunks_from_sections(
    lines: list, sections: Dict[str, int]
) -> Dict[str, str]:
    """Extract text chunks for each detected section."""
    result = {
        "skills_chunk": "",
        "experience_chunk": "",
        "education_chunk": "",
        "summary_chunk": "",
    }

    sorted_sections = sorted(sections.items(), key=lambda x: x[1])

    for i, (name, start) in enumerate(sorted_sections):
        if i + 1 < len(sorted_sections):
            end = sorted_sections[i + 1][1]
        else:
            end = len(lines)

        chunk_lines = lines[start + 1 : end]
        chunk_text = "\n".join(line for line in chunk_lines if line.strip())
        result[f"{name}_chunk"] = chunk_text.strip()

    return result


def _fill_missing_chunks(
    text: str, result: Dict[str, str], entities: dict
) -> Dict[str, str]:
    """Fill in empty chunks using heuristic methods."""

    if not result["skills_chunk"] and entities.get("SKILL"):
        result["skills_chunk"] = ", ".join(entities["SKILL"])

    if not result["education_chunk"] and entities.get("EDUCATION"):
        result["education_chunk"] = ", ".join(entities["EDUCATION"])

    if not result["summary_chunk"]:
        non_empty = [l.strip() for l in text.split("\n") if l.strip()]
        result["summary_chunk"] = "\n".join(non_empty[:5])

    if not result["experience_chunk"]:
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        total = len(lines)
        if total > 10:
            start = max(5, total // 4)
            end = min(total - 3, 3 * total // 4)
            result["experience_chunk"] = "\n".join(lines[start:end])
        elif total > 3:
            result["experience_chunk"] = "\n".join(lines[2:])

    for key in result:
        if not result[key]:
            result[key] = text[:500] if text else "No content available"

    return result
