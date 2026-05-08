"""
Feature 8 Migration — Run this ONCE to add branch/section to users
and create the exam_section_assignments table.

Run with: python migrate_feature8.py
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not set in .env")

engine = create_engine(DATABASE_URL)

migrations = [
    # 1. Add branch column to users (safe — nullable, no data loss)
    """
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS branch VARCHAR;
    """,
    # 2. Add section column to users (safe — nullable, no data loss)
    """
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS section VARCHAR;
    """,
    # 3. Create the exam_section_assignments table
    """
    CREATE TABLE IF NOT EXISTS exam_section_assignments (
        id SERIAL PRIMARY KEY,
        exam_id INTEGER NOT NULL,
        branch VARCHAR NOT NULL,
        section VARCHAR NOT NULL,
        assigned_at TIMESTAMP DEFAULT NOW()
    );
    """,
]

with engine.connect() as conn:
    for sql in migrations:
        print(f"Running: {sql.strip()[:60]}...")
        conn.execute(text(sql))
    conn.commit()

print("\n✅ Migration complete. Feature 8 DB schema is ready.")
