import socket
import urllib.parse
import subprocess
import json
import time
from datetime import datetime
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db import models
from app.services.scanner_zap import ZapService
from app.services import ai_engine
from app.core.redis_client import publish_event

def update_db_state(db: Session, scan_id: str, progress: int, current_step: str, status: str = "running"):
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    if scan:
        scan.progress = progress
        scan.current_step = current_step
        if status:
            scan.status = status
        db.commit()

def log_and_publish(db: Session, scan_id: str, message: str, progress: int, current_step: str, is_error: bool = False):
    # Save to ScanLog table
    scan_log = models.ScanLog(
        scan_id=scan_id,
        step=current_step,
        message=message,
        is_error=1 if is_error else 0,
        timestamp=datetime.utcnow()
    )
    db.add(scan_log)
    
    # Backwards compatibility logs array on scan
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    if scan:
        try:
            logs = json.loads(scan.logs) if scan.logs else []
        except:
            logs = []
        logs.append({"time": datetime.now().strftime("%H:%M:%S"), "msg": message})
        scan.logs = json.dumps(logs)
    db.commit()
    
    # Publish to Redis
    event_type = "error" if is_error else "log"
    publish_event(scan_id, event_type, progress, current_step, {"log": message})

def run_recon(db: Session, scan_id: str, target: str):
    log_and_publish(db, scan_id, "Starting Recon phase...", 10, "Recon")
    parsed = urllib.parse.urlparse(target)
    domain = parsed.netloc if parsed.netloc else parsed.path.split('/')[0]

    try:
        ip = socket.gethostbyname(domain)
        log_and_publish(db, scan_id, f"DNS Resolved: {domain} -> {ip}", 20, "Recon")
        update_db_state(db, scan_id, 20, "Recon")
        return domain, ip
    except Exception as e:
        log_and_publish(db, scan_id, f"DNS Lookup Failed: {e}", 20, "Recon", is_error=True)
        raise Exception("Recon failed tightly. Halting pipeline.")

def run_nmap(db: Session, scan_id: str, ip: str, domain: str):
    log_and_publish(db, scan_id, f"Initiating Nmap port scan on {ip}", 25, "Nmap")
    update_db_state(db, scan_id, 25, "Nmap")
    open_ports = []
    
    try:
        # Timeout handling for nmap
        result = subprocess.run(
            ['nmap', '-sV', '-F', domain], 
            capture_output=True, 
            text=True,
            timeout=120
        )
        for line in result.stdout.splitlines():
            if '/tcp' in line and 'open' in line:
                parts = line.split()
                port = parts[0]
                service = parts[2] if len(parts) > 2 else "unknown"
                version = " ".join(parts[3:]) if len(parts) > 3 else ""
                open_ports.append({
                    "port": port, 
                    "service": service, 
                    "version": version
                })
                log_and_publish(db, scan_id, f"Discovered open port: {port} ({service})", 35, "Nmap")
    except subprocess.TimeoutExpired:
        log_and_publish(db, scan_id, "Nmap scan timed out", 40, "Nmap", is_error=True)
    except Exception as e:
        log_and_publish(db, scan_id, f"Nmap error: {e}", 40, "Nmap", is_error=True)

    log_and_publish(db, scan_id, f"Nmap completed. {len(open_ports)} exposed ports found.", 40, "Nmap")
    update_db_state(db, scan_id, 40, "Nmap")
    return open_ports

def run_zap(db: Session, scan_id: str, target: str):
    log_and_publish(db, scan_id, f"Starting OWASP ZAP Web Spider on {target}", 45, "ZAP")
    update_db_state(db, scan_id, 45, "ZAP")
    zap = ZapService()
    zap_alerts = []
    
    try:
        spider_id = zap.trigger_spider(target)
        for i in range(12): # Max 24 seconds wait
            status = zap.get_spider_status(spider_id)
            log_and_publish(db, scan_id, f"ZAP Spider progress: {status}%", 45 + (i*2), "ZAP")
            update_db_state(db, scan_id, 45 + (i*2), "ZAP")
            if status >= 100:
                break
            time.sleep(2)
            
        log_and_publish(db, scan_id, "Retrieving findings from ZAP Proxy", 65, "ZAP")
        zap_alerts = zap.get_alerts(target)
        log_and_publish(db, scan_id, f"ZAP completed. {len(zap_alerts)} raw alerts intercepted.", 70, "ZAP")
    except Exception as e:
        log_and_publish(db, scan_id, f"ZAP integration error or timeout: {e}", 70, "ZAP", is_error=True)
        
    update_db_state(db, scan_id, 70, "ZAP")
    return zap_alerts

def run_ai_and_finalize(db: Session, scan_id: str, open_ports: list, zap_alerts: list):
    log_and_publish(db, scan_id, "Normalizing results and invoking AI Engine", 75, "AI Analysis")
    update_db_state(db, scan_id, 75, "AI Analysis")
    
    vulnerabilities_to_add = []
    base_score = 100
    
    # Process Nmap outputs -> Normalized
    for port_info in open_ports:
        port_num = port_info['port'].split('/')[0]
        severity = "MEDIUM"
        if port_num in ["21", "23"]:
            severity = "CRITICAL"
            base_score -= 30
        elif port_num in ["80"]:
            severity = "HIGH"
            base_score -= 15
        else:
            base_score -= 5
            
        title = f"Exposed Service on {port_info['port']}"
        desc = f"Service {port_info['service']} {port_info['version']} exposed."
        
        # AI Try Catch Pattern
        try:
            ai_res = ai_engine.explain_vulnerability(title, desc)
        except Exception as e:
            log_and_publish(db, scan_id, f"AI generation failed for {title}", 80, "AI Analysis", is_error=True)
            ai_res = {"summary": desc, "risk": "Unknown", "fix": "Restrict port access manually."}

        vulnerabilities_to_add.append({
            "type": "OPEN_PORT",
            "severity": severity,
            "source": "NMAP",
            "endpoint": f":{port_num}",
            "description": ai_res.get("summary", desc) + " " + ai_res.get("risk", ""),
            "fix": ai_res.get("fix", ""),
            "confidence": 1.0,
            "raw_data": port_info
        })
        
    log_and_publish(db, scan_id, "Nmap vectors normalized", 85, "AI Analysis")
    update_db_state(db, scan_id, 85, "AI Analysis")

    # Process ZAP outputs -> Normalized
    deduplicated_zap = {}
    for alert in zap_alerts:
        deduplicated_zap[alert['alert']] = alert
        
    for idx, (alert_name, detail) in enumerate(list(deduplicated_zap.items())[:5]): 
        severity = "LOW"
        risk = int(detail.get('risk', '1'))
        if risk == 3:
            severity = "CRITICAL"
            base_score -= 20
        elif risk == 2:
            severity = "HIGH"
            base_score -= 10
        elif risk == 1:
            severity = "MEDIUM"
            base_score -= 5
            
        title = f"{alert_name}"
        desc = detail.get('description', '')[:200]
        uri = detail.get('url', 'Global')
        
        try:
            ai_res = ai_engine.explain_vulnerability(title, desc)
        except Exception:
            ai_res = {"summary": desc, "risk": "Unknown", "fix": detail.get('solution', 'Check vendor docs.')}

        vulnerabilities_to_add.append({
            "type": "WEB_VULNERABILITY",
            "severity": severity,
            "source": "ZAP",
            "endpoint": uri,
            "description": ai_res.get("summary", desc) + " " + ai_res.get("risk", ""),
            "fix": ai_res.get("fix", ""),
            "confidence": int(detail.get('confidence', '2')) / 3.0,
            "raw_data": detail
        })
        
    log_and_publish(db, scan_id, "ZAP vectors normalized", 95, "AI Analysis")
    update_db_state(db, scan_id, 95, "AI Analysis")
    
    # Store and Commit
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    if scan:
        scan.status = "completed"
        scan.threat_score = max(0, min(100, base_score))
        scan.progress = 100
        scan.current_step = "Completed"
        
        db.query(models.Vulnerability).filter(models.Vulnerability.scan_id == scan_id).delete()
        for v in vulnerabilities_to_add:
            db_vuln = models.Vulnerability(
                scan_id=scan.id,
                type=v["type"],
                severity=v["severity"],
                source=v["source"],
                endpoint=v["endpoint"],
                description=v["description"],
                fix=v["fix"],
                confidence=v["confidence"],
                raw_data=v["raw_data"]
            )
            db.add(db_vuln)
        db.commit()
    
    publish_event(scan_id, "completed", 100, "Completed", {"log": "Pipeline executed successfully"})

def run_synchronous_orchestrator(scan_id: str, target: str):
    db: Session = SessionLocal()
    update_db_state(db, scan_id, 5, "Initializing", "running")
    publish_event(scan_id, "progress", 5, "Initializing")
    try:
        domain, ip = run_recon(db, scan_id, target)
        open_ports = run_nmap(db, scan_id, ip, domain)
        zap_alerts = run_zap(db, scan_id, target)
        run_ai_and_finalize(db, scan_id, open_ports, zap_alerts)
    except Exception as general_error:
        update_db_state(db, scan_id, 0, "Failed", "failed") # Setting progress 0 or keeping it, but status Failed
        log_and_publish(db, scan_id, f"CRITICAL RUNTIME ERROR: {str(general_error)}", 0, "Failed", is_error=True)
        # Raise it back so Celery knows it failed and can re-attempt tracking
        raise general_error
    finally:
        db.close()
