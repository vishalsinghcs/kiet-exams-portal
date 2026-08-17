import os
from typing import Optional
from fastapi import UploadFile
from fastapi.responses import StreamingResponse
from app.exceptions import StorageException, S3ConfigurationError, FileNotFoundException

# We import boto3 and botocore to interact with AWS S3 and handle AWS-specific errors.
import boto3
import botocore.exceptions

class StorageRepository:
    """
    Handles raw file operations (saving and retrieving bytes) exclusively for AWS S3.
    """
    
    def __init__(self):
        self.bucket_name = os.getenv("AWS_S3_BUCKET_NAME")
        self.region = os.getenv("AWS_REGION", "ap-south-1")
        self.s3_access_key = os.getenv("AWS_FILE_STORAGE_ACCESS_KEY_ID")
        self.s3_secret_key = os.getenv("AWS_FILE_STORAGE_SECRET_ACCESS_KEY")

    def _get_s3_client(self):
        """
        Initializes and returns a boto3 S3 client using explicit credentials.
        """
        try:
            return boto3.client(
                "s3",
                region_name=self.region,
                aws_access_key_id=self.s3_access_key,
                aws_secret_access_key=self.s3_secret_key
            )
        except Exception as e:
            raise S3ConfigurationError(f"Failed to initialize S3 client: {str(e)}")

    def upload_file(self, file: UploadFile, s3_key: str) -> str:
        """
        Uploads a file to the configured S3 bucket at the exact path specified.
        Returns the full S3 URI of the uploaded file.
        """
        if not file:
            return None

        if not self.bucket_name:
            raise S3ConfigurationError("AWS_S3_BUCKET_NAME is not set in environment.")
            
        s3_client = self._get_s3_client()
        
        try:
            s3_client.upload_fileobj(
                file.file,
                self.bucket_name,
                s3_key,
                ExtraArgs={"ContentType": file.content_type or "application/octet-stream"}
            )
            return f"s3://{self.bucket_name}/{s3_key}"
        except Exception as e:
            raise StorageException(f"Failed to upload file to S3: {str(e)}")

    def get_file_response(self, s3_url: str, filename: Optional[str] = None):
        """
        Retrieves a file from S3 and returns a StreamingResponse.
        Parses the bucket and key from the s3:// URI.
        """
        if not s3_url:
            raise FileNotFoundException("No file URL provided.")
            
        if not s3_url.startswith("s3://"):
            raise StorageException(f"Invalid URL format. Expected S3 URI, got: {s3_url}")
            
        parts = s3_url.replace("s3://", "").split("/", 1)
        if len(parts) != 2:
            raise StorageException("Invalid S3 URI format in database.")
            
        bucket_name, s3_key = parts
        s3_client = self._get_s3_client()
        
        try:
            response = s3_client.get_object(Bucket=bucket_name, Key=s3_key)
            
            headers = {}
            if filename:
                headers['Content-Disposition'] = f'attachment; filename="{filename}"'
                
            return StreamingResponse(
                response['Body'].iter_chunks(),
                media_type=response.get('ContentType', 'application/octet-stream'),
                headers=headers
            )
        except botocore.exceptions.ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                raise FileNotFoundException(f"File missing in S3 bucket.")
            raise StorageException(f"Failed to fetch file from S3: {str(e)}")
        except Exception as e:
            raise StorageException(f"An unexpected error occurred while fetching from S3: {str(e)}")

storage_repository = StorageRepository()
