from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load the variables from .env file
load_dotenv()

# get the database URL
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Create the engine: This is what actually communicates with postgres
# Added pool_pre_ping to fix "server closed the connection unexpectedly" errors with Supabase
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600
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
