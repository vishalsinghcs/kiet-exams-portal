import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from database import engine

def upgrade():
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE exam_enrollments ADD COLUMN notebook_path VARCHAR;"))
            print("Successfully added notebook_path to exam_enrollments table.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    upgrade()
