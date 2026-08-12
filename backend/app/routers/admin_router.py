from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import schemas
from app.dependencies import get_admin_user
from app.models import User, Exam, ExamEnrollment
from app.repositories.user_repository import user_repo

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/teachers", response_model=list[schemas.UserResponse])
def get_teachers(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Fetch a list of all teachers."""
    return user_repo.get_all_by_role(db, role="teacher")

@router.post("/teachers")
def add_teacher(request: schemas.EmailRequest, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Promote a student to a teacher."""
    user = user_repo.get_by_email(db, request.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin" or getattr(user, "is_admin", False):
        raise HTTPException(status_code=400, detail="Cannot modify an admin user")
        
    user_repo.update(db, user, {"role": "teacher"})
    return {"message": f"{request.email} is now a teacher."}

@router.delete("/teachers/{user_id}")
def revoke_teacher(user_id: str, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Demote a teacher back to a student."""
    user = user_repo.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != "teacher":
        raise HTTPException(status_code=400, detail="User is not a teacher")
        
    user_repo.update(db, user, {"role": "student"})
    return {"message": "Teacher access revoked."}

@router.get("/sections/{branch}/{section}/count")
def get_section_count(branch: str, section: str, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Count students in a specific branch and section."""
    count = db.query(User).filter(User.role == "student", User.branch == branch, User.section == section).count()
    return {"count": count}

@router.get("/stats")
def get_admin_stats(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Quick high-level stats for the admin dashboard."""
    # Basic counting is fine to leave as raw queries since it's just telemetry!
    total_students = db.query(User).filter(User.role == "student").count()
    total_exams = db.query(Exam).count()
    total_enrollments = db.query(ExamEnrollment).count()
    return {
        "total_students": total_students,
        "total_exams": total_exams,
        "total_enrollments": total_enrollments
    }
