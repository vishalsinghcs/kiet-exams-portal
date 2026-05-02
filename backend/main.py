from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
import random
import string
from datetime import datetime, timedelta

# Import our custom files
from database import engine, Base, get_db
import models, schemas, auth, email_service

# Create the tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="KIET Exams Portal")

# Allow the React frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, change this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def generate_otp(length=6):
    """Generate a random numeric OTP"""
    return ''.join(random.choices(string.digits, k=length))

# ==================== SIGNUP FLOW ====================

@app.post("/signup")
def signup_request_otp(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # 1. Exam Day Constraint
    exam_date_str = os.getenv("EXAM_DATE")
    if exam_date_str:
        exam_date = datetime.strptime(exam_date_str, "%Y-%m-%d").date()
        if datetime.now().date() >= exam_date:
            raise HTTPException(status_code=403, detail="Registration is closed on Exam Day.")

    # 2. Check if the email is already registered
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 3. Clean up any old OTPs for this email to avoid spam
    db.query(models.VerificationToken).filter(
        models.VerificationToken.email == user.email,
        models.VerificationToken.token_type == 'signup_otp'
    ).delete()

    # 4. Generate and save OTP
    otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    token_entry = models.VerificationToken(
        email=user.email,
        token=otp,
        token_type='signup_otp',
        expires_at=expires_at
    )
    db.add(token_entry)
    db.commit()

    # 5. Send OTP Email
    email_service.send_otp_email(user.email, otp, purpose="signup")
    
    return {"message": "OTP sent successfully"}

@app.post("/verify-otp", response_model=schemas.Token)
def verify_signup_otp(data: schemas.OTPVerifyRequest, db: Session = Depends(get_db)):
    # 1. Check if OTP is valid
    token_entry = db.query(models.VerificationToken).filter(
        models.VerificationToken.email == data.email,
        models.VerificationToken.token_type == 'signup_otp',
        models.VerificationToken.token == data.otp
    ).first()

    if not token_entry:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    if datetime.utcnow() > token_entry.expires_at:
        db.delete(token_entry)
        db.commit()
        raise HTTPException(status_code=400, detail="OTP has expired")

    # 2. OTP is valid, create the user
    db_user = db.query(models.User).filter(models.User.email == data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pwd = auth.get_password_hash(data.password)
    new_user = models.User(name=data.name, email=data.email, hashed_password=hashed_pwd)
    
    db.add(new_user)
    
    # Clean up the OTP
    db.delete(token_entry)
    db.commit()

    # 3. Generate login token and return it
    access_token = auth.create_access_token(data={"sub": new_user.email})
    return {"access_token": access_token, "token_type": "bearer"}


# ==================== LOGIN FLOW ====================

@app.post("/login", response_model=schemas.Token)
def login(credentials: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    
    if not user or not auth.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


# ==================== FORGOT PASSWORD FLOW ====================

@app.post("/forgot-password")
def forgot_password_request_otp(data: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    
    # We still send a 200 OK even if user doesn't exist to prevent email enumeration attacks
    if user:
        # Clean up old password reset OTPs
        db.query(models.VerificationToken).filter(
            models.VerificationToken.email == data.email,
            models.VerificationToken.token_type == 'password_reset_otp'
        ).delete()

        otp = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=15)
        
        token_entry = models.VerificationToken(
            email=data.email,
            token=otp,
            token_type='password_reset_otp',
            expires_at=expires_at
        )
        db.add(token_entry)
        db.commit()

        email_service.send_otp_email(data.email, otp, purpose="password reset")

    return {"message": "If an account with that email exists, an OTP has been sent."}

@app.post("/reset-password")
def reset_password_with_otp(data: schemas.ResetPasswordOTPRequest, db: Session = Depends(get_db)):
    token_entry = db.query(models.VerificationToken).filter(
        models.VerificationToken.email == data.email,
        models.VerificationToken.token_type == 'password_reset_otp',
        models.VerificationToken.token == data.otp
    ).first()

    if not token_entry:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    if datetime.utcnow() > token_entry.expires_at:
        db.delete(token_entry)
        db.commit()
        raise HTTPException(status_code=400, detail="OTP has expired")

    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update password
    user.hashed_password = auth.get_password_hash(data.new_password)
    
    # Clean up OTP
    db.delete(token_entry)
    db.commit()

    return {"message": "Password updated successfully"}
