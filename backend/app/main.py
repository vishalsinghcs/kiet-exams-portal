from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import auth_router, users_router, admin_router, exams_router

# Create the tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="KIET Exams Portal")

import os

# Get allowed origins from environment variable, splitting by comma
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,https://codeml.vercel.app")
allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

# Allow the React frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(admin_router.router)
app.include_router(exams_router.router)
