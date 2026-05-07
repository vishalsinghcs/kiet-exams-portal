"""
Migration: Add submission columns to exam_enrollments table.

Run once with:
    python migrate_feature9.py
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

RAW_DB_URL = os.getenv("DATABASE_URL")
if not RAW_DB_URL:
    raise RuntimeError("DATABASE_URL not found in .env")

# psycopg2 wants 'postgresql://' not 'postgresql+psycopg2://'
conn_url = RAW_DB_URL.replace("postgresql+psycopg2://", "postgresql://")

print("Connecting to database...")
conn = psycopg2.connect(conn_url)
conn.autocommit = True
cur = conn.cursor()

migrations = [
    (
        "Add submission_path to exam_enrollments",
        """
        ALTER TABLE exam_enrollments
        ADD COLUMN IF NOT EXISTS submission_path VARCHAR;
        """
    ),
    (
        "Add submitted_at to exam_enrollments",
        """
        ALTER TABLE exam_enrollments
        ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP;
        """
    )
]

print("\nRunning migrations...\n")
for label, sql in migrations:
    try:
        cur.execute(sql)
        print(f"  [OK]  {label}")
    except Exception as e:
        print(f"  [ERR] {label} -- {e}")

cur.close()
conn.close()

print("\n[DONE] Migration complete. Restart uvicorn to apply model changes.\n")
