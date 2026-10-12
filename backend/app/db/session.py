"""SQLAlchemy engine, session factory, and FastAPI dependency."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import DATABASE_URL

# Remove check_same_thread for SQLite compatibility; harmless for PostgreSQL
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    connect_args["timeout"] = 60.0

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db():
    """Create all tables if they don't exist."""
    import app.db.models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    if DATABASE_URL.startswith("sqlite"):
        try:
            with engine.connect() as conn:
                conn.exec_driver_sql("PRAGMA journal_mode=WAL;")
                # Ensure columns exist on candidates
                res = conn.exec_driver_sql("PRAGMA table_info(candidates);")
                cols = [r[1] for r in res.fetchall()]
                for col_name, col_type in [
                    ("screening_score", "REAL"),
                    ("screening_summary", "TEXT"),
                    ("screening_recommendation", "TEXT"),
                    ("hired_at", "DATETIME"),
                ]:
                    if col_name not in cols and cols:
                        try:
                            conn.exec_driver_sql(f"ALTER TABLE candidates ADD COLUMN {col_name} {col_type};")
                        except Exception:
                            pass
        except Exception:
            pass


def get_db():
    """FastAPI dependency for database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
