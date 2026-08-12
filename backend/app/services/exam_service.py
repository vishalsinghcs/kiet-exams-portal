from sqlalchemy.orm import Session
from fastapi import HTTPException
from uuid import UUID

from app.repositories.exam_repository import exam_repo
from app.models import Exam

class ExamService:

    # ==========================
    # === TEACHER DASHBOARD ====
    # ==========================
    def create_exam(self, db: Session, teacher_id: UUID, exam_data: dict):
        """Teacher creates a new exam."""
        # SECURITY: Force the 'created_by' field to be the teacher making the request
        exam_data["created_by"] = teacher_id
        return exam_repo.create(db, obj_in=exam_data)

    def get_teacher_exams(self, db: Session, teacher_id: UUID):
        """Teacher fetches all exams they personally created."""
        return exam_repo.get_all_by_teacher(db, teacher_id)

    def assign_exam_to_batch(self, db: Session, teacher_id: UUID, exam_id: UUID, enrollment_year: int, branch: str, section: str):
        """Teacher assigns their exam to a specific student batch (e.g. 2026 CSE A)."""
        # SECURITY CHECK: Did this teacher actually create this exam?
        exam = exam_repo.get_by_id(db, exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        if exam.created_by != teacher_id:
            raise HTTPException(status_code=403, detail="Forbidden: You can only assign exams that you created!")

        return exam_repo.assign_exam_to_batch(db, exam_id, enrollment_year, branch, section)

    def delete_exam(self, db: Session, teacher_id: UUID, exam_id: UUID):
        """Teacher deletes an exam."""
        # SECURITY CHECK: Did this teacher actually create this exam?
        exam = exam_repo.get_by_id(db, exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        if exam.created_by != teacher_id:
            raise HTTPException(status_code=403, detail="Forbidden: You can only delete exams that you created!")

        return exam_repo.delete(db, exam_id)


    # ==========================
    # === STUDENT DASHBOARD ====
    # ==========================
    def get_student_available_exams(self, db: Session, enrollment_year: int, branch: str, section: str):
        """
        Student Dashboard fetches all exams currently assigned to their specific batch.
        Later, we will add Redis caching here to optimize performance!
        """
        return exam_repo.get_assigned_exams_for_batch(db, enrollment_year, branch, section)

exam_service = ExamService()
