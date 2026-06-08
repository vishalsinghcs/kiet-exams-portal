from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import os
from dotenv import load_dotenv

# Load the variables from .env file
load_dotenv()

# get the database URL
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# NullPool is required for Supabase's PgBouncer (transaction mode).
# With a connection pool, SQLAlchemy may retry a failed statement on a new
# connection — which can re-execute a committed INSERT and create duplicate rows.
# NullPool opens a fresh connection per request and closes it immediately after,
# eliminating that retry path entirely.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    poolclass=NullPool,
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
