from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
from datetime import datetime

# Import our custom files
from database import engine, Base, get_db
import models, schemas, auth

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

@app.post("/signup", response_model=schemas.UserResponse)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # 1. Exam Day Constraint: Block signups if today is the Exam Date
    exam_date_str = os.getenv("EXAM_DATE")
    if exam_date_str:
        exam_date = datetime.strptime(exam_date_str, "%Y-%m-%d").date()
        if datetime.now().date() >= exam_date:
            raise HTTPException(status_code=403, detail="Registration is closed on Exam Day.")

    # 2. Check if the email is already registered
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 3. Hash the password and save to Database
    hashed_pwd = auth.get_password_hash(user.password)
    new_user = models.User(name=user.name, email=user.email, hashed_password=hashed_pwd)
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/login", response_model=schemas.Token)
def login(credentials: schemas.LoginRequest, db: Session = Depends(get_db)):
    # Look up user by email
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    
    if not user or not auth.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # Generate the JWT Token
    access_token = auth.create_access_token(data={"sub": user.email})
    
    # (Later, we will add the Redis session checking right here!)
    
    return {"access_token": access_token, "token_type": "bearer"}
