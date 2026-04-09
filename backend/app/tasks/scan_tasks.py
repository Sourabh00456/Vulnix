from celery import shared_task
from app.services.scan_orchestrator import run_synchronous_orchestrator
from app.core.redis_client import publish_event
import traceback

@shared_task(bind=True, max_retries=3, default_retry_delay=60, retry_backoff=True, retry_jitter=True)
def execute_scan(self, scan_id: str, target_url: str):
    """
    Celery task delegating execution to the orchestrator.
    Auto-retries on failure up to 3 times with exponential backoff.
    """
    try:
        publish_event(scan_id, "progress", 5, "Initializing Worker...")
        run_synchronous_orchestrator(scan_id, target_url)
        return f"Scan {scan_id} completed."
    except Exception as exc:
        publish_event(scan_id, "error", 0, "Worker Execution Failed", {"log": str(exc)})
        raise self.retry(exc=exc)
