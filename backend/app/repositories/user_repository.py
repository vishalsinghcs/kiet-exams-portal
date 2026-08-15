from sqlalchemy.orm import Session
from app.models import User
from app.repositories.base import CRUDBase
from app.utils.logger import logger

class CRUDUser(CRUDBase[User]):

    def get_by_email(self, db:Session, email:str) -> User | None:
        """Fetch a user by their email address from Login/Auth."""
        return db.query(self.model).filter(self.model.email == email).first()

    def get_by_registration_number(self, db:Session, reg_no: str) -> User | None:
        """Fetch a user by their registration number.
           Ensure no duplicate registration numbers exist."""
        return db.query(self.model).filter(self.model.registration_number == reg_no).first()

    def get_all_by_role(self, db:Session, role: str) -> list[User]:
        """Fetch all users that have a specific role."""
        return db.query(self.model).filter(self.model.role == role).all()

    def create(self, db: Session, obj_in: dict):
        logger.info(f"Database: Creating new user with email {obj_in.get('email')}")
        user = super().create(db, obj_in)
        logger.debug(f"Database: Successfully created user {user.id}")
        return user

user_repo = CRUDUser(User)