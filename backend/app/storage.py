import os
import shutil
import uuid
from fastapi import UploadFile
from typing import Optional

STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local")
UPLOAD_DIR = "uploads"

if STORAGE_BACKEND == "local":
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

async def upload_file(file: UploadFile, subfolder: str) -> str:
    if not file:
        return None

    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"

    if STORAGE_BACKEND == "local":
        target_dir = os.path.join(UPLOAD_DIR, subfolder)
        if not os.path.exists(target_dir):
            os.makedirs(target_dir)
        file_path = os.path.join(target_dir, unique_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return file_path

    elif STORAGE_BACKEND == "s3":
        import boto3
        bucket_name = os.getenv("AWS_S3_BUCKET_NAME")
        s3_key = f"{subfolder}/{unique_filename}"
        s3_client = boto3.client("s3", region_name="ap-south-1")
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