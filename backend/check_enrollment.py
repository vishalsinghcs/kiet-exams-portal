import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))
with engine.connect() as conn:
    print("--- Latest Exams ---")
    exams = conn.execute(text("SELECT id, exam_name, start_time FROM exams ORDER BY id DESC LIMIT 3")).fetchall()
    for e in exams:
        print(f"Exam ID: {e[0]}, Name: {e[1]}, Start Time: {e[2]}")
        
    print("\n--- Enrollments for these exams ---")
    enrollments = conn.execute(text("SELECT exam_id, user_id FROM exam_enrollments WHERE exam_id IN (SELECT id FROM exams ORDER BY id DESC LIMIT 3)")).fetchall()
    for en in enrollments:
        print(f"Exam ID: {en[0]} is assigned to User ID: {en[1]}")
        
    print("\n--- Users ---")
    users = conn.execute(text("SELECT id, email, is_admin FROM users LIMIT 5")).fetchall()
    for u in users:
        print(f"User ID: {u[0]}, Email: {u[1]}, Admin: {u[2]}")
