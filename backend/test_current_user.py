from database import SessionLocal
from models import User
from schemas import UserResponse

db = SessionLocal()
try:
    user = db.query(User).filter(User.email == "admin@kiet.edu").first()
    if user:
        print("User from DB:", user.email, user.is_admin)
        try:
            res = UserResponse.model_validate(user)
            print("Pydantic Validation Success:", res.model_dump())
        except Exception as e:
            print("Pydantic Error:", e)
finally:
    db.close()
