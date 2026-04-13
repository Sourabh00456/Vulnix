from celery import shared_task
from app.services.scan_orchestrator import run_synchronous_orchestrator
from app.core.redis_client import publish_event
import traceback

@shared_task
def health_ping():
    """Diagnostic task to verify worker execution."""
    return "pong"

@shared_task(bind=True, max_retries=3, default_retry_delay=60, retry_backoff=True, retry_jitter=True)
def execute_scan(self, scan_id: str, target_url: str, is_dry_run: bool = False):
    """
    Celery task delegating execution to the orchestrator.
    Strictly manages database lifecycle: queued -> running -> completed/failed.
    """
    from app.db.database import SessionLocal
    from app.db.models import Scan
    import logging

    logger = logging.getLogger(__name__)
    db = SessionLocal()
    
    try:
        # ── 1. Idempotency Guard ──────────────────────────────────────────────
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            logger.error(f"[SCAN {scan_id}] [WORKER] Scan record not found")
            return
        
        if scan.status in ["running", "completed"]:
            logger.info(f"[SCAN {scan_id}] [WORKER] Task skipped: already in state {scan.status}")
            return

        logger.info(f"[SCAN {scan_id}] [WORKER] Received")
        
        # ── 2. Transition: Running ───────────────────────────────────────────
        scan.status = "running"
        scan.current_step = "Initializing Pipeline"
        db.commit()
        
        publish_event(scan_id, "progress", 5, "Initializing Worker...")
        
        # ── 3. Execute Engine ────────────────────────────────────────────────
        run_synchronous_orchestrator(scan_id, target_url, scan.scan_type, is_dry_run=is_dry_run)
        
        # ── 4. Transition: Completed ─────────────────────────────────────────
        scan.status = "completed"
        db.commit()
        logger.info(f"[SCAN {scan_id}] [WORKER] Completed")
        return f"Scan {scan_id} completed."

    except Exception as exc:
        db.rollback()
        logger.error(f"[SCAN {scan_id}] [WORKER] Execution failed: {exc}")
        
        # Update status to failed in DB
        try:
            scan = db.query(Scan).filter(Scan.id == scan_id).first()
            if scan:
                scan.status = "failed"
                scan.current_step = "Critical Error"
                db.commit()
        except Exception as db_err:
            logger.error(f"[SCAN {scan_id}] [WORKER] DB status update failed: {db_err}")

        publish_event(scan_id, "error", 0, "Worker Execution Failed", {"log": str(exc)})
        raise self.retry(exc=exc)
    finally:
        db.close()

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
