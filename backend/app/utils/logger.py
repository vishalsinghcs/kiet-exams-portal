import logging
import os
from pythonjsonlogger import jsonlogger

# Default to development if not set
ENV = os.getenv("ENV", "development").lower()

class OTelFilter(logging.Filter):
    """Ensures otel variables exist on log records to prevent KeyError crashes when OpenTelemetry isn't fully initialized."""
    def filter(self, record):
        if not hasattr(record, 'otelTraceID'): record.otelTraceID = ""
        if not hasattr(record, 'otelSpanID'): record.otelSpanID = ""
        if not hasattr(record, 'otelServiceName'): record.otelServiceName = ""
        return True

def get_logger(name: str = "kiet-exams-backend"):
    logger = logging.getLogger(name)
    
    # Avoid adding multiple handlers if get_logger is called multiple times
    if logger.handlers:
        return logger
        
    # Detailed logs for dev/test, minimal helpful logs for production/staging
    logger.setLevel(logging.INFO if ENV in ["aws", "render"] else logging.DEBUG)
    
    log_handler = logging.StreamHandler()
    
    if ENV in ["aws", "render"]:
        # Production/Staging: JSON formatting aligned with New Relic parsing standards
        format_str = '%(asctime)s %(levelname)s %(name)s %(message)s %(otelTraceID)s %(otelSpanID)s %(otelServiceName)s'
        formatter = jsonlogger.JsonFormatter(format_str)
    else:
        # Development/Testing: Human readable detailed logs
        format_str = '[%(asctime)s] %(levelname)s [%(name)s] [trace_id=%(otelTraceID)s span_id=%(otelSpanID)s]: %(message)s'
        formatter = logging.Formatter(format_str)
        
    log_handler.setFormatter(formatter)
    log_handler.addFilter(OTelFilter())
    logger.addHandler(log_handler)
    logger.propagate = False  # Prevent Uvicorn's root logger from duplicating our logs
    
    return logger

# Global instance for easy importing
logger = get_logger()
