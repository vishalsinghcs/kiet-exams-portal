import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Safety check: NEVER run tests against production databases
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://test_user:test_password@localhost:5432/test_db")
if "supabase" in DATABASE_URL or "rds.amazonaws" in DATABASE_URL:
    raise RuntimeError("CRITICAL DANGER: You are trying to run tests against a production database! This would DROP ALL TABLES. Aborting.")

os.environ["DATABASE_URL"] = DATABASE_URL
os.environ["SECRET_KEY"] = "test_secret_key"

from app.main import app
from app.database import Base, get_db

# Create test engine and session
engine = create_engine(DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def db_engine():
    # Setup tables
    Base.metadata.create_all(bind=engine)
    yield engine
    # Teardown tables after tests
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(db_engine):
    """Returns a sqlalchemy session, and rolls back transactions after the test."""
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    """Returns a TestClient with the database dependency overridden."""
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

# Mock out email sending so tests don't send emails
@pytest.fixture(autouse=True)
def mock_send_email(monkeypatch):
    def fake_send_email(*args, **kwargs):
        print(f"Mock email sent! {args} {kwargs}")
        pass
    
    # We must patch it where it is imported/used
    try:
        from app.services.email_service import send_otp_email
        monkeypatch.setattr("app.services.auth_service.send_otp_email", fake_send_email)
    except ImportError:
        pass
