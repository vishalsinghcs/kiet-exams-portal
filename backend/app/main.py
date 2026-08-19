from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os

from app.database import engine, Base
from app.routers import auth_router, users_router, admin_router, exams_router
from app.utils.logger import logger
from app.utils.telemetry import setup_telemetry
from app.redis_client import redis_client

# Create the tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="KIET Exams Portal")

@app.middleware("http")
async def maintenance_middleware(request: Request, call_next):
    if redis_client:
        try:
            maintenance_mode = redis_client.get("maintenance_mode")
            if maintenance_mode and maintenance_mode.decode('utf-8') == "true":
                if request.url.path == "/docs" or request.url.path == "/openapi.json":
                    return await call_next(request)
                return JSONResponse(status_code=503, content={"detail": "MAINTENANCE_MODE"})
            
            maintenance_timer_end = redis_client.get("maintenance_timer_end")
            response = await call_next(request)
            if maintenance_timer_end:
                response.headers["X-Maintenance-At"] = maintenance_timer_end.decode('utf-8')
            return response
        except Exception as e:
            logger.error(f"Maintenance middleware error: {e}")
            return await call_next(request)
    return await call_next(request)

# Initialize OpenTelemetry and logging instrumentation
setup_telemetry(app, engine)
logger.info("Starting KIET Exams Portal backend")
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

