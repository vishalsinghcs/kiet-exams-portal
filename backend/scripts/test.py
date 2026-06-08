import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))
with engine.connect() as conn:
    res = conn.execute(text("SELECT email, is_admin FROM users WHERE email='admin@kiet.edu'")).fetchone()
    print(f"USER: {res[0]}, IS_ADMIN: {res[1]}")
