from pydantic import BaseModel, EmailStr, field_validator, Field, ConfigDict
from datetime import datetime
from typing import Optional, Any
from uuid import UUID

# 1. The rules for signing up
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    branch: str
    section: str
    enrollment_year: int
    registration_number: str = Field(..., pattern=r'^\d{15}$')

# 1b. The rules for verifying signup OTP
class OTPVerifyRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    branch: str
    section: str
    enrollment_year: int
    registration_number: str = Field(..., pattern=r'^\d{15}$')
    otp: str

    # This is the custom rule to ensure only KIET students can sign up
    @field_validator('email')
    def validate_kiet_email(cls, v):
        if not v.endswith('@kiet.edu'):
            raise ValueError('Registration is restricted to @kiet.edu domains only')
        return v

# 2. The rules for what we send back to the user (Notice we don't send the password back!)
class UserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    role: str                  # "student" | "teacher" | "admin"
    branch: Optional[str] = None
    section: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# 3. The rules for Login Request (email + password as JSON)
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# 4. Forgot password request
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

# 5. Reset password with OTP request
class ResetPasswordOTPRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

# 6. The rules for the Login Token response
class Token(BaseModel):
    access_token: str
    token_type: str

class EmailRequest(BaseModel):
    email: EmailStr

# 7. Exams schemas
class ExamBase(BaseModel):
    subject_code: str
    access_code: str = Field(..., min_length=6, max_length=6, pattern=r'^\d{6}$')
    subject: str
    exam_name: str
    duration: int
    start_time: datetime
    # Rich content fields
    exam_sections: Any

    @field_validator('access_code')
    def validate_access_code(cls, v):
        if not v.strip():
            raise ValueError('Access code cannot be empty')
        if not v.isdigit():
            raise ValueError('Access code must be exactly 6 numeric digits')
        if len(v) != 6:
            raise ValueError('Access code must be exactly 6 digits long')
        return v

class ExamCreate(ExamBase):
    pass

class ExamResponse(ExamBase):
    id: UUID
    created_at: datetime
    created_by: Optional[UUID] = None
    dataset_path: Optional[str] = None
    sample_csv_path: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ExamAssign(BaseModel):
    email: EmailStr
    exam_id: int

class VerifyExamCodeRequest(BaseModel):
    code: str

class AssignedExamResponse(BaseModel):
    id: UUID
    subject_code: str
    subject: str
    exam_name: str
    duration: int
    start_time: datetime
    status: str # from ExamEnrollment
    exam_sections: Any

class AdminStatsResponse(BaseModel):
    total_students: int
    total_exams: int
    total_enrollments: int

# Feature 8 — Bulk section assignment
class SectionAssignRequest(BaseModel):
    branch: str
    section: str

class SectionAssignmentResponse(BaseModel):
    id: int
    exam_id: UUID
    branch: str
    section: str
    assigned_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Feature 9 — Results View
class StudentResult(BaseModel):
    id: UUID # Enrollment ID or User ID
    name: str
    email: str
    branch: Optional[str] = None
    section: Optional[str] = None
    status: str
    submitted_at: Optional[datetime] = None
    has_submission: bool = False # simpler flag for frontend csv
    has_notebook: bool = False # simpler flag for frontend ipynb

    model_config = ConfigDict(from_attributes=True)

class ExamResultsResponse(BaseModel):
    assigned: int
    submitted: int
    pending: int
    results: list[StudentResult]
