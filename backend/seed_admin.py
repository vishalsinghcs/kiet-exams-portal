import os
from sqlalchemy import create_engine, text
from auth import get_password_hash
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("NO DATABASE_URL")
    exit(1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    # 1. Add is_admin column if it doesn't exist
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;"))
        conn.commit()
        print("Added is_admin column.")
    except Exception as e:
        print("is_admin column likely exists.")
        
    # Re-establish connection/transaction if exception occurred
    try:
        res = conn.execute(text("SELECT * FROM users WHERE email='admin@kiet.edu'")).fetchone()
        if not res:
            hashed_pw = get_password_hash("admin")
            conn.execute(text(f"INSERT INTO users (name, email, hashed_password, is_active, is_admin) VALUES ('admin', 'admin@kiet.edu', '{hashed_pw}', TRUE, TRUE)"))
            conn.commit()
            print("Admin user created!")
        else:
            conn.execute(text("UPDATE users SET is_admin = TRUE WHERE email='admin@kiet.edu'"))
            conn.commit()
            print("Admin user updated to be admin.")
    except Exception as e:
        print("Error checking/creating admin:", str(e))
