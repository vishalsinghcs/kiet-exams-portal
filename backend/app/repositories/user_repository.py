from sqlalchemy.orm import Session
from app.models import User
from app.repositories.base import CRUDBase

class CRUDUser(CRUDBase[User]):

    def get_by_email(self, db:Session, email:str) -> User | None:
        """Fetch a user by their email address from Login/Auth."""
        return db.query(self.model).filter(self.model.email == email).first()

    def get_by_registration_number(self, db:Session, reg_no: str) -> User | None:
        """Fetch a user by their registration number.
           Ensure no duplicate registration numbers exist."""
        return db.query(self.model).filter(self.model.registration_number == reg_no).first()

user_repo = CRUDUser(User)