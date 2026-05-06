import os
import shutil
from fastapi import UploadFile
from typing import Optional

# This handles where files are saved. 
# Default to 'local' for development.
STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local")
UPLOAD_DIR = "uploads"

if STORAGE_BACKEND == "local":
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

async def upload_file(file: UploadFile, subfolder: str) -> str:
    """
    Saves a file to the configured storage backend.
    Returns the public path/URL to the file.
    """
    if not file:
        return None
        
    filename = file.filename
    # Simple sanitization or unique naming could be added here
    
    if STORAGE_BACKEND == "local":
        target_dir = os.path.join(UPLOAD_DIR, subfolder)
        if not os.path.exists(target_dir):
            os.makedirs(target_dir)
            
        file_path = os.path.join(target_dir, filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return file_path
    
    elif STORAGE_BACKEND == "s3":
        # Placeholder for future S3 implementation
        # import boto3
        # s3 = boto3.client('s3')
        # s3.upload_fileobj(file.file, 'bucket-name', f"{subfolder}/{filename}")
        # return f"https://bucket-name.s3.amazonaws.com/{subfolder}/{filename}"
        raise NotImplementedError("S3 storage backend not configured yet.")
        
    return None
