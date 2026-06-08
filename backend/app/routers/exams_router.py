from fastapi import APIRouter, Depends, HTTPException, status, Form, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import os

from app.database import get_db
from app import models, schemas, storage
from app.dependencies import get_current_user, get_teacher_or_admin

router = APIRouter(tags=["Exams"])

def verify_exam_ownership(exam: models.Exam, user: models.User):
    if user.role != "admin" and not user.is_admin:
        if exam.created_by != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access Denied: You can only manage your own exams.")

@router.get("/users/me/exams", response_model=list[schemas.AssignedExamResponse])
def get_my_exams(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
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
            "status": enrollment.status,
            "overview": exam.overview,
            "extra_sections": exam.extra_sections
        })
    return results

@router.post("/admin/exams", response_model=schemas.ExamResponse)
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
    user: models.User = Depends(get_teacher_or_admin),
    db: Session = Depends(get_db)
):
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
        created_by=user.id
    )
    db.add(db_exam)
    db.commit()
    db.refresh(db_exam)
    return db_exam

@router.post("/admin/exams/assign")
def assign_exam(assign_data: schemas.ExamAssign, user: models.User = Depends(get_teacher_or_admin), db: Session = Depends(get_db)):
    student = db.query(models.User).filter(models.User.email == assign_data.email).first()
    if not student:
        raise HTTPException(status_code=404, detail="User not found")
        
    exam = db.query(models.Exam).filter(models.Exam.id == assign_data.exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    verify_exam_ownership(exam, user)
        
    existing = db.query(models.ExamEnrollment).filter(
        models.ExamEnrollment.user_id == student.id,
        models.ExamEnrollment.exam_id == exam.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Exam already assigned to this user")
        
    enrollment = models.ExamEnrollment(user_id=student.id, exam_id=exam.id)
    db.add(enrollment)
    db.commit()
    return {"message": "Exam assigned successfully"}

@router.get("/admin/exams/all", response_model=list[schemas.ExamResponse])
def get_all_exams(user: models.User = Depends(get_teacher_or_admin), db: Session = Depends(get_db)):
    query = db.query(models.Exam)
    if user.role != "admin" and not user.is_admin:
        query = query.filter(models.Exam.created_by == user.id)
    exams = query.order_by(models.Exam.created_at.desc()).all()
    return exams

@router.put("/admin/exams/{exam_id}", response_model=schemas.ExamResponse)
def update_exam(exam_id: int, exam_data: schemas.ExamCreate, user: models.User = Depends(get_teacher_or_admin), db: Session = Depends(get_db)):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    verify_exam_ownership(exam, user)

    now = datetime.now(timezone.utc)
    exam_start = exam.start_time.replace(tzinfo=timezone.utc) if exam.start_time.tzinfo is None else exam.start_time
    if now >= exam_start:
        raise HTTPException(status_code=400, detail="Cannot edit an exam that has already started")

    for field, value in exam_data.model_dump().items():
        setattr(exam, field, value)

    db.commit()
    db.refresh(exam)
    return exam

@router.delete("/admin/exams/{exam_id}")
def delete_exam(exam_id: int, user: models.User = Depends(get_teacher_or_admin), db: Session = Depends(get_db)):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    verify_exam_ownership(exam, user)

    db.query(models.ExamEnrollment).filter(models.ExamEnrollment.exam_id == exam_id).delete()
    db.delete(exam)
    db.commit()
    return {"message": "Exam deleted successfully"}

@router.post("/users/me/exams/{exam_id}/verify-code")
def verify_exam_code(exam_id: int, request: schemas.VerifyExamCodeRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    enrollment = db.query(models.ExamEnrollment).filter(
        models.ExamEnrollment.user_id == current_user.id,
        models.ExamEnrollment.exam_id == exam_id
    ).first()
    if not enrollment:
        raise HTTPException(status_code=403, detail="You are not enrolled in this exam")
    
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    if exam.access_code != request.code:
        raise HTTPException(status_code=400, detail="Invalid exam access code")
        
    return {"success": True, "message": "Code verified successfully"}

@router.get("/admin/sections/{branch}/{section}/count")
def get_section_student_count(
    branch: str,
    section: str,
    user: models.User = Depends(get_teacher_or_admin),
    db: Session = Depends(get_db)
):
    count = db.query(models.User).filter(
        models.User.branch == branch,
        models.User.section == section,
        models.User.is_admin == False
    ).count()
    return {"branch": branch, "section": section, "count": count}

@router.post("/admin/exams/{exam_id}/assign-section")
def assign_section_to_exam(
    exam_id: int,
    data: schemas.SectionAssignRequest,
    user: models.User = Depends(get_teacher_or_admin),
    db: Session = Depends(get_db)
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    verify_exam_ownership(exam, user)

    existing = db.query(models.ExamSectionAssignment).filter(
        models.ExamSectionAssignment.exam_id == exam_id,
        models.ExamSectionAssignment.branch == data.branch,
        models.ExamSectionAssignment.section == data.section
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"{data.branch} - Section {data.section} is already assigned to this exam")

    students = db.query(models.User).filter(
        models.User.branch == data.branch,
        models.User.section == data.section,
        models.User.is_admin == False
    ).all()

    enrolled_count = 0
    for student in students:
        already_enrolled = db.query(models.ExamEnrollment).filter(
            models.ExamEnrollment.user_id == student.id,
            models.ExamEnrollment.exam_id == exam_id
        ).first()
        if not already_enrolled:
            db.add(models.ExamEnrollment(user_id=student.id, exam_id=exam_id))
            enrolled_count += 1

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

@router.delete("/admin/exams/{exam_id}/assign-section")
def remove_section_from_exam(
    exam_id: int,
    data: schemas.SectionAssignRequest,
    user: models.User = Depends(get_teacher_or_admin),
    db: Session = Depends(get_db)
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    verify_exam_ownership(exam, user)
    
    student_ids = [
        u.id for u in db.query(models.User).filter(
            models.User.branch == data.branch,
            models.User.section == data.section
        ).all()
    ]

    removed = db.query(models.ExamEnrollment).filter(
        models.ExamEnrollment.exam_id == exam_id,
        models.ExamEnrollment.user_id.in_(student_ids)
    ).delete(synchronize_session=False)

    db.query(models.ExamSectionAssignment).filter(
        models.ExamSectionAssignment.exam_id == exam_id,
        models.ExamSectionAssignment.branch == data.branch,
        models.ExamSectionAssignment.section == data.section
    ).delete()

    db.commit()
    return {"message": f"Removed {removed} enrollments from {data.branch} - Section {data.section}"}

@router.get("/admin/exams/{exam_id}/sections", response_model=list[schemas.SectionAssignmentResponse])
def get_exam_section_assignments(
    exam_id: int,
    user: models.User = Depends(get_teacher_or_admin),
    db: Session = Depends(get_db)
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    verify_exam_ownership(exam, user)
    
    return db.query(models.ExamSectionAssignment).filter(
        models.ExamSectionAssignment.exam_id == exam_id
    ).all()

@router.get("/admin/exams/{exam_id}/results", response_model=schemas.ExamResultsResponse)
def get_exam_results(
    exam_id: int,
    user: models.User = Depends(get_teacher_or_admin),
    db: Session = Depends(get_db)
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    verify_exam_ownership(exam, user)
    
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
            "has_submission": bool(e.submission_path),
            "has_notebook": bool(e.notebook_path)
        })

    return {
        "assigned": assigned,
        "submitted": submitted,
        "pending": pending,
        "results": results_list
    }

@router.get("/admin/submissions/{enrollment_id}/download")
def download_submission(
    enrollment_id: int,
    user: models.User = Depends(get_teacher_or_admin),
    db: Session = Depends(get_db)
):
    enrollment = db.query(models.ExamEnrollment).filter(models.ExamEnrollment.id == enrollment_id).first()
    if not enrollment or not enrollment.submission_path:
        raise HTTPException(status_code=404, detail="Submission file not found")
    
    exam = db.query(models.Exam).filter(models.Exam.id == enrollment.exam_id).first()
    verify_exam_ownership(exam, user)
    
    filename = os.path.basename(enrollment.submission_path)
    return storage.get_file_response(enrollment.submission_path, filename)

@router.get("/admin/submissions/{enrollment_id}/notebook")
def download_notebook(
    enrollment_id: int,
    user: models.User = Depends(get_teacher_or_admin),
    db: Session = Depends(get_db)
):
    enrollment = db.query(models.ExamEnrollment).filter(models.ExamEnrollment.id == enrollment_id).first()
    if not enrollment or not enrollment.notebook_path:
        raise HTTPException(status_code=404, detail="Notebook file not found")
    
    exam = db.query(models.Exam).filter(models.Exam.id == enrollment.exam_id).first()
    verify_exam_ownership(exam, user)
    
    filename = os.path.basename(enrollment.notebook_path)
    return storage.get_file_response(enrollment.notebook_path, filename)

@router.post("/users/me/exams/{exam_id}/submit")
async def submit_exam(
    exam_id: int,
    submission: UploadFile = File(None),
    notebook: UploadFile = File(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not submission and not notebook:
        raise HTTPException(status_code=400, detail="Must upload at least one file (.csv or .ipynb)")

    enrollment = db.query(models.ExamEnrollment).filter(
        models.ExamEnrollment.user_id == current_user.id,
        models.ExamEnrollment.exam_id == exam_id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled in this exam")
    
    if submission:
        enrollment.submission_path = await storage.upload_file(submission, f"submissions/{exam_id}")
    if notebook:
        enrollment.notebook_path = await storage.upload_file(notebook, f"submissions/{exam_id}")
    
    enrollment.submitted_at = datetime.utcnow()
    enrollment.status = "Submitted"
    db.commit()
    
    return {"message": "Successfully submitted files"}
