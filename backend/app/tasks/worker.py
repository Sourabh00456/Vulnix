from celery import Celery
from app.core.config import settings

celery = Celery(
    "breachme_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.scan_tasks"]
)

celery.conf.update(
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    timezone='UTC',
    enable_utc=True,
    beat_schedule={
        'process-scheduled-scans-every-minute': {
            'task': 'app.tasks.scan_tasks.process_scheduled_scans',
            'schedule': 60.0, # Run every 60 seconds
        },
    }
)
