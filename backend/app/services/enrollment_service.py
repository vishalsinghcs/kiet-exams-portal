from sqlalchemy.orm import Session
from fastapi import HTTPException
from uuid import UUID
from datetime import datetime

from app.repositories.enrollment_repository import enrollment_repo
from app.repositories.exam_repository import exam_repo

class EnrollmentService:

    # === 1. STARTING THE EXAM ===
    def start_exam(self, db: Session, user_id: UUID, exam_id: UUID, access_code: str):
        # 1. Fetch Exam & Validate the Teacher's Pin
        exam = exam_repo.get_by_id(db, exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
            
        if exam.access_code != access_code:
            raise HTTPException(status_code=403, detail="Invalid exam access code!")

        # 2. Check if the student already started it
        enrollment = enrollment_repo.get_enrollment(db, user_id, exam_id)
        if enrollment:
            if enrollment.status == "submitted":
                raise HTTPException(status_code=400, detail="You have already submitted this exam.")
            # If status is "in_progress", let them resume (e.g. they accidentally closed the tab)
            return enrollment
            
        # 3. First time opening it? Create the Report Card and set to in_progress!
        new_enrollment = enrollment_repo.create(db, obj_in={
            "user_id": user_id,
            "exam_id": exam_id,
            "status": "in_progress",
            "assigned_at": datetime.utcnow()
        })
        return new_enrollment


    # === 2. SUBMITTING THE EXAM ===
    def submit_exam(self, db: Session, user_id: UUID, exam_id: UUID):
        # 1. Fetch the student's report card
        enrollment = enrollment_repo.get_enrollment(db, user_id, exam_id)
        if not enrollment:
            raise HTTPException(status_code=404, detail="You haven't started this exam yet.")
            
        if enrollment.status == "submitted":
            raise HTTPException(status_code=400, detail="Exam already submitted.")

        # 2. THE STRICT BUSINESS RULE
        # This is exactly what you requested: Block submission if any file is missing.
        if not enrollment.csv_submission_path or not enrollment.notebook_submission_path:
            raise HTTPException(
                status_code=400, 
                detail="Submission blocked: You must upload BOTH the .csv and .ipynb files before finishing the test!"
            )
            
        # 3. Everything is perfect. Mark as officially submitted.
        enrollment_repo.update(db, enrollment, {
            "status": "submitted",
            "submitted_at": datetime.utcnow()
        })
        return {"message": "Exam submitted successfully! Best of luck."}

enrollment_service = EnrollmentService()
