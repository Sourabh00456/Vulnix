import json
import logging
import redis.asyncio as aioredis
import redis
from app.core.config import settings

logger = logging.getLogger(__name__)

# Lazy sync client — created on first use, not at import time.
# This prevents a Redis connection error from crashing the entire app on startup.
_sync_redis = None

def get_sync_redis():
    global _sync_redis
    if _sync_redis is None:
        try:
            _sync_redis = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
        except Exception as e:
            logger.error(f"Redis sync connection failed: {e}")
            return None
    return _sync_redis

# Synchronous client — kept for backward compat with any direct callers
sync_redis = None  # deprecated; use get_sync_redis()

# Asynchronous client (For FastAPI WebSocket to subscribe)
async def get_async_redis():
    return aioredis.from_url(settings.REDIS_URL, decode_responses=True)

def publish_event(scan_id: str, event_type: str, progress: int, step: str, payload: dict = None):
    channel = f"scan_{scan_id}"
    message = {
        "type": event_type,
        "scan_id": scan_id,
        "progress": progress,
        "step": step
    }
    if payload:
        message.update(payload)

    try:
        r = get_sync_redis()
        if r:
            r.publish(channel, json.dumps(message))
    except Exception as e:
        logger.warning(f"Redis publish error (non-fatal): {e}")
