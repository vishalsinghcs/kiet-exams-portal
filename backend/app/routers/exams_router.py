from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
import os

from app.database import get_db
from app import schemas, storage
from app.dependencies import get_current_user, get_teacher_or_admin
from app.models import User

# Import Services & Repositories
from app.services.exam_service import exam_service
from app.services.enrollment_service import enrollment_service
from app.repositories.enrollment_repository import enrollment_repo

router = APIRouter(tags=["Exams"])

# ==========================
# === TEACHER DASHBOARD ====
# ==========================
@router.post("/admin/exams")
async def create_exam(
    code: str = Form(...),
    access_code: str = Form(...),
    subject: str = Form(...),
    exam_name: str = Form(...),
    duration: int = Form(...),
    start_time: str = Form(...),
    extra_sections: str = Form(None),
    dataset: UploadFile = File(None),
    sample_csv: UploadFile = File(None),
    user: User = Depends(get_teacher_or_admin),
    db: Session = Depends(get_db)
):
    """Teacher creates an exam and uploads dataset files."""
    # Handle File Uploads in the Router
    dataset_path = await storage.upload_file(dataset, "datasets") if dataset else None
    sample_csv_path = await storage.upload_file(sample_csv, "samples") if sample_csv else None

    from datetime import datetime
    import json
    
    try:
        exam_sections_json = json.loads(extra_sections) if extra_sections else []
    except json.JSONDecodeError:
        exam_sections_json = []

    exam_data = {
        "subject_code": code,
        "access_code": access_code,
        "subject": subject,
        "exam_name": exam_name,
        "duration": duration,
        "start_time": datetime.fromisoformat(start_time.replace("Z", "+00:00")),
        "exam_sections": exam_sections_json,
        "dataset_path": dataset_path,
        "sample_csv_path": sample_csv_path
    }

    # Hand off to the Service layer!
    return exam_service.create_exam(db, teacher_id=user.id, exam_data=exam_data)

@router.get("/admin/exams/all")
def get_all_exams(user: User = Depends(get_teacher_or_admin), db: Session = Depends(get_db)):
    """Teacher fetches all their exams."""
    return exam_service.get_teacher_exams(db, teacher_id=user.id)

@router.delete("/admin/exams/{exam_id}")
def delete_exam(exam_id: UUID, user: User = Depends(get_teacher_or_admin), db: Session = Depends(get_db)):
    """Teacher deletes an exam."""
    return exam_service.delete_exam(db, teacher_id=user.id, exam_id=exam_id)

@router.post("/admin/exams/{exam_id}/assign-section")
def assign_section_to_exam(exam_id: UUID, data: schemas.SectionAssignRequest, user: User = Depends(get_teacher_or_admin), db: Session = Depends(get_db)):
    """Teacher assigns an exam to a specific student batch."""
    return exam_service.assign_exam_to_batch(
        db, 
        teacher_id=user.id, 
        exam_id=exam_id, 
        enrollment_year=data.enrollment_year, 
        branch=data.branch, 
        section=data.section
    )

@router.get("/admin/submissions/{enrollment_id}/download")
def download_submission(enrollment_id: UUID, user: User = Depends(get_teacher_or_admin), db: Session = Depends(get_db)):
    """Teacher downloads a student's CSV."""
    enrollment = enrollment_repo.get_by_id(db, enrollment_id)
    if not enrollment or not enrollment.csv_submission_path:
        raise HTTPException(status_code=404, detail="CSV file not found")
    
    filename = os.path.basename(enrollment.csv_submission_path)
    return storage.get_file_response(enrollment.csv_submission_path, filename)

@router.get("/admin/submissions/{enrollment_id}/notebook")
def download_notebook(enrollment_id: UUID, user: User = Depends(get_teacher_or_admin), db: Session = Depends(get_db)):
    """Teacher downloads a student's Jupyter Notebook."""
    enrollment = enrollment_repo.get_by_id(db, enrollment_id)
    if not enrollment or not enrollment.notebook_submission_path:
        raise HTTPException(status_code=404, detail="Notebook file not found")
    
    filename = os.path.basename(enrollment.notebook_submission_path)
    return storage.get_file_response(enrollment.notebook_submission_path, filename)


# ==========================
# === STUDENT DASHBOARD ====
# ==========================
@router.get("/users/me/exams")
def get_my_exams(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Student fetches exams assigned to their batch."""
    return exam_service.get_student_available_exams(
        db, 
        enrollment_year=getattr(current_user, 'enrollment_year', 2024), 
        branch=current_user.branch, 
        section=current_user.section
    )

@router.post("/users/me/exams/{exam_id}/verify-code")
def verify_exam_code(exam_id: UUID, request: schemas.VerifyExamCodeRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Student enters the 6-digit pin to start the exam."""
    return enrollment_service.start_exam(db, user_id=current_user.id, exam_id=exam_id, access_code=request.code)

@router.post("/users/me/exams/{exam_id}/upload")
async def upload_exam_file(
    exam_id: UUID, 
    file_type: str = Form(...), # "csv" or "ipynb"
    file: UploadFile = File(...), 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Student uploads a file. This does NOT submit the exam."""
    enrollment = enrollment_repo.get_enrollment(db, current_user.id, exam_id)
    if not enrollment:
        raise HTTPException(status_code=403, detail="You have not started this exam.")
        
    file_path = await storage.upload_file(file, f"submissions/{exam_id}")
    
    if file_type == "csv":
        enrollment_repo.update(db, enrollment, {"csv_submission_path": file_path})
    elif file_type == "ipynb":
        enrollment_repo.update(db, enrollment, {"notebook_submission_path": file_path})
    else:
        raise HTTPException(status_code=400, detail="file_type must be 'csv' or 'ipynb'")
        
    return {"message": f"{file_type} uploaded successfully. Remember to click Finish Test!"}

@router.post("/users/me/exams/{exam_id}/submit")
def submit_exam(exam_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Student clicks 'Finish Test'. Will fail if both files aren't uploaded."""
    return enrollment_service.submit_exam(db, user_id=current_user.id, exam_id=exam_id)
