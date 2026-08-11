from sqlalchemy.orm import Session
from fastapi import HTTPException
from uuid import UUID
from app.repositories.user_repository import user_repo

class UserService:

    def get_profile(self, db: Session, user_id: UUID) -> dict:
        """Fetch a user profile and strip out sensitive data like passwords."""
        user = user_repo.get_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        # Security Filter: Never return the password_hash!
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "registration_number": user.registration_number,
            "role": user.role,
            "batch_id": user.batch_id,
            "avatar_path": user.avatar_path,
            "created_at": user.created_at
        }
        
    def update_profile(self, db: Session, user_id: UUID, update_data: dict):
        """Update basic profile information (like avatar or name)."""
        user = user_repo.get_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        # The dumb repository handles the dynamic update
        user_repo.update(db, user, update_data)
        return {"message": "Profile updated successfully"}

user_service = UserService()
