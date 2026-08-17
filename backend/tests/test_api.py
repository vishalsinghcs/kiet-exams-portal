import pytest
from datetime import datetime, timedelta
from app.models import VerificationToken

def test_student_signup_and_login(client, db_session):
    # 1. Initiate Signup
    signup_data = {
        "email": "test_student@kiet.edu",
        "name": "Test Student",
        "password": "testpassword",
        "branch": "CSE AI",
        "section": "A",
        "registration_number": "123456789012345"
    }
    response = client.post("/signup", json=signup_data)
    assert response.status_code == 200
    assert response.json() == {"message": "OTP sent successfully to email."}

    # 2. Extract OTP from DB (bypassing email)
    token_obj = db_session.query(VerificationToken).filter(
        VerificationToken.email == "test_student@kiet.edu",
        VerificationToken.token_type == "signup"
    ).first()
    assert token_obj is not None
    otp = token_obj.token

    # 3. Verify OTP to complete signup
    verify_data = {
        "name": "Test Student",
        "email": "test_student@kiet.edu",
        "password": "testpassword",
        "branch": "CSE AI",
        "section": "A",
        "registration_number": "123456789012345",
        "otp": otp
    }
    response = client.post("/verify-otp", json=verify_data)
    assert response.status_code == 200
    assert "user_id" in response.json()

    # 4. Test Student Login 
    login_data = {
        "email": "test_student@kiet.edu",
        "password": "testpassword"
    }
    login_response = client.post("/login", json=login_data)
    assert login_response.status_code == 200
    data = login_response.json()
    assert "access_token" in data
    assert data["role"] == "student"

def test_exam_lifecycle(client, db_session):
    # 1. Create Teacher Account directly for testing
    from app.utils.security import get_password_hash
    from app.models import User
    import uuid

    teacher_id = uuid.uuid4()
    teacher = User(
        id=teacher_id,
        name="Test Teacher",
        email="teacher_test@kiet.edu",
        password_hash=get_password_hash("teacherpassword"),
        role="teacher",
        is_active=True
    )
    student_id = uuid.uuid4()
    student = User(
        id=student_id,
        name="Test Student",
        email="test_student@kiet.edu",
        password_hash=get_password_hash("testpassword"),
        role="student",
        branch="CSE AI",
        section="A",
        registration_number="123456789012345",
        is_active=True
    )
    db_session.add(teacher)
    db_session.add(student)
    db_session.commit()

    # 2. Login as Teacher
    login_response = client.post("/login", json={
        "email": "teacher_test@kiet.edu",
        "password": "teacherpassword"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Create Exam
    future_time = datetime.utcnow() + timedelta(days=1)
    import json
    exam_data = {
        "code": "ML101",
        "access_code": "123456",
        "subject": "Machine Learning",
        "exam_name": "Mid Term",
        "duration": "60",
        "start_time": future_time.isoformat(),
        "start_window_minutes": "30",
        "extra_sections": json.dumps([{"title": "Section A", "questions": []}])
    }
    create_response = client.post("/admin/exams", data=exam_data, headers=headers)
    assert create_response.status_code == 200
    created_exam = create_response.json()
    exam_id = created_exam["id"]

    # 4. Assign Exam to Section "CSE AI" "A"
    assign_data = {
        "branch": "CSE AI",
        "section": "A"
    }
    assign_response = client.post(f"/admin/exams/{exam_id}/assign-section", json=assign_data, headers=headers)
    assert assign_response.status_code == 200

    # 5. Access Exam from Student side
    # Student "test_student@kiet.edu" is already in "CSE AI" "A" from the first test
    student_login = client.post("/login", json={
        "email": "test_student@kiet.edu",
        "password": "testpassword"
    })
    student_token = student_login.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # Fetch assigned exams
    exams_response = client.get("/users/me/exams", headers=student_headers)
    assert exams_response.status_code == 200
    exams = exams_response.json()
    assert len(exams) >= 1
    assert any(e["id"] == exam_id for e in exams)

    # 6. Delete Exam (Admin/Teacher)
    delete_response = client.delete(f"/admin/exams/{exam_id}", headers=headers)
    assert delete_response.status_code == 200
