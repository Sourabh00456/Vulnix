import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery = Celery(
    "breachme_tasks",
    broker=REDIS_URL,
    backend=REDIS_URL,
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
