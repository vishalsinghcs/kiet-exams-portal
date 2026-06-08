import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))
with engine.connect() as conn:
    result = conn.execute(text("SELECT id, code, access_code FROM exams"))
    rows = result.fetchall()
    if not rows:
        print("The exams database is currently empty.")
    else:
        print(f"Found {len(rows)} exams in the database:")
        for row in rows:
            print(f"ID: {row[0]}, Code: {row[1]}, Access Code: {row[2]}")
