import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))
with engine.connect() as conn:
    conn.execute(text("UPDATE users SET created_at = NOW() WHERE created_at IS NULL"))
    conn.commit()
    print("Fixed NULL created_at rows")
