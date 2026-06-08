import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE exams ADD COLUMN access_code VARCHAR;"))
        conn.commit()
        print("Successfully added access_code column to exams table.")
    except Exception as e:
        print(f"Error (maybe column already exists): {e}")
