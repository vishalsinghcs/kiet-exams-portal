import os
import shutil
import uuid
from fastapi import UploadFile
from typing import Optional, Any
from datetime import datetime

STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local")
UPLOAD_DIR = "uploads"

if STORAGE_BACKEND == "local":
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

def get_exam_s3_prefix(exam_data: Any) -> str:
    """Generate a deterministic S3 prefix for an exam."""
    if isinstance(exam_data, dict):
        subject_code = str(exam_data.get('subject_code', 'unknown'))
        exam_name = str(exam_data.get('exam_name', 'exam'))
        start_time = exam_data.get('start_time')
    else:
        subject_code = str(getattr(exam_data, 'subject_code', 'unknown'))
        exam_name = str(getattr(exam_data, 'exam_name', 'exam'))
        start_time = getattr(exam_data, 'start_time', None)
        
    subject_code_clean = subject_code.lower().replace(" ", "_")
    exam_name_clean = exam_name.lower().replace(" ", "_")
    
    if start_time:
        if isinstance(start_time, str):
            try:
                start_time_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
            except ValueError:
                start_time_dt = datetime.utcnow()
        else:
            start_time_dt = start_time
            
        academic_year = str(start_time_dt.year)
        day_month = start_time_dt.strftime("%d%b").lower()
    else:
        academic_year = "unknown_year"
        day_month = "unknown_date"

    return f"{subject_code_clean}/{academic_year}/{exam_name_clean}_{day_month}"

def get_submission_s3_prefix(exam_data: Any, user: Any) -> str:
    """Generate a deterministic S3 prefix for a student's submission."""
    base_prefix = get_exam_s3_prefix(exam_data)
    
    if isinstance(user, dict):
        branch = str(user.get('branch', 'unknown'))
        section = str(user.get('section', 'unknown'))
        reg_no = str(user.get('registration_number', 'unknown'))
        student_name = str(user.get('name', 'student'))
    else:
        branch = str(getattr(user, 'branch', 'unknown'))
        section = str(getattr(user, 'section', 'unknown'))
        reg_no = str(getattr(user, 'registration_number', 'unknown'))
        student_name = str(getattr(user, 'name', 'student'))
        
    branch_clean = branch.lower().replace(" ", "_")
    section_clean = section.lower().replace(" ", "_")
    reg_no_clean = reg_no.lower().replace(" ", "_")
    student_name_clean = student_name.lower().replace(" ", "_")
    
    return f"{base_prefix}/submissions/{branch_clean}_{section_clean}/{reg_no_clean}_{student_name_clean}"

async def upload_file(file: UploadFile, subfolder: str = None, custom_path: str = None) -> str:
    if not file:
        return None

    if custom_path:
        s3_key = custom_path
        local_rel_path = custom_path
    else:
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        s3_key = f"{subfolder}/{unique_filename}" if subfolder else unique_filename
        local_rel_path = s3_key

    if STORAGE_BACKEND == "local":
        target_path = os.path.join(UPLOAD_DIR, local_rel_path)
        target_dir = os.path.dirname(target_path)
        if not os.path.exists(target_dir):
            os.makedirs(target_dir, exist_ok=True)
            
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return target_path

    elif STORAGE_BACKEND == "s3":
        import boto3
        bucket_name = os.getenv("AWS_S3_BUCKET_NAME")
        s3_client = boto3.client("s3", region_name=os.getenv("AWS_REGION", "ap-south-1"))
        s3_client.upload_fileobj(
            file.file,
            bucket_name,
            s3_key,
            ExtraArgs={"ContentType": file.content_type or "application/octet-stream"}
        )
        return f"s3://{bucket_name}/{s3_key}"

    return None

from fastapi.responses import FileResponse, RedirectResponse
from fastapi import HTTPException

def get_file_response(file_path: str, filename: str = None):
    if not file_path:
        raise HTTPException(status_code=404, detail="File missing")
        
    if file_path.startswith("s3://"):
        import boto3
        parts = file_path.replace("s3://", "").split("/", 1)
        if len(parts) != 2:
            raise HTTPException(status_code=500, detail="Invalid S3 path format")
        bucket_name, s3_key = parts
        
        s3_client = boto3.client("s3", region_name="ap-south-1")
        
        try:
            response = s3_client.get_object(Bucket=bucket_name, Key=s3_key)
            from fastapi.responses import StreamingResponse
            
            headers = {}
            if filename:
                headers['Content-Disposition'] = f'attachment; filename="{filename}"'
                
            return StreamingResponse(
                response['Body'].iter_chunks(),
                media_type=response.get('ContentType', 'application/octet-stream'),
                headers=headers
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch from S3: {str(e)}")
            
    else:
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File missing on local server")
            
        if not filename:
            filename = os.path.basename(file_path)
            
        return FileResponse(path=file_path, filename=filename)