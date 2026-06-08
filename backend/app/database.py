from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool, QueuePool
import os
from dotenv import load_dotenv

# Load the variables from .env file
load_dotenv()

# Get the database URL from environment
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Auto-detect which database provider is being used from the DATABASE_URL.
#
# Supabase uses PgBouncer (transaction mode) — NullPool is required here.
# It opens a fresh connection per request and closes it immediately, preventing
# SQLAlchemy's retry logic from re-executing a committed INSERT on a new
# connection (which would cause duplicate rows).
#
# AWS RDS is a direct PostgreSQL connection with no middleware.
# A proper connection pool keeps persistent connections ready,
# handling 1000+ concurrent users efficiently.

if not SQLALCHEMY_DATABASE_URL:
    print("\n[CRITICAL ERROR] DATABASE_URL is not set! Did you forget to add Environment Variables in Render?\n")
    SQLALCHEMY_DATABASE_URL = ""

if "supabase" in SQLALCHEMY_DATABASE_URL:
    print("[DB] Detected: Supabase — using NullPool (PgBouncer compatible)")
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        poolclass=NullPool,
    )
else:
    print("[DB] Detected: AWS RDS — using QueuePool (pool_size=10, max_overflow=20)")
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        poolclass=QueuePool,
        pool_size=10,        # Keep 10 persistent connections ready
        max_overflow=20,     # Allow up to 20 extra connections during traffic spikes
        pool_pre_ping=True,  # Test connection health before use (auto-reconnects if RDS restarts)
        pool_recycle=300,    # Recycle connections every 5 min to avoid stale connections
    )

# Create a SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a base class
# Our database models (tables) will inherit from this class
Base = declarative_base()


# This is a helper function to get a database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
