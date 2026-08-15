import os
import logging
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor

# Get the central logger instance
from app.utils.logger import logger

def setup_telemetry(app, engine):
    """Initializes OpenTelemetry Tracing and Logging hooks."""
    
    # 1. Setup Resource (Service Name & Environment)
    environment = os.getenv("ENV", "development")
    resource = Resource.create({
        "service.name": "kiet-exams-backend",
        "deployment.environment": environment
    })

    # 2. Setup TracerProvider
    provider = TracerProvider(resource=resource)
    trace.set_tracer_provider(provider)

    # 3. Setup OTLP Exporter (For New Relic)
    # The SDK automatically uses OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_EXPORTER_OTLP_HEADERS
    otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    if otlp_endpoint:
        logger.info(f"Configuring OTLP Exporter to {otlp_endpoint}")
        otlp_exporter = OTLPSpanExporter()
        processor = BatchSpanProcessor(otlp_exporter)
        provider.add_span_processor(processor)
    else:
        logger.warning("No OTEL_EXPORTER_OTLP_ENDPOINT found. Traces will not be exported to New Relic.")

    # 4. Instrument Logging
    # This automatically injects trace_id and span_id into Python's logging module
    LoggingInstrumentor().instrument(set_logging_format=False)

    # 5. Instrument FastAPI
    FastAPIInstrumentor.instrument_app(app)

    # 6. Instrument SQLAlchemy
    SQLAlchemyInstrumentor().instrument(engine=engine)

    # 7. Instrument Redis (Catches all standard redis calls)
    RedisInstrumentor().instrument()
    
    logger.info("OpenTelemetry instrumentation completed successfully.")
