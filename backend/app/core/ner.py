"""BERT NER extraction using dslim/bert-base-NER.

Maps raw NER labels to domain-specific entity types for resume parsing.
"""

import re
from typing import Optional

from app.config import NER_MODEL

# Global pipeline instance (loaded once at startup)
_ner_pipeline = None

# Keywords for mapping NER entities to domain categories
SKILL_KEYWORDS = {
    "python", "java", "javascript", "typescript", "react", "angular", "vue",
    "node", "nodejs", "express", "django", "flask", "fastapi", "spring",
    "sql", "nosql", "mongodb", "postgresql", "mysql", "redis", "elasticsearch",
    "docker", "kubernetes", "aws", "azure", "gcp", "terraform", "jenkins",
    "git", "linux", "bash", "c++", "go", "rust", "swift", "kotlin",
    "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy",
    "matplotlib", "spark", "hadoop", "kafka", "rabbitmq", "graphql", "rest",
    "api", "microservices", "ci/cd", "agile", "scrum", "jira", "figma",
    "html", "css", "sass", "tailwind", "bootstrap", "webpack", "vite",
    "machine learning", "deep learning", "nlp", "computer vision",
    "data science", "data engineering", "devops", "cloud", "blockchain",
    "cybersecurity", "android", "ios", "flutter", "react native",
    "power bi", "tableau", "excel", "matlab", "scala", "haskell",
    "php", "laravel", "ruby", "rails", "perl", ".net", "unity", "unreal",
    "nextjs", "next.js", "spring boot", "opencv", "langchain",
    "distributed systems", "backend development", "frontend development",
}

# Single-char skills that need special handling (exact match, uppercase output)
SINGLE_CHAR_SKILLS = {"c", "r"}

EDUCATION_KEYWORDS = {
    "b.tech", "btech", "m.tech", "mtech", "b.sc", "bsc", "m.sc", "msc",
    "b.e", "m.e", "bca", "mca", "bba", "mba", "ph.d", "phd",
    "bachelor", "master", "doctorate", "diploma", "associate",
    "computer science", "information technology", "engineering",
    "electronics", "mechanical", "electrical", "civil", "chemical",
    "mathematics", "physics", "statistics", "economics", "commerce",
    "university", "institute", "college", "school", "academy",
    "iit", "nit", "iiit", "bits", "mit", "stanford", "harvard",
}

JOB_TITLE_KEYWORDS = {
    "engineer", "developer", "architect", "analyst", "scientist",
    "manager", "director", "lead", "senior", "junior", "intern",
    "consultant", "administrator", "designer", "specialist",
    "coordinator", "officer", "executive", "vice president", "vp",
    "cto", "ceo", "cfo", "coo", "sre", "qa", "tester",
    "full stack", "frontend", "backend",
    "software engineer", "web developer", "data scientist",
    "data analyst", "ml engineer", "devops engineer",
}

# Noise words to reject from COMPANY and LOCATION
NOISE_WORDS = {
    "and", "the", "or", "for", "in", "on", "at", "to", "of", "by",
    "is", "it", "an", "as", "end", "ing", "tion", "ment", "ness",
    "athon", "ation", "ity", "ous", "ful", "ble", "ally",
}

# Companies / orgs that are commonly mis-labelled as COMPANY by BERT
COMPANY_BLOCKLIST = {
    # Well-known non-companies or ambiguous abbreviations
    "ktu", "nasa", "nasa space", "myspace", "mys", "power b",
    "iit", "nit", "iiit", "bits", "mit", "harvard", "stanford",
    # Generic fragments BERT tends to output
    "ha", "na", "co", "inc", "ltd", "pvt",
}


def load_ner_model(device: int = -1):
    """Load the BERT NER pipeline. Call once at startup.

    Args:
        device: GPU device index. Use -1 for CPU, 0 for first GPU.
    """
    global _ner_pipeline
    try:
        from transformers import pipeline
        _ner_pipeline = pipeline(
            "ner",
            model=NER_MODEL,
            aggregation_strategy="simple",
            device=device,
        )
        print(f"[NER] Loaded {NER_MODEL} on device={device}")
    except Exception as e:
        print(f"[NER] Failed to load on device={device}, falling back to CPU: {e}")
        from transformers import pipeline
        _ner_pipeline = pipeline(
            "ner",
            model=NER_MODEL,
            aggregation_strategy="simple",
            device=-1,
        )
        print(f"[NER] Loaded {NER_MODEL} on CPU")


def _is_clean_entity(word: str, min_len: int = 3) -> bool:
    """Check if an entity string looks valid (not a BERT fragment)."""
    if len(word) < min_len:
        return False
    # Reject if mostly non-alpha
    alpha_count = sum(1 for c in word if c.isalpha())
    if alpha_count < len(word) * 0.5:
        return False
    # Reject noise words
    if word.lower().strip() in NOISE_WORDS:
        return False
    # Reject if starts/ends with lowercase fragment (likely subword artifact)
    if len(word) <= 3 and word[0].islower():
        return False
    # Reject BERT mid-word fragments (typically a single capitalised syllable ≤4 chars
    # that does NOT fully spell a known acronym)
    if word[-1].islower() and len(word) <= 4:
        return False
    return True


def _is_valid_company(word: str) -> bool:
    """Extra validation specifically for COMPANY entities."""
    word_lower = word.lower().strip()
    # Must be at least 4 chars to avoid abbreviation noise
    if len(word) < 4:
        return False
    # Block known false-positive patterns
    if word_lower in COMPANY_BLOCKLIST:
        return False
    # Reject if any education keyword is present — it's an institution, not a company
    for edu_kw in EDUCATION_KEYWORDS:
        if len(edu_kw) >= 4 and edu_kw in word_lower:
            return False
    # Reject if word is in skill keywords
    if word_lower in SKILL_KEYWORDS:
        return False
    # Reject if it's all-caps and 2-5 chars (likely an acronym/ticker, not a company name)
    if word.isupper() and len(word) <= 5:
        return False
    return True


def _classify_entity(word: str, label: str) -> Optional[str]:
    """Map a raw NER entity to a domain-specific type."""
    word_lower = word.lower().strip()

    # Skip very short or noisy tokens
    if len(word_lower) < 2:
        return None

    # Check skill keywords — require exact match only
    if word_lower in SKILL_KEYWORDS:
        return "SKILL"

    # Check education keywords — exact match or substring for multi-word
    if word_lower in EDUCATION_KEYWORDS:
        return "EDUCATION"
    for edu_kw in EDUCATION_KEYWORDS:
        if len(edu_kw) >= 4 and edu_kw in word_lower:
            return "EDUCATION"

    # Check job title keywords — exact word or phrase match
    if word_lower in JOB_TITLE_KEYWORDS:
        return "JOB_TITLE"
    # Also check if any multi-word JT keyword appears inside this entity
    for jt_kw in JOB_TITLE_KEYWORDS:
        if len(jt_kw) >= 6 and jt_kw in word_lower:
            return "JOB_TITLE"

    # Fall back to NER label mapping with stricter filters
    if label in ("ORG", "B-ORG"):
        if _is_clean_entity(word, min_len=4) and _is_valid_company(word):
            return "COMPANY"
    elif label in ("LOC", "B-LOC"):
        if _is_clean_entity(word, min_len=3):
            return "LOCATION"
    elif label in ("PER", "B-PER"):
        return None  # People names are not useful
    elif label in ("MISC", "B-MISC"):
        # MISC sometimes contains job titles (e.g. "Software Engineer")
        for jt_kw in JOB_TITLE_KEYWORDS:
            if len(jt_kw) >= 6 and jt_kw in word_lower:
                return "JOB_TITLE"

    return None


def _normalize_skill(skill: str) -> str:
    """Normalize a skill name to a canonical form."""
    # Map common variations to standard names
    CANONICAL = {
        "c++": "C++", "c#": "C#", "c": "C", "r": "R",
        "go": "Go", "sql": "SQL", "nosql": "NoSQL",
        "html": "HTML", "css": "CSS", "php": "PHP",
        "aws": "AWS", "gcp": "GCP", "api": "API",
        "ci/cd": "CI/CD", "nlp": "NLP", "qa": "QA",
        "ios": "iOS", "ai": "AI", "ml": "ML",
        "graphql": "GraphQL", "mongodb": "MongoDB",
        "mysql": "MySQL", "postgresql": "PostgreSQL",
        "nodejs": "Node.js", "node": "Node.js",
        "fastapi": "FastAPI", "reactjs": "React",
        "vuejs": "Vue", "nextjs": "Next.js", "next.js": "Next.js",
        "redis": "Redis", "docker": "Docker",
        "kubernetes": "Kubernetes", "linux": "Linux",
        "git": "Git", "bash": "Bash",
        "tensorflow": "TensorFlow", "pytorch": "PyTorch",
        "keras": "Keras", "pandas": "Pandas", "numpy": "NumPy",
        "flask": "Flask", "django": "Django", "express": "Express",
        "react": "React", "angular": "Angular", "vue": "Vue",
        "typescript": "TypeScript", "javascript": "JavaScript",
        "python": "Python", "java": "Java", "kotlin": "Kotlin",
        "swift": "Swift", "rust": "Rust", "scala": "Scala",
        "haskell": "Haskell", "matlab": "MATLAB",
        "spark": "Spark", "hadoop": "Hadoop", "kafka": "Kafka",
        "elasticsearch": "Elasticsearch", "rabbitmq": "RabbitMQ",
        "terraform": "Terraform", "jenkins": "Jenkins",
        "figma": "Figma", "jira": "Jira",
        "sass": "Sass", "tailwind": "Tailwind", "bootstrap": "Bootstrap",
        "webpack": "Webpack", "vite": "Vite",
        "flutter": "Flutter", "android": "Android",
        "unity": "Unity", "unreal": "Unreal",
        "tableau": "Tableau", "excel": "Excel", "power bi": "Power BI",
        "laravel": "Laravel", "ruby": "Ruby", "rails": "Rails",
        "perl": "Perl", ".net": ".NET", "spring": "Spring",
        "spring boot": "Spring Boot", "opencv": "OpenCV",
        "langchain": "LangChain", "scikit-learn": "Scikit-learn",
        "matplotlib": "Matplotlib",
        "machine learning": "Machine Learning",
        "deep learning": "Deep Learning",
        "computer vision": "Computer Vision",
        "data science": "Data Science",
        "data engineering": "Data Engineering",
        "devops": "DevOps", "cloud": "Cloud",
        "blockchain": "Blockchain", "cybersecurity": "Cybersecurity",
        "react native": "React Native",
        "agile": "Agile", "scrum": "Scrum",
        "microservices": "Microservices", "rest": "REST",
        "distributed systems": "Distributed Systems",
        "backend development": "Backend Development",
        "frontend development": "Frontend Development",
        "azure": "Azure",
    }
    return CANONICAL.get(skill.lower().strip(), skill.title())


def extract_entities(text: str) -> dict:
    """Run BERT NER on text and return domain-grouped entities.

    Args:
        text: Plain text from a resume.

    Returns:
        Dict with keys: SKILL, JOB_TITLE, COMPANY, DATE, EDUCATION, LOCATION.
        Each value is a list of unique entity strings.
    """
    if _ner_pipeline is None:
        raise RuntimeError("NER model not loaded. Call load_ner_model() first.")

    entities = {
        "SKILL": set(),
        "JOB_TITLE": set(),
        "COMPANY": set(),
        "DATE": set(),
        "EDUCATION": set(),
        "LOCATION": set(),
    }

    chunks = _split_text_for_ner(text, max_chars=450)

    for chunk in chunks:
        try:
            results = _ner_pipeline(chunk)
        except Exception:
            continue

        for ent in results:
            word = ent.get("word", "").replace("##", "").strip()
            if len(word) < 2:
                continue

            # Skip low-confidence entities
            score = ent.get("score", 0)
            if score < 0.5:
                continue

            label = ent.get("entity_group", "")
            domain_type = _classify_entity(word, label)
            if domain_type:
                entities[domain_type].add(word)

    # Extract dates with regex
    date_patterns = [
        r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}\b',
        r'\b\d{4}\s*[-–]\s*\d{4}\b',
        r'\b\d{4}\s*[-–]\s*(?:Present|Current|Now)\b',
        r'\b\d{2}/\d{4}\b',
    ]
    for pattern in date_patterns:
        for match in re.findall(pattern, text, re.IGNORECASE):
            entities["DATE"].add(match.strip())

    # Scan full text for job title phrases using regex (catches multi-word titles
    # that BERT may tokenise as multiple ORG/MISC entities)
    JOB_TITLE_PATTERNS = [
        r'(?i)\b((?:senior|junior|lead|principal|staff)?\s*(?:software|web|mobile|backend|frontend|full.?stack|machine learning|ml|ai|data|cloud|devops|site reliability|platform|systems?)\s+(?:engineer|developer|scientist|analyst|architect|intern|specialist))\b',
        r'(?i)\b((?:software|web|mobile)?\s*(?:developer|engineer)\s*(?:intern|trainee)?)\b',
        r'(?i)\b(data\s+(?:scientist|analyst|engineer|architect))\b',
        r'(?i)\b(machine\s+learning\s+(?:engineer|researcher|intern))\b',
        r'(?i)\b((?:ui|ux|product|graphic)\s+designer)\b',
        r'(?i)\b((?:project|product|engineering|technical|program)\s+manager)\b',
        r'(?i)\b((?:intern|trainee|graduate)\s+(?:engineer|developer|analyst)?)\b',
    ]
    for pattern in JOB_TITLE_PATTERNS:
        for match in re.finditer(pattern, text):
            title = match.group(1).strip()
            title = re.sub(r'\s+', ' ', title)
            if len(title) >= 5:
                entities["JOB_TITLE"].add(title.title())

    # Extract skills from text using keyword matching (primary skill source)
    text_lower = text.lower()
    for skill in SKILL_KEYWORDS:
        if re.search(r'\b' + re.escape(skill) + r'\b', text_lower):
            entities["SKILL"].add(_normalize_skill(skill))

    # Handle single-char skills separately (C, R)
    for skill in SINGLE_CHAR_SKILLS:
        if re.search(r'\b' + re.escape(skill) + r'\b(?:\s+(?:programming|language|code))?', text):
            entities["SKILL"].add(skill.upper())



    # Normalize all skills to canonical names (dedup Go/GO/go etc.)
    normalized_skills = set()
    for skill in entities["SKILL"]:
        normalized_skills.add(_normalize_skill(skill))
    entities["SKILL"] = normalized_skills

    # Clean up COMPANY: apply the stricter _is_valid_company check
    cleaned_companies = set()
    for company in entities["COMPANY"]:
        if not _is_valid_company(company):
            # Reclassify as EDUCATION if it looks like an institution
            cl = company.lower()
            if any(edu in cl for edu in EDUCATION_KEYWORDS if len(edu) >= 4):
                entities["EDUCATION"].add(company)
            continue
        cleaned_companies.add(company)
    entities["COMPANY"] = cleaned_companies

    # Convert sets to sorted lists
    return {k: sorted(list(v)) for k, v in entities.items()}



def _split_text_for_ner(text: str, max_chars: int = 450) -> list:
    """Split text into chunks suitable for BERT NER processing."""
    lines = text.split("\n")
    chunks = []
    current = []
    current_len = 0

    for line in lines:
        if current_len + len(line) > max_chars and current:
            chunks.append("\n".join(current))
            current = []
            current_len = 0
        current.append(line)
        current_len += len(line) + 1

    if current:
        chunks.append("\n".join(current))

    return chunks
