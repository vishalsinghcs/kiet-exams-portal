from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
import os

from app.database import get_db
from app import schemas, storage
from app.dependencies import get_current_user, get_teacher_or_admin
from app.models import User, ExamSectionAssignment, ExamEnrollment

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

@router.get("/admin/exams/{exam_id}/sections")
def get_assigned_sections(exam_id: UUID, user: User = Depends(get_teacher_or_admin), db: Session = Depends(get_db)):
    """Fetch all sections assigned to an exam."""
    return db.query(ExamSectionAssignment).filter(ExamSectionAssignment.exam_id == exam_id).all()

@router.delete("/admin/exams/{exam_id}/assign-section")
def revoke_assigned_section(exam_id: UUID, data: schemas.SectionAssignRequest, user: User = Depends(get_teacher_or_admin), db: Session = Depends(get_db)):
    """Teacher revokes an exam assignment from a batch."""
    assignment = db.query(ExamSectionAssignment).filter(
        ExamSectionAssignment.exam_id == exam_id,
        ExamSectionAssignment.branch == data.branch,
        ExamSectionAssignment.section == data.section
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(assignment)
    db.commit()
    return {"message": "Assignment revoked"}

@router.post("/admin/exams/{exam_id}/assign-section")
def assign_section_to_exam(exam_id: UUID, data: schemas.SectionAssignRequest, user: User = Depends(get_teacher_or_admin), db: Session = Depends(get_db)):
    """Teacher assigns an exam to a specific student batch."""
    exam_service.assign_exam_to_batch(
        db, 
        teacher_id=user.id, 
        exam_id=exam_id, 
        enrollment_year=2024, 
        branch=data.branch, 
        section=data.section
    )
    return {"message": "Exam successfully assigned"}

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


@router.get("/admin/exams/{exam_id}/results", response_model=schemas.ExamResultsResponse)
def get_exam_results(exam_id: UUID, user: User = Depends(get_teacher_or_admin), db: Session = Depends(get_db)):
    """Teacher views the results of all students assigned to an exam."""
    
    # 1. Fetch assigned sections
    assignments = db.query(ExamSectionAssignment).filter(ExamSectionAssignment.exam_id == exam_id).all()
    if not assignments:
        return {"assigned": 0, "submitted": 0, "pending": 0, "results": []}

    # 2. Extract branch and section tuples
    branches_sections = [(a.branch, a.section) for a in assignments]

    # 3. Fetch all students matching the branches and sections
    students = []
    for branch, section in branches_sections:
        students.extend(db.query(User).filter(User.role == "student", User.branch == branch, User.section == section).all())

    # 4. Fetch enrollments for this exam
    enrollments = db.query(ExamEnrollment).filter(ExamEnrollment.exam_id == exam_id).all()
    enrollment_map = {e.user_id: e for e in enrollments}

    # 5. Build results
    results = []
    assigned_count = len(students)
    submitted_count = 0
    pending_count = 0

    for student in students:
        enrollment = enrollment_map.get(student.id)
        status = enrollment.status if enrollment else "pending"
        
        if status == "submitted":
            submitted_count += 1
        else:
            pending_count += 1

        results.append({
            "id": enrollment.user_id if enrollment else student.id, 
            "name": student.name,
            "email": student.email,
            "branch": student.branch,
            "section": student.section,
            "status": status,
            "submitted_at": enrollment.submitted_at if enrollment else None,
            "has_submission": bool(enrollment and enrollment.csv_submission_path),
            "has_notebook": bool(enrollment and enrollment.notebook_submission_path),
        })

    return {
        "assigned": assigned_count,
        "submitted": submitted_count,
        "pending": pending_count,
        "results": results
    }

# ==========================
# === STUDENT DASHBOARD ====
# ==========================
@router.get("/users/me/exams", response_model=list[schemas.AssignedExamResponse])
def get_my_exams(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Student fetches exams assigned to their batch, with real-time status."""
    student_year = current_user.enrollment_year if current_user.enrollment_year else 2024
    
    exams = exam_service.get_student_available_exams(
        db, 
        enrollment_year=student_year, 
        branch=current_user.branch, 
        section=current_user.section
    )
    
    if not exams:
        return []
        
    exam_ids = [ex.id for ex in exams]
    enrollments = db.query(ExamEnrollment).filter(
        ExamEnrollment.user_id == current_user.id,
        ExamEnrollment.exam_id.in_(exam_ids)
    ).all()
    
    enrollment_map = {e.exam_id: e for e in enrollments}
    
    response = []
    for ex in exams:
        enrollment = enrollment_map.get(ex.id)
        response.append({
            "id": ex.id,
            "subject_code": ex.subject_code,
            "subject": ex.subject,
            "exam_name": ex.exam_name,
            "duration": ex.duration,
            "start_time": ex.start_time,
            "exam_sections": ex.exam_sections,
            "status": enrollment.status if enrollment else "pending"
        })
        
    return response

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
