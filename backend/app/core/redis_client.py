import json
import redis.asyncio as aioredis
import redis
from backend.app.core.config import settings

# Synchronous client (For Celery orchestration to push to pub/sub)
sync_redis = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

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
        sync_redis.publish(channel, json.dumps(message))
    except Exception as e:
        print(f"Redis Publish Error: {e}")
