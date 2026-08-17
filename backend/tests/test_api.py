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
        "enrollment_year": 2025,
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
        "enrollment_year": 2025,
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

    # 5. Test Concurrent Login Block
    import os
    if os.getenv("REDIS_URL"):
        # Second login attempt should fail
        second_login_response = client.post("/login", json=login_data)
        assert second_login_response.status_code == 403
        assert "already logged in" in second_login_response.json()["detail"]
        
        # 6. Test Logout allows subsequent login
        logout_response = client.post("/logout", headers={"Authorization": f"Bearer {data['access_token']}"})
        assert logout_response.status_code == 200
        
        third_login_response = client.post("/login", json=login_data)
        assert third_login_response.status_code == 200
        assert "access_token" in third_login_response.json()

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

def test_admin_force_logout(client, db_session):
    import os
    if not os.getenv("REDIS_URL"):
        return  # Skip test if Redis is not configured

    # 1. Create a Student and an Admin
    from app.utils.security import get_password_hash
    from app.models import User
    import uuid

    student_email = f"force_logout_student_{uuid.uuid4().hex[:6]}@kiet.edu"
    admin_email = f"force_logout_admin_{uuid.uuid4().hex[:6]}@kiet.edu"

    student = User(
        id=uuid.uuid4(),
        name="Student to Logout",
        email=student_email,
        password_hash=get_password_hash("testpassword"),
        role="student",
        is_active=True
    )
    admin = User(
        id=uuid.uuid4(),
        name="Admin User",
        email=admin_email,
        password_hash=get_password_hash("adminpassword"),
        role="admin",
        is_active=True
    )
    db_session.add(student)
    db_session.add(admin)
    db_session.commit()

    # 2. Login Student
    student_login = client.post("/login", json={"email": student_email, "password": "testpassword"})
    assert student_login.status_code == 200

    # 3. Verify Student Cannot Login Again (Session active)
    second_login = client.post("/login", json={"email": student_email, "password": "testpassword"})
    assert second_login.status_code == 403

    # 4. Login Admin
    admin_login = client.post("/login", json={"email": admin_email, "password": "adminpassword"})
    admin_token = admin_login.json()["access_token"]

    # 5. Admin Force Logouts Student
    force_logout_res = client.post(
        "/admin/force-logout",
        json={"identifier": student_email},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert force_logout_res.status_code == 200
    assert "forcefully terminated" in force_logout_res.json()["message"]

    # 6. Verify Student CAN Login Again (Session cleared)
    third_login = client.post("/login", json={"email": student_email, "password": "testpassword"})
    assert third_login.status_code == 200

def test_signup_validation_errors(client):
    # 1. Non-KIET email
    res = client.post("/signup", json={
        "email": "hacker@gmail.com",
        "name": "Hacker",
        "password": "pass",
        "branch": "CSE AI",
        "section": "A",
        "enrollment_year": 2025,
        "registration_number": "123456789012345"
    })
    assert res.status_code == 422
    
    # 2. Invalid Registration Number
    res = client.post("/signup", json={
        "email": "student@kiet.edu",
        "name": "Student",
        "password": "pass",
        "branch": "CSE AI",
        "section": "A",
        "enrollment_year": 2025,
        "registration_number": "12345ABC"
    })
    assert res.status_code == 422

    # 3. Minor Degree with Wrong Section
    res = client.post("/signup", json={
        "email": "minor@kiet.edu",
        "name": "Student",
        "password": "pass",
        "branch": "Minor Degree",
        "section": "B",
        "enrollment_year": 2025,
        "registration_number": "123456789012345"
    })
    assert res.status_code == 422

def test_signup_duplicate_email(client, db_session):
    import uuid
    from app.models import User
    from app.utils.security import get_password_hash
    
    email = f"duplicate_{uuid.uuid4().hex[:6]}@kiet.edu"
    user = User(
        id=uuid.uuid4(),
        name="Existing",
        email=email,
        password_hash=get_password_hash("pass"),
        role="student",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()

    res = client.post("/signup", json={
        "email": email,
        "name": "Hacker 2",
        "password": "pass",
        "branch": "CSE AI",
        "section": "A",
        "enrollment_year": 2025,
        "registration_number": "123456789012345"
    })
    assert res.status_code == 400
    assert "already registered" in res.json()["detail"].lower()

def test_verify_otp_invalid(client, db_session):
    from app.models import VerificationToken
    from datetime import datetime, timedelta
    
    email = "wrong_otp@kiet.edu"
    token = VerificationToken(
        email=email,
        token="123456",
        token_type="signup",
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db_session.add(token)
    db_session.commit()

    res = client.post("/verify-otp", json={
        "name": "Student",
        "email": email,
        "password": "pass",
        "branch": "CSE AI",
        "section": "A",
        "enrollment_year": 2025,
        "registration_number": "123456789012345",
        "otp": "999999"  # Wrong OTP
    })
    assert res.status_code == 400
    assert "invalid" in res.json()["detail"].lower()

def test_login_invalid_credentials(client, db_session):
    import uuid
    from app.models import User
    from app.utils.security import get_password_hash
    
    email = f"login_test_{uuid.uuid4().hex[:6]}@kiet.edu"
    user = User(
        id=uuid.uuid4(),
        name="Test",
        email=email,
        password_hash=get_password_hash("correctpassword"),
        role="student",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()

    # Wrong password
    res = client.post("/login", json={"email": email, "password": "wrongpassword"})
    assert res.status_code == 401

    # Non-existent user
    res = client.post("/login", json={"email": "nobody@kiet.edu", "password": "pass"})
    assert res.status_code == 401

def test_login_rate_limiting(client, db_session):
    import os
    if not os.getenv("REDIS_URL"):
        return

    import uuid
    from app.models import User
    from app.utils.security import get_password_hash
    
    email = f"ratelimit_{uuid.uuid4().hex[:6]}@kiet.edu"
    user = User(
        id=uuid.uuid4(),
        name="Rate Limit User",
        email=email,
        password_hash=get_password_hash("correctpassword"),
        role="student",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()

    # Clear any existing limits just in case
    from app.redis_client import redis_client
    if redis_client:
        redis_client.delete(f"login_attempts:{email}")

    # 1. First bad attempt
    res1 = client.post("/login", json={"email": email, "password": "bad"})
    assert res1.status_code == 401

    # 2. Second bad attempt
    res2 = client.post("/login", json={"email": email, "password": "bad"})
    assert res2.status_code == 401

    # 3. Third bad attempt
    res3 = client.post("/login", json={"email": email, "password": "bad"})
    assert res3.status_code == 401

    # 4. Fourth attempt (even with correct password) should fail with 429
    res4 = client.post("/login", json={"email": email, "password": "correctpassword"})
    assert res4.status_code == 429
    assert "15 minutes" in res4.json()["detail"].lower()
