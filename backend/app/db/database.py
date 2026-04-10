from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,   # Test connections before use, avoids stale connection errors
    pool_recycle=300,     # Recycle connections every 5 min to prevent SSL timeout noise
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def run_migrations():
    """Safely add columns introduced after the initial deployment.
    Uses IF NOT EXISTS so it's idempotent and safe to run on every startup."""
    migrations = [
        # Users table additions
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS scan_count_today INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS org_id INTEGER",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_type VARCHAR DEFAULT 'free'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR",
        # Scans table additions
        "ALTER TABLE scans ADD COLUMN IF NOT EXISTS scan_type VARCHAR DEFAULT 'quick'",
        "ALTER TABLE scans ADD COLUMN IF NOT EXISTS schedule_type VARCHAR DEFAULT 'none'",
        "ALTER TABLE scans ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMP",
        "ALTER TABLE scans ADD COLUMN IF NOT EXISTS organization_id INTEGER",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
            except Exception as e:
                pass  # Column may already exist under a different error path
        conn.commit()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
