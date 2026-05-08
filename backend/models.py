from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)       # Legacy — kept for backward compat
    role = Column(String, default="student")         # "student" | "teacher" | "admin"
    branch = Column(String, nullable=True)           # e.g., "CSE AI"
    section = Column(String, nullable=True)          # e.g., "A"
    created_at = Column(DateTime, default=datetime.utcnow)

class VerificationToken(Base):
    __tablename__ = "verification_tokens"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    token = Column(String)
    token_type = Column(String) # 'signup_otp', 'password_reset_otp'
    expires_at = Column(DateTime)

class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, index=True)
    access_code = Column(String)                        # 6-digit passkey
    subject = Column(String)
    exam_name = Column(String)
    duration = Column(Integer)                          # in minutes
    start_time = Column(DateTime)
    created_by = Column(Integer, nullable=True)         # user.id of creator (teacher/admin)
    overview = Column(Text, nullable=True)              # Markdown question paper content
    extra_sections = Column(Text, nullable=True)        # JSON: [{"title": str, "content": str}]
    dataset_path = Column(String, nullable=True)        # Path to uploaded dataset ZIP
    sample_csv_path = Column(String, nullable=True)     # Path to sample submission CSV
    created_at = Column(DateTime, default=datetime.utcnow)

class ExamEnrollment(Base):
    __tablename__ = "exam_enrollments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True) # Foreign key relation mapping
    exam_id = Column(Integer, index=True)
    status = Column(String, default="pending") # pending, completed, missed
    submission_path = Column(String, nullable=True) # Path to uploaded CSV
    notebook_path = Column(String, nullable=True) # Path to uploaded .ipynb
    submitted_at = Column(DateTime, nullable=True) # Time of submission
    assigned_at = Column(DateTime, default=datetime.utcnow)

class ExamSectionAssignment(Base):
    """Tracks which branch+section combos have been bulk-assigned to an exam."""
    __tablename__ = "exam_section_assignments"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, index=True)
    branch = Column(String)                          # e.g., "CSE AI"
    section = Column(String)                         # e.g., "A"
    assigned_at = Column(DateTime, default=datetime.utcnow)
