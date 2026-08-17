from sqlalchemy.orm import Session
from fastapi import HTTPException
from uuid import UUID
from datetime import datetime

from app.repositories.enrollment_repository import enrollment_repo
from app.repositories.exam_repository import exam_repo
from app.utils.logger import logger

class EnrollmentService:

    # === 1. STARTING THE EXAM ===
    def start_exam(self, db: Session, user_id: UUID, exam_id: UUID, access_code: str):
        logger.debug(f"Attempting to start exam [user_id={user_id} exam_id={exam_id}]")
        # 1. Fetch Exam & Validate the Teacher's Pin
        exam = exam_repo.get_by_id(db, exam_id)
        if not exam:
            logger.warning(f"Failed to start exam: Exam not found [user_id={user_id} exam_id={exam_id}]")
            raise HTTPException(status_code=404, detail="Exam not found")
            
        if exam.access_code != access_code:
            logger.warning(f"Failed to start exam: Invalid access code [user_id={user_id} exam_id={exam_id}]")
            raise HTTPException(status_code=403, detail="Invalid exam access code!")

        from datetime import timedelta
        now = datetime.utcnow()
        
        # Check if they are trying to start too early
        if now < exam.start_time:
            raise HTTPException(status_code=400, detail="The exam has not started yet.")

        # 2. Check if the student already started it
        enrollment = enrollment_repo.get_enrollment(db, user_id, exam_id)
        if enrollment:
            if enrollment.status == "submitted":
                logger.warning(f"Failed to start exam: Already submitted [user_id={user_id} exam_id={exam_id}]")
                raise HTTPException(status_code=400, detail="You have already submitted this exam.")
            # If status is "in_progress", let them resume (e.g. they accidentally closed the tab)
            logger.info(f"Student resumed in-progress exam [user_id={user_id} exam_id={exam_id}]")
            return enrollment
            
        # 3. First time opening it? Check if the start window has closed!
        exam_start_limit = exam.start_time + timedelta(minutes=exam.start_window_minutes)
        if now > exam_start_limit:
            logger.warning(f"Failed to start exam: Start window closed [user_id={user_id} exam_id={exam_id}]")
            raise HTTPException(status_code=400, detail="The start window for this exam has closed.")

        # Create the Report Card and set to in_progress!
        new_enrollment = enrollment_repo.create(db, obj_in={
            "user_id": user_id,
            "exam_id": exam_id,
            "status": "in_progress",
            "assigned_at": datetime.utcnow()
        })
        logger.info(f"Student officially started exam [user_id={user_id} exam_id={exam_id}]")
        return new_enrollment


    # === 2. SUBMITTING THE EXAM ===
    def submit_exam(self, db: Session, user_id: UUID, exam_id: UUID):
        logger.debug(f"Attempting to submit exam [user_id={user_id} exam_id={exam_id}]")
        # 1. Fetch the student's report card
        enrollment = enrollment_repo.get_enrollment(db, user_id, exam_id)
        if not enrollment:
            logger.warning(f"Failed to submit: Exam not started [user_id={user_id} exam_id={exam_id}]")
            raise HTTPException(status_code=404, detail="You haven't started this exam yet.")
            
        if enrollment.status == "submitted":
            logger.warning(f"Failed to submit: Already submitted [user_id={user_id} exam_id={exam_id}]")
            raise HTTPException(status_code=400, detail="Exam already submitted.")

        # 2. THE STRICT BUSINESS RULE
        # This is exactly what you requested: Block submission if any file is missing.
        if not enrollment.csv_submission_path or not enrollment.notebook_submission_path:
            logger.warning(f"Submission blocked: Missing required files [user_id={user_id} exam_id={exam_id}]")
            raise HTTPException(
                status_code=400, 
                detail="Submission blocked: You must upload BOTH the .csv and .ipynb files before finishing the test!"
            )
            
        # 3. Everything is perfect. Mark as officially submitted.
        enrollment_repo.update(db, enrollment, {
            "status": "submitted",
            "submitted_at": datetime.utcnow()
        })
        logger.info(f"Exam successfully submitted [user_id={user_id} exam_id={exam_id}]")
        return {"message": "Exam submitted successfully! Best of luck."}

enrollment_service = EnrollmentService()
