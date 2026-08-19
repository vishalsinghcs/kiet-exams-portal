from sqlalchemy.orm import Session
from fastapi import HTTPException
from uuid import UUID
import logging

from app.repositories.exam_repository import exam_repo
from app.models import Exam, User
from app.utils.logger import logger

class ExamService:

    # ==========================
    # === TEACHER DASHBOARD ====
    # ==========================
    def create_exam(self, db: Session, teacher_id: UUID, exam_data: dict):
        """Teacher creates a new exam."""
        logger.debug(f"Service: Creating exam [teacher_id={teacher_id}]")
        # SECURITY: Force the 'created_by' field to be the teacher making the request
        exam_data["created_by"] = teacher_id
        return exam_repo.create(db, obj_in=exam_data)

    def get_teacher_exams(self, db: Session, teacher_id: UUID):
        """Teacher fetches all exams they personally created."""
        return exam_repo.get_all_by_teacher(db, teacher_id)

    def assign_exam_to_batch(self, db: Session, teacher_id: UUID, exam_id: UUID, enrollment_year: int, branch: str, section: str):
        """Teacher assigns their exam to a specific student batch (e.g. 2026 CSE A)."""
        logger.debug(f"Service: Assigning exam [exam_id={exam_id} teacher_id={teacher_id} enrollment_year={enrollment_year} branch={branch} section={section}]")
        # SECURITY CHECK: Did this teacher actually create this exam?
        exam = exam_repo.get_by_id(db, exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        if exam.created_by != teacher_id:
            raise HTTPException(status_code=403, detail="Forbidden: You can only assign exams that you created!")

        student_count = db.query(User).filter(User.role == "student", User.enrollment_year == enrollment_year, User.branch == branch, User.section == section).count()
        if student_count == 0:
            raise HTTPException(status_code=400, detail="Cannot assign an exam to an empty section.")

        assignment = exam_repo.assign_exam_to_batch(db, exam_id, enrollment_year, branch, section)
        
        # Mirror assignment to Minor Degree if section is A
        if section == "A":
            try:
                exam_repo.assign_exam_to_batch(db, exam_id, enrollment_year, "Minor Degree", section)
            except Exception:
                pass # Ignore if already assigned or other error
                
        return assignment

    def revoke_exam_from_batch(self, db: Session, teacher_id: UUID, exam_id: UUID, enrollment_year: int, branch: str, section: str):
        """Teacher revokes their exam from a specific student batch."""
        logger.debug(f"Service: Revoking exam assignment [exam_id={exam_id} teacher_id={teacher_id} enrollment_year={enrollment_year} branch={branch} section={section}]")
        # SECURITY CHECK: Did this teacher actually create this exam?
        exam = exam_repo.get_by_id(db, exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        if exam.created_by != teacher_id:
            raise HTTPException(status_code=403, detail="Forbidden: You can only revoke exams that you created!")

        exam_repo.revoke_exam_from_batch(db, exam_id, enrollment_year, branch, section)
        
        # Mirror revocation to Minor Degree if section is A
        if section == "A":
            try:
                exam_repo.revoke_exam_from_batch(db, exam_id, enrollment_year, "Minor Degree", section)
            except Exception:
                pass

    def delete_exam(self, db: Session, teacher_id: UUID, exam_id: UUID):
        """Teacher deletes an exam."""
        logger.debug(f"Service: Deleting exam [exam_id={exam_id} teacher_id={teacher_id}]")
        # SECURITY CHECK: Did this teacher actually create this exam?
        exam = exam_repo.get_by_id(db, exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        if exam.created_by != teacher_id:
            raise HTTPException(status_code=403, detail="Forbidden: You can only delete exams that you created!")

        return exam_repo.delete(db, exam_id)

    def edit_exam(self, db: Session, teacher_id: UUID, exam_id: UUID, update_data: dict):
        """Teacher edits an exam's resources (dataset, sample csv, start window)."""
        logger.debug(f"Service: Editing exam [exam_id={exam_id} teacher_id={teacher_id}]")
        # SECURITY CHECK: Did this teacher actually create this exam? (or is it an admin?)
        exam = exam_repo.get_by_id(db, exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        # Check if the user is the creator or an admin
        teacher = db.query(User).filter(User.id == teacher_id).first()
        is_admin = teacher and teacher.role == "admin"
        
        if exam.created_by != teacher_id and not is_admin:
            raise HTTPException(status_code=403, detail="Forbidden: You can only edit exams that you created!")

        return exam_repo.update(db, db_obj=exam, obj_in=update_data)


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
