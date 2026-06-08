import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))
with engine.connect() as conn:
    conn.execute(text("UPDATE exams SET access_code = '123456' WHERE access_code IS NULL"))
    conn.commit()
    print("Fixed NULL access_code for all old exams. They are now set to '123456'.")
