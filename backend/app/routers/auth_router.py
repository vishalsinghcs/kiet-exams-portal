from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import schemas

# Import our Brain (The Service Layer)
from app.services.auth_service import auth_service

router = APIRouter(tags=["Auth"])

@router.post("/signup")
def signup_request_otp(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Step 1: Check email and send a 6-digit OTP."""
    # We pass the work directly to the Service Layer!
    return auth_service.initiate_signup(db, email=user.email)

@router.post("/verify-otp")
def verify_signup_otp(data: schemas.OTPVerifyRequest, db: Session = Depends(get_db)):
    """Step 2: Verify the OTP and create the User account."""
    return auth_service.complete_signup(
        db=db,
        email=data.email,
        otp=data.otp,
        name=data.name,
        password=data.password,
        branch=data.branch,
        section=data.section
    )

@router.post("/login")
def login(credentials: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Step 3: Verify password and return a JWT."""
    return auth_service.login(db, email=credentials.email, password=credentials.password)

from fastapi.security import OAuth2PasswordRequestForm
@router.post("/login/swagger", include_in_schema=False)
def login_swagger(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """A hidden endpoint just for Swagger UI's green Authorize button."""
    return auth_service.login(db, email=form_data.username, password=form_data.password)
