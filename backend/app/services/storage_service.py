from typing import Any
from fastapi import UploadFile, HTTPException, status
from app.repositories.storage_repository import storage_repository
from app.exceptions import StorageException
from datetime import datetime

class StorageService:
    """
    Handles business logic for file uploads: validation, empty file checks, 
    and generating deterministic S3 URI paths.
    """

    async def _validate_file(self, file: UploadFile, allowed_extension: str):
        """
        Validates that a file is not empty and matches the allowed extension.
        """
        if not file or not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="No file uploaded."
            )
            
        # 1. Extension Validation
        if not file.filename.lower().endswith(allowed_extension.lower()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Invalid file type. Only {allowed_extension} files are allowed."
            )
            
        # 2. Empty File Check (Read first byte to verify it's not empty, then reset cursor)
        try:
            first_byte = await file.read(1)
            if not first_byte:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail="The uploaded file is empty."
                )
            await file.seek(0)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Could not read the uploaded file: {str(e)}"
            )

    def get_exam_s3_prefix(self, exam: Any) -> str:
        """
        Generates: {subject_code}/{academic_year}/{exam_name}_{day}{month}
        """
        if isinstance(exam, dict):
            subject_code = str(exam.get('subject_code', 'unknown')).lower().replace(" ", "_")
            exam_name = str(exam.get('exam_name', 'exam')).lower().replace(" ", "_")
            start_time = exam.get('start_time')
        else:
            subject_code = str(getattr(exam, 'subject_code', 'unknown')).lower().replace(" ", "_")
            exam_name = str(getattr(exam, 'exam_name', 'exam')).lower().replace(" ", "_")
            start_time = getattr(exam, 'start_time', None)
            
        if start_time and isinstance(start_time, datetime):
            academic_year = str(start_time.year)
            day_month = start_time.strftime("%d%b").lower()
        else:
            academic_year = "unknown_year"
            day_month = "unknown_date"

        return f"{subject_code}/{academic_year}/{exam_name}_{day_month}"

    def get_submission_s3_prefix(self, exam: Any, user: Any) -> str:
        """
        Generates: {exam_prefix}/submissions/{branch}_{section}/{reg_no}_{student_name}
        """
        base_prefix = self.get_exam_s3_prefix(exam)
        
        branch = str(getattr(user, 'branch', 'unknown')).lower().replace(" ", "_")
        section = str(getattr(user, 'section', 'unknown')).lower().replace(" ", "_")
        reg_no = str(getattr(user, 'registration_number', 'unknown')).lower().replace(" ", "_")
        student_name = str(getattr(user, 'name', 'student')).lower().replace(" ", "_")
        
        return f"{base_prefix}/submissions/{branch}_{section}/{reg_no}_{student_name}"

    async def upload_exam_dataset(self, file: UploadFile, exam: Any, user: Any) -> str:
        """Validates and uploads a teacher's dataset (.zip) to S3."""
        if getattr(user, 'role', '') != 'teacher':
            raise HTTPException(status_code=403, detail="Only teachers can upload dataset files.")
            
        await self._validate_file(file, allowed_extension=".zip")
        prefix = self.get_exam_s3_prefix(exam)
        s3_key = f"{prefix}/resources/dataset.zip"
        return await storage_repository.upload_file(file, s3_key)

    async def upload_exam_sample_csv(self, file: UploadFile, exam: Any, user: Any) -> str:
        """Validates and uploads a teacher's sample csv to S3."""
        if getattr(user, 'role', '') != 'teacher':
            raise HTTPException(status_code=403, detail="Only teachers can upload sample CSV files.")
            
        await self._validate_file(file, allowed_extension=".csv")
        prefix = self.get_exam_s3_prefix(exam)
        s3_key = f"{prefix}/resources/sample.csv"
        return await storage_repository.upload_file(file, s3_key)

    async def upload_student_submission(self, file: UploadFile, exam: Any, user: Any, file_type: str) -> str:
        """Validates and uploads a student's submission (.ipynb or .csv) to S3."""
        if getattr(user, 'role', '') != 'student':
            raise HTTPException(status_code=403, detail="Only students can upload submissions.")
            
        if file_type not in ["csv", "ipynb"]:
            raise HTTPException(status_code=400, detail="file_type must be 'csv' or 'ipynb'")
            
        await self._validate_file(file, allowed_extension=f".{file_type}")
        
        prefix = self.get_submission_s3_prefix(exam, user)
        # We preserve the student's original filename, or force a standard name
        s3_key = f"{prefix}/{file.filename}"
        return storage_repository.upload_file(file, s3_key)

storage_service = StorageService()
