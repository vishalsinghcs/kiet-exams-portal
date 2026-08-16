import random
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.repositories.user_repository import user_repo
from app.repositories.token_repository import token_repo
from app.services.email_service import send_otp_email
from app.utils.security import get_password_hash, verify_password, create_access_token
from app.models import VerificationToken, User
from app.utils.logger import logger

class AuthService:

    def _generate_otp(self) -> str:
        """Internal helper to generate a 6-digit OTP."""
        return "".join(str(random.SystemRandom().randint(0, 9)) for _ in range(6))

    # === SIGNUP PHASE 1: Send OTP ===
    def initiate_signup(self, db: Session, email: str):
        logger.debug(f"Initiating signup for {email}")
        # 1. Check if user already exists
        if user_repo.get_by_email(db, email):
            logger.warning(f"Signup failed: Email {email} already registered.")
            raise HTTPException(status_code=400, detail="Email already registered")

        # 2. Clean up any old OTPs for this email to prevent spam
        token_repo.delete_all_for_user(db, email, token_type="signup")

        # 3. Generate and save new OTP
        otp_code = self._generate_otp()
        # Expires in 15 minutes
        from datetime import datetime, timedelta
        expires = datetime.utcnow() + timedelta(minutes=15)
        
        token_repo.create(db, obj_in={
            "email": email,
            "token": otp_code,
            "token_type": "signup",
            "expires_at": expires
        })

        # 4. Send the Email via Brevo!
        send_otp_email(to_email=email, otp=otp_code, purpose="signup")
        return {"message": "OTP sent successfully to email."}

    # === SIGNUP PHASE 2: Verify & Create User ===
    def complete_signup(self, db: Session, email: str, otp: str, name: str, password: str, branch: str, section: str, reg_no: str):
        logger.info(f"Attempting to complete signup for {email}")
        # 1. Verify the OTP is correct
        token = token_repo.get_valid_token(db, email, otp, "signup")
        if not token:
            logger.warning(f"Signup verification failed: Invalid OTP for {email}")
            raise HTTPException(status_code=400, detail="Invalid OTP")
            
        from datetime import datetime
        if token.expires_at < datetime.utcnow():
            raise HTTPException(status_code=400, detail="OTP has expired")

        # 2. Hash the password
        hashed_pw = get_password_hash(password)

        # 3. Save the new user to the database (Defaults to "student" role)
        new_user = user_repo.create(db, obj_in={
            "email": email,
            "name": name,
            "password_hash": hashed_pw,
            "branch": branch,
            "section": section,
            "registration_number": reg_no,
            "role": "student"
        })

        # 4. Cleanup the OTP so it can't be reused
        token_repo.delete_all_for_user(db, email, "signup")

        return {"message": "User created successfully", "user_id": new_user.id}

    # === LOGIN PHASE ===
    def login(self, db: Session, email: str, password: str):
        logger.debug(f"Attempting login for {email}")
        # 1. Fetch user
        user = user_repo.get_by_email(db, email)
        if not user:
            logger.warning(f"Login failed: User not found for email {email}")
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # 2. Verify Password
        if not verify_password(password, user.password_hash):
            logger.warning(f"Login failed: Invalid password for email {email}")
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # 3. Generate the JWT (The "Building Key")
        jwt_token = create_access_token(data={
            "sub": str(user.id),
            "role": user.role
        })

        logger.info(f"Login successful for {email} with role {user.role}")


        return {
            "access_token": jwt_token,
            "token_type": "bearer",
            "role": user.role
        }

auth_service = AuthService()
