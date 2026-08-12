import os
import jwt
from datetime import datetime, timedelta
from passlib.context import CryptContext
from dotenv import load_dotenv

# Load variables from .env strictly
load_dotenv()

# --- CONFIGURATIONS ---
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))

# Setup Passlib for Bcrypt password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# === 1. PASSWORD HASHING ===
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check if the typed password matches the database hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Convert a plain password into a secure Bcrypt hash."""
    return pwd_context.hash(password)


# === 2. JWT TOKENS ===
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """
    Generate a JWT token for a logged-in user.
    The 'data' dict will contain their user_id and role.
    """
    to_encode = data.copy()
    
    # Calculate expiration time
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
    # Add expiration time to the payload
    to_encode.update({"exp": expire})
    
    # Sign the token cryptographically
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt