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
        # Fetch scan_type from DB
        from app.db.database import SessionLocal
        from app.db.models import Scan
        db = SessionLocal()
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        scan_type = scan.scan_type if scan else "quick"
        db.close()
        
        publish_event(scan_id, "progress", 5, "Initializing Worker...")
        run_synchronous_orchestrator(scan_id, target_url, scan_type)
        return f"Scan {scan_id} completed."
    except Exception as exc:
        publish_event(scan_id, "error", 0, "Worker Execution Failed", {"log": str(exc)})
        raise self.retry(exc=exc)

@shared_task
def process_scheduled_scans():
    from app.db.database import SessionLocal
    from app.db.models import Scan
    from datetime import datetime, timedelta
    
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        due_scans = db.query(Scan).filter(
            Scan.schedule_type != 'none',
            Scan.next_run_at <= now
        ).all()
        
        for scan in due_scans:
            # Trigger celery execution for exactly this scan instance immediately
            execute_scan.delay(scan.id, scan.target_url)
            
            # Reconstruct the next interval cleanly
            if scan.schedule_type == "daily":
                scan.next_run_at = now + timedelta(days=1)
            elif scan.schedule_type == "weekly":
                scan.next_run_at = now + timedelta(days=7)
            else:
                scan.schedule_type = "none" # Fallback safeguard
                
            db.commit()
            
    finally:
        db.close()
