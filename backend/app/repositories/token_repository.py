from sqlalchemy.orm import Session
from app.models import VerificationToken
from app.repositories.base import CRUDBase

class CRUDToken(CRUDBase[VerificationToken]):

    # === FIND TOKEN BY USER ID ===
    def get_valid_token(self, db:Session, user_id:UUID, token: str, token_type: str)->VerificationToken | None:
        """Used during OTP Verification. 
        Finds a token that matches the User, the OTP String, and the token type
        """
        return (
            db.query(self.model)
            .filter(self.model.user_id == user_id)
            .filter(self.model.token == token)
            .filter(self.model.token_type == token_type)
            .first()
        )

    def delete_all_for_user(self, db:Session, user_id:UUID, token_type:str) -> None:
        """
        Used for Spam Prevention.
        Destroys all previous OTPs of a specific type before we generate a new one.
        """
        db.query(self.model).filter(
            self.model.user_id == user_id, 
            self.model.token_type == token_type
        ).delete()
        db.commit()

token_repo = CRUDToken(VerificationToken)