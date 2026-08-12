from sqlalchemy.orm import Session
from uuid import UUID
from app.models import Exam, ExamSectionAssignment
from app.repositories.base import CRUDBase
import sqlalchemy
from fastapi import HTTPException

class CRUDExam(CRUDBase[Exam]):

    # === STRICT TEACHER'S EXAM CRUD ===
    def get_all_by_teacher(self, db:Session, teacher_id: UUID) -> list[Exam]:
        """Strictly fetch exams ONLY created by this specific teacher."""
        return db.query(self.model).filter(self.model.created_by == teacher_id).all()

    # === BATCH ASSIGNMENT QUERIES ===
    def assign_exam_to_batch(self, db:Session, exam_id:UUID, enrollment_year:int, branch:str, section:str) -> ExamSectionAssignment:
        """Assign an exam to a specific branch and section"""
        assignment = ExamSectionAssignment(
            exam_id=exam_id,
            enrollment_year=enrollment_year, 
            branch=branch, 
            section=section
            )
        db.add(assignment)
        try:
            db.commit()
            db.refresh(assignment)
            return assignment
        except sqlalchemy.exc.IntegrityError:
            db.rollback()
            raise HTTPException(status_code=400, detail="Cannot reassign an exam to the same branch and section.")

    # === GET BATCHES FOR EXAM ===
    def get_batches_for_exam(self, db:Session, exam_id:UUID) -> list[ExamSectionAssignment]:
        """Get list of batches assigned to a specific exam."""
        return db.query(ExamSectionAssignment).filter(ExamSectionAssignment.exam_id == exam_id).all()

    # === GET EXAM FOR BATCH === 
    def get_assigned_exams_for_batch(self, db:Session, enrollment_year:int, branch: str, section: str)->list[Exam]:
        """For the Student Dashboard: Get exams assigned to their specific batch."""
        return (
            db.query(Exam)
            .join(ExamSectionAssignment, Exam.id == ExamSectionAssignment.exam_id)
            .filter(ExamSectionAssignment.enrollment_year == enrollment_year)
            .filter(ExamSectionAssignment.branch == branch)
            .filter(ExamSectionAssignment.section == section)
            .all()
        )

exam_repo = CRUDExam(Exam)


