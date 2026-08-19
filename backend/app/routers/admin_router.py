from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import schemas
from app.dependencies import get_admin_user
from app.models import User, Exam, ExamEnrollment
from app.repositories.user_repository import user_repo
from app.utils.logger import logger

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/teachers", response_model=list[schemas.UserResponse])
def get_teachers(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Fetch a list of all teachers."""
    logger.info(f"Admin action: Fetching all teachers [admin_id={admin.id}]")
    return user_repo.get_all_by_role(db, role="teacher")

@router.post("/teachers")
def add_teacher(request: schemas.EmailRequest, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Promote a student to a teacher."""
    logger.info(f"Admin action: Promoting user to teacher [admin_id={admin.id} target_email={request.email}]")
    user = user_repo.get_by_email(db, request.email)
    if not user:
        logger.warning(f"Failed to promote: User not found [admin_id={admin.id} target_email={request.email}]")
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin" or getattr(user, "is_admin", False):
        logger.warning(f"Failed to promote: Cannot modify admin user [admin_id={admin.id} target_email={request.email}]")
        raise HTTPException(status_code=400, detail="Cannot modify an admin user")
        
    user_repo.update(db, user, {"role": "teacher"})
    logger.info(f"Successfully promoted user to teacher [admin_id={admin.id} target_email={request.email}]")
    return {"message": f"{request.email} is now a teacher."}

@router.delete("/teachers/{user_id}")
def revoke_teacher(user_id: str, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Demote a teacher back to a student."""
    logger.info(f"Admin action: Demoting teacher to student [admin_id={admin.id} target_user_id={user_id}]")
    user = user_repo.get_by_id(db, user_id)
    if not user:
        logger.warning(f"Failed to demote: User not found [admin_id={admin.id} target_user_id={user_id}]")
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != "teacher":
        logger.warning(f"Failed to demote: User is not a teacher [admin_id={admin.id} target_user_id={user_id}]")
        raise HTTPException(status_code=400, detail="User is not a teacher")
        
    user_repo.update(db, user, {"role": "student"})
    logger.info(f"Successfully demoted teacher [admin_id={admin.id} target_user_id={user_id}]")
    return {"message": "Teacher access revoked."}

@router.get("/sections/{branch}/{section}/count")
def get_section_count(branch: str, section: str, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Count students in a specific branch and section."""
    logger.info(f"Admin action: Fetching section count [admin_id={admin.id} branch={branch} section={section}]")
    count = db.query(User).filter(User.role == "student", User.branch == branch, User.section == section).count()
    return {"count": count}

@router.get("/stats")
def get_admin_stats(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Quick high-level stats for the admin dashboard."""
    logger.info(f"Admin action: Fetching platform stats [admin_id={admin.id}]")
    # Basic counting is fine to leave as raw queries since it's just telemetry!
    total_students = db.query(User).filter(User.role == "student").count()
    total_exams = db.query(Exam).count()
    total_enrollments = db.query(ExamEnrollment).count()
    return {
        "total_students": total_students,
        "total_exams": total_exams,
        "total_enrollments": total_enrollments
    }

from app.redis_client import redis_client
from pydantic import BaseModel

class ForceLogoutRequest(BaseModel):
    identifier: str # Email or Registration Number

@router.post("/force-logout")
def force_logout_student(request: ForceLogoutRequest, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Forcefully logout a student by deleting their Redis session."""
    logger.info(f"Admin action: Force logout triggered [admin_id={admin.id} target_identifier={request.identifier}]")
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis is not configured. Session blocking is disabled.")
    
    # 1. Find user by email or registration number
    user = db.query(User).filter(
        (User.email == request.identifier) | (User.registration_number == request.identifier)
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Student not found.")
        
    # 2. Clear Session
    session_key = f"session:{user.id}"
    if redis_client.exists(session_key):
        redis_client.delete(session_key)
        logger.info(f"Force logout successful for user_id={user.id}")
        return {"message": f"Session forcefully terminated for {user.name}."}
    else:
        return {"message": f"No active session found for {user.name}."}

from fastapi import Header
import os
from datetime import datetime, timedelta

MAINTENANCE_API_KEY = os.getenv("MAINTENANCE_API_KEY", "default-secret-key")

def verify_maintenance_key(x_api_key: str = Header(...)):
    if x_api_key != MAINTENANCE_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")

class MaintenanceModeRequest(BaseModel):
    enabled: bool

@router.post("/maintenance-mode")
def toggle_maintenance_mode(request: MaintenanceModeRequest, key: str = Depends(verify_maintenance_key)):
    """Toggle the global maintenance mode for server shifting."""
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis is not configured.")
    if request.enabled:
        redis_client.set("maintenance_mode", "true")
        logger.info("Maintenance mode ENABLED via API")
    else:
        redis_client.set("maintenance_mode", "false")
        logger.info("Maintenance mode DISABLED via API")
    return {"message": f"Maintenance mode set to {request.enabled}"}

class ScheduleMaintenanceRequest(BaseModel):
    minutes: int

@router.post("/schedule-maintenance")
def schedule_maintenance(request: ScheduleMaintenanceRequest, key: str = Depends(verify_maintenance_key)):
    """Set a warning timer in Redis before actual maintenance begins."""
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis is not configured.")
    
    end_time = datetime.utcnow() + timedelta(minutes=request.minutes)
    iso_string = end_time.isoformat() + "Z"
    
    # Store for 2 hours (in case workflow fails, it naturally expires)
    redis_client.setex("maintenance_timer_end", 7200, iso_string)
    
    logger.info(f"Maintenance scheduled in {request.minutes} minutes.")
    return {"message": f"Maintenance scheduled at {iso_string}", "timestamp": iso_string}
