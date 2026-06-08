"""
Migration: Add role column to users + content/ownership columns to exams.

Run once with:
    python migrate_add_role_and_exam_content.py

This script is SAFE to run on an existing database — it uses
IF NOT EXISTS / DO NOTHING patterns so it will never destroy data.
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
    # ── Users table ──────────────────────────────────────────────────────────
    (
        "Add role column to users",
        """
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'student';
        """
    ),
    (
        "Backfill role for existing admins",
        """
        UPDATE users SET role = 'admin'   WHERE is_admin = TRUE  AND role = 'student';
        UPDATE users SET role = 'student' WHERE is_admin = FALSE AND role = 'student';
        """
    ),

    # ── Exams table ───────────────────────────────────────────────────────────
    (
        "Add created_by to exams",
        """
        ALTER TABLE exams
        ADD COLUMN IF NOT EXISTS created_by INTEGER;
        """
    ),
    (
        "Add overview to exams",
        """
        ALTER TABLE exams
        ADD COLUMN IF NOT EXISTS overview TEXT;
        """
    ),
    (
        "Add extra_sections to exams",
        """
        ALTER TABLE exams
        ADD COLUMN IF NOT EXISTS extra_sections TEXT;
        """
    ),
    (
        "Add dataset_path to exams",
        """
        ALTER TABLE exams
        ADD COLUMN IF NOT EXISTS dataset_path VARCHAR;
        """
    ),
    (
        "Add sample_csv_path to exams",
        """
        ALTER TABLE exams
        ADD COLUMN IF NOT EXISTS sample_csv_path VARCHAR;
        """
    ),
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
