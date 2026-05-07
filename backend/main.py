from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
import random
import string
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError

# Import our custom files
from database import engine, Base, get_db
import models, schemas, auth, email_service

# Create the tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="KIET Exams Portal")

# Allow the React frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, change this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def generate_otp(length=6):
    """Generate a random numeric OTP"""
    return ''.join(random.choices(string.digits, k=length))

# ==================== SIGNUP FLOW ====================

@app.post("/signup")
def signup_request_otp(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # 1. Exam Day Constraint
    exam_date_str = os.getenv("EXAM_DATE")
    if exam_date_str:
        exam_date = datetime.strptime(exam_date_str, "%Y-%m-%d").date()
        if datetime.now().date() >= exam_date:
            raise HTTPException(status_code=403, detail="Registration is closed on Exam Day.")

    # 2. Check if the email is already registered
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 3. Clean up any old OTPs for this email to avoid spam
    db.query(models.VerificationToken).filter(
        models.VerificationToken.email == user.email,
        models.VerificationToken.token_type == 'signup_otp'
    ).delete()

    # 4. Generate and save OTP
    otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    token_entry = models.VerificationToken(
        email=user.email,
        token=otp,
        token_type='signup_otp',
        expires_at=expires_at
    )
    db.add(token_entry)
    db.commit()

    # 5. Send OTP Email
    email_service.send_otp_email(user.email, otp, purpose="signup")
    
    return {"message": "OTP sent successfully"}

@app.post("/verify-otp", response_model=schemas.Token)
def verify_signup_otp(data: schemas.OTPVerifyRequest, db: Session = Depends(get_db)):
    # 1. Check if OTP is valid
    token_entry = db.query(models.VerificationToken).filter(
        models.VerificationToken.email == data.email,
        models.VerificationToken.token_type == 'signup_otp',
        models.VerificationToken.token == data.otp
    ).first()

    if not token_entry:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    if datetime.utcnow() > token_entry.expires_at:
        db.delete(token_entry)
        db.commit()
        raise HTTPException(status_code=400, detail="OTP has expired")

    # 2. OTP is valid, create the user
    db_user = db.query(models.User).filter(models.User.email == data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pwd = auth.get_password_hash(data.password)
    new_user = models.User(
        name=data.name,
        email=data.email,
        hashed_password=hashed_pwd,
        branch=data.branch,
        section=data.section
    )
    
    db.add(new_user)
    
    # Clean up the OTP
    db.delete(token_entry)
    db.commit()

    # 3. Generate login token and return it
    access_token = auth.create_access_token(data={"sub": new_user.email})
    return {"access_token": access_token, "token_type": "bearer"}


# ==================== LOGIN FLOW ====================

@app.post("/login", response_model=schemas.Token)
def login(credentials: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    
    if not user or not auth.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


# ==================== FORGOT PASSWORD FLOW ====================

@app.post("/forgot-password")
def forgot_password_request_otp(data: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    
    # We still send a 200 OK even if user doesn't exist to prevent email enumeration attacks
    if user:
        # Clean up old password reset OTPs
        db.query(models.VerificationToken).filter(
            models.VerificationToken.email == data.email,
            models.VerificationToken.token_type == 'password_reset_otp'
        ).delete()

        otp = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=15)
        
        token_entry = models.VerificationToken(
            email=data.email,
            token=otp,
            token_type='password_reset_otp',
            expires_at=expires_at
        )
        db.add(token_entry)
        db.commit()

        email_service.send_otp_email(data.email, otp, purpose="password reset")

    return {"message": "If an account with that email exists, an OTP has been sent."}

@app.post("/reset-password")
def reset_password_with_otp(data: schemas.ResetPasswordOTPRequest, db: Session = Depends(get_db)):
    token_entry = db.query(models.VerificationToken).filter(
        models.VerificationToken.email == data.email,
        models.VerificationToken.token_type == 'password_reset_otp',
        models.VerificationToken.token == data.otp
    ).first()

    if not token_entry:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    if datetime.utcnow() > token_entry.expires_at:
        db.delete(token_entry)
        db.commit()
        raise HTTPException(status_code=400, detail="OTP has expired")

    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update password
    user.hashed_password = auth.get_password_hash(data.new_password)
    
    # Clean up OTP
    db.delete(token_entry)
    db.commit()

    return {"message": "Password updated successfully"}


# ==================== USER PROFILE ====================

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

@app.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# ==================== ADMIN ENDPOINTS ====================

def get_admin_user(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return current_user

@app.post("/admin/elevate")
def elevate_user(email: str, admin: models.User = Depends(get_admin_user), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_admin = True
    db.commit()
    return {"message": f"{email} is now an admin"}

@app.get("/admin/stats", response_model=schemas.AdminStatsResponse)
def get_admin_stats(admin: models.User = Depends(get_admin_user), db: Session = Depends(get_db)):
    total_students = db.query(models.User).filter(models.User.role == "student").count()
    total_exams = db.query(models.Exam).count()
    total_enrollments = db.query(models.ExamEnrollment).count()
    return {
        "total_students": total_students,
        "total_exams": total_exams,
        "total_enrollments": total_enrollments
    }

# ==================== EXAMS ENDPOINTS ====================

@app.get("/users/me/exams", response_model=list[schemas.AssignedExamResponse])
def get_my_exams(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Join ExamEnrollment and Exam
    enrollments = db.query(models.ExamEnrollment, models.Exam).join(
        models.Exam, models.ExamEnrollment.exam_id == models.Exam.id
    ).filter(models.ExamEnrollment.user_id == current_user.id).all()
    
    results = []
    for enrollment, exam in enrollments:
        results.append({
            "id": exam.id,
            "code": exam.code,
            "subject": exam.subject,
            "exam_name": exam.exam_name,
            "duration": exam.duration,
            "start_time": exam.start_time,
            "status": enrollment.status
        })
    return results

from fastapi import Form, File, UploadFile
import storage

@app.post("/admin/exams", response_model=schemas.ExamResponse)
async def create_exam(
    code: str = Form(...),
    access_code: str = Form(...),
    subject: str = Form(...),
    exam_name: str = Form(...),
    duration: int = Form(...),
    start_time: str = Form(...),
    overview: str = Form(None),
    extra_sections: str = Form(None),
    dataset: UploadFile = File(None),
    sample_csv: UploadFile = File(None),
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    # Upload files if provided
    dataset_path = await storage.upload_file(dataset, "datasets") if dataset else None
    sample_csv_path = await storage.upload_file(sample_csv, "samples") if sample_csv else None

    db_exam = models.Exam(
        code=code,
        access_code=access_code,
        subject=subject,
        exam_name=exam_name,
        duration=duration,
        start_time=datetime.fromisoformat(start_time.replace("Z", "+00:00")),
        overview=overview,
        extra_sections=extra_sections,
        dataset_path=dataset_path,
        sample_csv_path=sample_csv_path,
        created_by=admin.id
    )
    db.add(db_exam)
    db.commit()
    db.refresh(db_exam)
    return db_exam

@app.post("/admin/exams/assign")
def assign_exam(assign_data: schemas.ExamAssign, admin: models.User = Depends(get_admin_user), db: Session = Depends(get_db)):
    # 1. Find user by email
    user = db.query(models.User).filter(models.User.email == assign_data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # 2. Check if exam exists
    exam = db.query(models.Exam).filter(models.Exam.id == assign_data.exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    # 3. Check if already assigned
    existing = db.query(models.ExamEnrollment).filter(
        models.ExamEnrollment.user_id == user.id,
        models.ExamEnrollment.exam_id == exam.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Exam already assigned to this user")
        
    # 4. Create enrollment
    enrollment = models.ExamEnrollment(user_id=user.id, exam_id=exam.id)
    db.add(enrollment)
    db.commit()
    return {"message": "Exam assigned successfully"}

@app.get("/admin/exams/all", response_model=list[schemas.ExamResponse])
def get_all_exams(admin: models.User = Depends(get_admin_user), db: Session = Depends(get_db)):
    exams = db.query(models.Exam).order_by(models.Exam.created_at.desc()).all()
    return exams

@app.put("/admin/exams/{exam_id}", response_model=schemas.ExamResponse)
def update_exam(exam_id: int, exam_data: schemas.ExamCreate, admin: models.User = Depends(get_admin_user), db: Session = Depends(get_db)):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Reject edit if the exam has already started
    from datetime import timezone
    now = datetime.now(timezone.utc)
    exam_start = exam.start_time.replace(tzinfo=timezone.utc) if exam.start_time.tzinfo is None else exam.start_time
    if now >= exam_start:
        raise HTTPException(status_code=400, detail="Cannot edit an exam that has already started")

    for field, value in exam_data.model_dump().items():
        setattr(exam, field, value)

    db.commit()
    db.refresh(exam)
    return exam

@app.delete("/admin/exams/{exam_id}")
def delete_exam(exam_id: int, admin: models.User = Depends(get_admin_user), db: Session = Depends(get_db)):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Cascade delete enrollments first
    db.query(models.ExamEnrollment).filter(models.ExamEnrollment.exam_id == exam_id).delete()
    db.delete(exam)
    db.commit()
    return {"message": "Exam deleted successfully"}

@app.post("/users/me/exams/{exam_id}/verify-code")
def verify_exam_code(exam_id: int, request: schemas.VerifyExamCodeRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. Verify user is enrolled
    enrollment = db.query(models.ExamEnrollment).filter(
        models.ExamEnrollment.user_id == current_user.id,
        models.ExamEnrollment.exam_id == exam_id
    ).first()
    if not enrollment:
        raise HTTPException(status_code=403, detail="You are not enrolled in this exam")
    
    # 2. Check if exam exists
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    # 3. Verify access code
    if exam.access_code != request.code:
        raise HTTPException(status_code=400, detail="Invalid exam access code")
        
    return {"success": True, "message": "Code verified successfully"}

# ==================== FEATURE 8: BULK SECTION ASSIGNMENT ====================

@app.get("/admin/sections/{branch}/{section}/count")
def get_section_student_count(
    branch: str,
    section: str,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Returns the number of students in a given branch and section."""
    count = db.query(models.User).filter(
        models.User.branch == branch,
        models.User.section == section,
        models.User.is_admin == False
    ).count()
    return {"branch": branch, "section": section, "count": count}

@app.post("/admin/exams/{exam_id}/assign-section")
def assign_section_to_exam(
    exam_id: int,
    data: schemas.SectionAssignRequest,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Bulk-assigns all students in a branch+section to an exam."""
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Prevent duplicate section assignments
    existing = db.query(models.ExamSectionAssignment).filter(
        models.ExamSectionAssignment.exam_id == exam_id,
        models.ExamSectionAssignment.branch == data.branch,
        models.ExamSectionAssignment.section == data.section
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"{data.branch} - Section {data.section} is already assigned to this exam")

    # Fetch all students in this branch+section
    students = db.query(models.User).filter(
        models.User.branch == data.branch,
        models.User.section == data.section,
        models.User.is_admin == False
    ).all()

    # Bulk create enrollments (skip already-enrolled students)
    enrolled_count = 0
    for student in students:
        already_enrolled = db.query(models.ExamEnrollment).filter(
            models.ExamEnrollment.user_id == student.id,
            models.ExamEnrollment.exam_id == exam_id
        ).first()
        if not already_enrolled:
            db.add(models.ExamEnrollment(user_id=student.id, exam_id=exam_id))
            enrolled_count += 1

    # Record the section assignment
    db.add(models.ExamSectionAssignment(
        exam_id=exam_id,
        branch=data.branch,
        section=data.section
    ))
    db.commit()

    return {
        "message": f"Successfully assigned {enrolled_count} students from {data.branch} - Section {data.section}",
        "enrolled_count": enrolled_count
    }

@app.delete("/admin/exams/{exam_id}/assign-section")
def remove_section_from_exam(
    exam_id: int,
    data: schemas.SectionAssignRequest,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Removes all enrollments for a specific branch+section from an exam."""
    # Find students in this branch+section
    student_ids = [
        u.id for u in db.query(models.User).filter(
            models.User.branch == data.branch,
            models.User.section == data.section
        ).all()
    ]

    # Delete their enrollments
    removed = db.query(models.ExamEnrollment).filter(
        models.ExamEnrollment.exam_id == exam_id,
        models.ExamEnrollment.user_id.in_(student_ids)
    ).delete(synchronize_session=False)

    # Remove the section assignment record
    db.query(models.ExamSectionAssignment).filter(
        models.ExamSectionAssignment.exam_id == exam_id,
        models.ExamSectionAssignment.branch == data.branch,
        models.ExamSectionAssignment.section == data.section
    ).delete()

    db.commit()
    return {"message": f"Removed {removed} enrollments from {data.branch} - Section {data.section}"}

@app.get("/admin/exams/{exam_id}/sections", response_model=list[schemas.SectionAssignmentResponse])
def get_exam_section_assignments(
    exam_id: int,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Returns all branch+section assignments for an exam."""
    return db.query(models.ExamSectionAssignment).filter(
        models.ExamSectionAssignment.exam_id == exam_id
    ).all()

# ==================== FEATURE 9: RESULTS PER EXAM ====================

@app.get("/admin/exams/{exam_id}/results", response_model=schemas.ExamResultsResponse)
def get_exam_results(
    exam_id: int,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    # Fetch all enrollments for this exam
    enrollments = db.query(models.ExamEnrollment, models.User).join(
        models.User, models.ExamEnrollment.user_id == models.User.id
    ).filter(models.ExamEnrollment.exam_id == exam_id).all()

    assigned = len(enrollments)
    submitted = sum(1 for e, u in enrollments if e.status == "Submitted")
    pending = assigned - submitted

    results_list = []
    for e, u in enrollments:
        results_list.append({
            "id": e.id,
            "name": u.name,
            "email": u.email,
            "branch": u.branch,
            "section": u.section,
            "status": e.status,
            "submitted_at": e.submitted_at,
            "has_submission": bool(e.submission_path)
        })

    return {
        "assigned": assigned,
        "submitted": submitted,
        "pending": pending,
        "results": results_list
    }

from fastapi.responses import FileResponse

@app.get("/admin/submissions/{enrollment_id}/download")
def download_submission(
    enrollment_id: int,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    enrollment = db.query(models.ExamEnrollment).filter(models.ExamEnrollment.id == enrollment_id).first()
    if not enrollment or not enrollment.submission_path:
        raise HTTPException(status_code=404, detail="Submission file not found")
    
    if not os.path.exists(enrollment.submission_path):
        raise HTTPException(status_code=404, detail="File missing on server")

    filename = os.path.basename(enrollment.submission_path)
    return FileResponse(path=enrollment.submission_path, filename=filename, media_type='text/csv')

@app.post("/users/me/exams/{exam_id}/submit")
async def submit_exam(
    exam_id: int,
    submission: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify enrollment
    enrollment = db.query(models.ExamEnrollment).filter(
        models.ExamEnrollment.user_id == current_user.id,
        models.ExamEnrollment.exam_id == exam_id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled in this exam")
    
    # Store file
    file_path = await storage.upload_file(submission, f"submissions/{exam_id}")
    
    # Update DB
    enrollment.submission_path = file_path
    enrollment.submitted_at = datetime.utcnow()
    enrollment.status = "Submitted"
    db.commit()
    
    return {"message": "Exam submitted successfully"}

