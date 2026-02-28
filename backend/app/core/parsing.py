"""PDF and DOCX text extraction using PyMuPDF and python-docx."""

import os


def extract_text(file_path: str) -> str:
    """Extract plain text from a PDF or DOCX file.

    Uses PyMuPDF (fitz) for PDF files and python-docx for DOCX files.

    Args:
        file_path: Path to the PDF or DOCX file.

    Returns:
        Clean plain text string.

    Raises:
        ValueError: If the file format is not supported.
        FileNotFoundError: If the file does not exist.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf":
        return _extract_from_pdf(file_path)
    elif ext in (".docx", ".doc"):
        return _extract_from_docx(file_path)
    else:
        raise ValueError(f"Unsupported file format: {ext}. Use PDF or DOCX.")


def _extract_from_pdf(file_path: str) -> str:
    """Extract text from a PDF file using PyMuPDF."""
    import fitz

    doc = fitz.open(file_path)
    pages = []
    for page in doc:
        text = page.get_text()
        if text.strip():
            pages.append(text.strip())
    doc.close()
    return "\n".join(pages)


def _extract_from_docx(file_path: str) -> str:
    """Extract text from a DOCX file using python-docx."""
    from docx import Document

    doc = Document(file_path)
    paragraphs = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if text:
            paragraphs.append(text)
    return "\n".join(paragraphs)
