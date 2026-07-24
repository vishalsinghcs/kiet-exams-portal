from sqlalchemy.orm import Session
from uuid import UUID
from app.models import ExamEnrollment
from app.repositories.base import CRUDBase

class CRUDEnrollment(CRUDBase[ExamEnrollment]):

    def get_enrollment(self, db:Session, user_id:UUID, exam_id:UUID) -> ExamEnrollment | None:
        """Fetch a specific student's report card for a specific exam."""
        return (
            db.query(self.model)
            .filter(self.model.user_id == user_id)
            .filter(self.model.exam_id == exam_id)
            .first()
        )

    def get_student_enrollments(self, db:Session, user_id:UUID, status: str = None) -> list[ExamEnrollment]:
        """Fetch all report cards for a student. Optional: filter by 
        'pending' or 'submitted'."""
        query = db.query(self.model).filter(self.model.user_id == user_id)
        if status:
            query = query.filter(self.model.status == status)
        return query.all()

    def get_exam_submissions(self, db:Session, exam_id: UUID) -> list[ExamEnrollment]:
        """For the Teacher Dashboard: Fetch all students submissions
        (report cards) for a specific exam."""
        return db.query(self.model).filter(self.model.exam_id == exam_id).all()

enrollment_repo = CRUDEnrollment(ExamEnrollment)