from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime

# 1. The rules for signing up
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

    # This is the custom rule to ensure only KIET students can sign up
    @field_validator('email')
    def validate_kiet_email(cls, v):
        if not v.endswith('@kiet.edu'):
            raise ValueError('Registration is restricted to @kiet.edu domains only')
        return v

# 2. The rules for what we send back to the user (Notice we don't send the password back!)
class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# 3. The rules for the Login Token
class Token(BaseModel):
    access_token: str
    token_type: str
