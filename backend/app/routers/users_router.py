from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.services.user_service import user_service
from app.models import User
from app.utils.logger import logger

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me")
def read_users_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Fetch the current logged-in user's profile securely."""
    logger.info(f"Incoming request to fetch profile [user_id={current_user.id}]")
    return user_service.get_profile(db, current_user.id)

@router.put("/me")
def update_user_profile(update_data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update basic profile details."""
    logger.info(f"Incoming request to update profile [user_id={current_user.id}]")
    return user_service.update_profile(db, current_user.id, update_data)
