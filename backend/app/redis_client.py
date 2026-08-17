import os
import redis
from app.utils.logger import logger

REDIS_URL = os.getenv("REDIS_URL")

redis_client = None

if REDIS_URL:
    try:
        # Upstash / ElastiCache usually uses rediss:// for TLS
        if REDIS_URL.startswith("rediss://") or "upstash" in REDIS_URL:
            redis_client = redis.Redis.from_url(REDIS_URL, ssl_cert_reqs="none")
        else:
            redis_client = redis.Redis.from_url(REDIS_URL)
        
        # Test the connection
        redis_client.ping()
        logger.info("[Redis] Successfully connected to Redis.")
    except Exception as e:
        logger.error(f"[Redis] Failed to connect to Redis: {e}")
        redis_client = None
else:
    logger.warning("[Redis] REDIS_URL not set in environment. Concurrent session blocking will be disabled.")
