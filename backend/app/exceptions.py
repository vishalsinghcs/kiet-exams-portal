from fastapi import HTTPException, status

class StorageException(HTTPException):
    def __init__(self, detail: str = "A storage error occurred."):
        super().__init__(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)

class S3ConfigurationError(HTTPException):
    def __init__(self, detail: str = "S3 credentials or configuration are missing or invalid."):
        super().__init__(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)

class FileNotFoundException(HTTPException):
    def __init__(self, detail: str = "The requested file could not be found."):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
