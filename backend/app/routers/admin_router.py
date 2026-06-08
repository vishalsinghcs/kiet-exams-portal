from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.dependencies import get_admin_user

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/teachers", response_model=list[schemas.UserResponse])
def get_teachers(admin: models.User = Depends(get_admin_user), db: Session = Depends(get_db)):
    return db.query(models.User).filter(models.User.role == "teacher").all()

@router.post("/teachers")
def add_teacher(request: schemas.EmailRequest, admin: models.User = Depends(get_admin_user), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin" or user.is_admin:
        raise HTTPException(status_code=400, detail="Cannot modify an admin user")
    
    user.role = "teacher"
    db.commit()
    return {"message": f"{request.email} is now a teacher."}

@router.delete("/teachers/{user_id}")
def revoke_teacher(user_id: int, admin: models.User = Depends(get_admin_user), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != "teacher":
        raise HTTPException(status_code=400, detail="User is not a teacher")
    
    user.role = "student"
    db.commit()
    return {"message": "Teacher access revoked."}

@router.get("/stats", response_model=schemas.AdminStatsResponse)
def get_admin_stats(admin: models.User = Depends(get_admin_user), db: Session = Depends(get_db)):
    total_students = db.query(models.User).filter(models.User.role == "student").count()
    total_exams = db.query(models.Exam).count()
    total_enrollments = db.query(models.ExamEnrollment).count()
    return {
        "total_students": total_students,
        "total_exams": total_exams,
        "total_enrollments": total_enrollments
    }
