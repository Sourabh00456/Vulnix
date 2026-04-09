import json
import requests
import time
from app.core.config import settings

class ZapService:
    def __init__(self):
        self.zap_url = settings.ZAP_URL
    
    def trigger_spider(self, target_url: str) -> str:
        res = requests.get(f"{self.zap_url}/JSON/spider/action/scan/", params={
            "url": target_url,
            "maxChildren": "",
            "recurse": "true",
            "contextName": "",
            "subtreeOnly": ""
        })
        return res.json().get('scan')

    def trigger_active_scan(self, target_url: str) -> str:
        res = requests.get(f"{self.zap_url}/JSON/ascan/action/scan/", params={
            "url": target_url,
            "recurse": "true",
            "inScopeOnly": "false",
            "scanPolicyName": "",
            "method": "",
            "postData": ""
        })
        return res.json().get('scan')

    def get_spider_status(self, scan_id: str) -> int:
        res = requests.get(f"{self.zap_url}/JSON/spider/view/status/", params={"scanId": scan_id})
        return int(res.json().get('status', 0))

    def get_ascan_status(self, scan_id: str) -> int:
        res = requests.get(f"{self.zap_url}/JSON/ascan/view/status/", params={"scanId": scan_id})
        return int(res.json().get('status', 0))

    def get_alerts(self, base_url: str) -> list:
        res = requests.get(f"{self.zap_url}/JSON/core/view/alerts/", params={
            "baseurl": base_url,
            "start": "",
            "count": ""
        })
        return res.json().get('alerts', [])
