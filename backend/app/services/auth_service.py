import random
from sqlalchemy.orm import Session
from fastapi import HTTPException
import os
from datetime import datetime, timedelta
from app.repositories.user_repository import user_repo
from app.repositories.token_repository import token_repo
from app.services.email_service import send_otp_email
from app.utils.security import get_password_hash, verify_password, create_access_token
from app.models import VerificationToken, User, ExamEnrollment
from app.utils.logger import logger
from app.redis_client import redis_client

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

        # 2.5 Check Concurrent Sessions via Redis (Block if already logged in)
        if redis_client and user.role == "student":
            session_key = f"session:{user.id}"
            if redis_client.exists(session_key):
                logger.warning(f"Login failed: Concurrent session detected for {email}")
                raise HTTPException(status_code=403, detail="You are already logged in on another device. Please logout first or contact the invigilator.")
            
            # Set session in Redis with TTL matching JWT token expiration (e.g. 210 mins)
            expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 210))
            redis_client.setex(session_key, timedelta(minutes=expire_minutes), "active")

        # 3. Generate the JWT (The "Building Key")
        jwt_token = create_access_token(data={
            "sub": str(user.id),
            "role": user.role
        })

        logger.info(f"Login successful for {email} with role {user.role}")

        # 4. If the user is a student, increment their login_count on any active exams
        if user.role == "student":
            active_enrollments = db.query(ExamEnrollment).filter(
                ExamEnrollment.user_id == user.id,
                ExamEnrollment.status == "in_progress"
            ).all()
            if active_enrollments:
                for enrollment in active_enrollments:
                    enrollment.login_count += 1
                db.commit()
                logger.info(f"Incremented login_count for {len(active_enrollments)} active exams for {email}")

        return {
            "access_token": jwt_token,
            "token_type": "bearer",
            "role": user.role
        }

    def logout(self, db: Session, user_id):
        # 1. Check if the user is currently taking an exam
        active_enrollments = db.query(ExamEnrollment).filter(
            ExamEnrollment.user_id == user_id,
            ExamEnrollment.status == "in_progress"
        ).first()
        
        if active_enrollments:
            logger.warning(f"Logout blocked for user_id {user_id}: Exam in progress")
            raise HTTPException(status_code=403, detail="Cannot logout while an exam is in progress. Please submit the exam first.")

        # 2. Clear Session
        if redis_client:
            session_key = f"session:{user_id}"
            redis_client.delete(session_key)
            logger.info(f"Logout successful for user_id: {user_id}. Redis session cleared.")
        return {"message": "Logged out successfully"}

auth_service = AuthService()
