import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, CHAR, Enum, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    registration_number = Column(CHAR(15), unique=True, nullable=True, index=True)
    password_hash = Column(Text, nullable=False)
    role = Column(Enum("student", "teacher", "admin", name="user_roles"), nullable=False, default="student")
    enrollment_year = Column(Integer, nullable=True)
    branch = Column(String, nullable=True)
    section = Column(CHAR(1), nullable=True)
    avatar_path = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)        
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    @property
    def batch_id(self):
        """Dynamically calculate the batch string in memory to prevent database bloat."""
        if self.role == 'student' and self.enrollment_year and self.branch and self.section:
            return f"{self.enrollment_year}_{self.branch}_{self.section}"
        

class VerificationToken(Base):
    __tablename__ = "verification_tokens"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    token = Column(String, nullable=False)
    token_type = Column(Enum("signup", "password_reset", name="token_types"), nullable=False) # 'signup_otp', 'password_reset_otp'
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class Exam(Base):
    __tablename__ = "exams"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4, index=True)
    subject_code = Column(String, nullable=False)
    access_code = Column(String, nullable=False)                        # 6-digit passkey
    subject = Column(String, nullable=False)
    exam_name = Column(String, nullable=False)
    duration = Column(Integer, nullable=False)                          # in minutes
    start_time = Column(DateTime, nullable=False)
    exam_sections = Column(JSONB, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)         # user.id of creator (teacher/admin)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
class ExamEnrollment(Base):
    __tablename__ = "exam_enrollments"

    # Composite Primary Key mapping (Strictly prevents duplicate enrollments)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True, index=True)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), primary_key=True, index=True)

    status = Column(Enum("pending", "submitted", "missed", name="enrollment_status"), default="pending", nullable=False) 
    
    csv_submission_path = Column(String, nullable=True)
    notebook_submission_path = Column(String, nullable=True)

    ai_score = Column(Numeric(6,2), nullable=True)
    ai_feedback = Column(Text, nullable=True)

    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    submitted_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

class ExamSectionAssignment(Base):
    """Tracks which branch+section combos have been bulk-assigned to an exam by the teacher."""
    __tablename__ = "exam_section_assignments"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False, index=True)
    branch = Column(String, nullable=False)                          # e.g., "CSE AI"
    section = Column(CHAR(1), nullable=False)                         # e.g., "A"
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint('exam_id', 'branch', 'section', name='uq_exam_branch_section'),
    )
