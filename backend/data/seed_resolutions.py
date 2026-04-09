import json
import hashlib
import sqlite3
from datetime import datetime

# Direct SQLite connection for seeding
DB_PATH = "backend/db/netops.db"

def seed():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    resolutions = [
        {
            "log_text": "*Mar 1 00:02:45.123: %RADIUS-4-RADIUS_DEAD: RADIUS server 192.168.1.10 is not responding",
            "device_type": "aireos",
            "issue_category": "AUTH_FAILURE",
            "root_cause": "RADIUS server explicitly tracking as DEAD due to consecutive timeouts or ICMP unreachability.",
            "resolution_steps": [
                "Verify reachability between WLC management interface and RADIUS Server",
                "Ensure shared secret matches exactly on WLC and RADIUS",
                "Check perimeter firewall for dropped UDP port 1812/1813 traffic"
            ],
            "confidence_score": 0.95,
            "times_validated": 12,
            "source": "imported"
        },
        {
            "log_text": "AP-9800: %FMANFP-6-IPDT_LEARN: MAC aa:bb:cc:dd:ee:ff learnt on Vlan 10, IP 10.0.0.50", # mock representation of roaming issue
            "device_type": "catalyst_9800",
            "issue_category": "CLIENT_ISSUE",
            "root_cause": "Client sticky roaming detected, refusing to transition to BSSID with better RSSI metrics despite 802.11v BSS Transition requests.",
            "resolution_steps": [
                "Verify 802.11k and 802.11v are enabled on the specific WLAN Profile",
                "Update client wireless NIC drivers to support modern transition protocols",
                "Enable optimized roaming thresholds on WLC"
            ],
            "confidence_score": 0.95,
            "times_validated": 8,
            "source": "imported"
        },
        {
            "log_text": "%CLEANAIR-6-STATE: Slot 1 down, Interference threshold exceeded",
            "device_type": "unknown",
            "issue_category": "RF_EVENT",
            "root_cause": "Severe non-Wi-Fi interference exceeding CleanAir tolerance levels triggering radio fallback.",
            "resolution_steps": [
                "Identify interference source using CleanAir spectrum intelligence graphs",
                "Enable Event-Driven RRM (ED-RRM) to rapidly switch channels on severe interference",
                "Physically relocate AP if persistent localized interference (e.g., microwave, analog camera) persists"
            ],
            "confidence_score": 0.95,
            "times_validated": 18,
            "source": "imported"
        },
        {
            "log_text": "%ILPOWER-3-CONTROLLER_PORT_ERR: Controller port error, Interface Gi1/0/14: Power Controller reports power Imax error detected",
            "device_type": "cisco_iosxe",
            "issue_category": "NETWORK_EVENT",
            "root_cause": "The powered device is drawing more current than requested/allocated via CDP/LLDP, or port hardware fault.",
            "resolution_steps": [
                "Run 'show power inline' to verify if switch PoE budget is exhausted",
                "Hardcode power allocation: 'power inline static max 30000'",
                "Test AP on different port to isolate cable/switchport hardware issues"
            ],
            "confidence_score": 0.95,
            "times_validated": 20,
            "source": "imported"
        },
        {
            "log_text": "%SW_MATM-4-MACFLAP_NOTIF: Host aabb.ccdd.eeff in vlan 10 is flapping between port Gi1/0/1 and port Gi1/0/2",
            "device_type": "cisco_iosxe",
            "issue_category": "NETWORK_EVENT",
            "root_cause": "Layer 2 bridging loop detected or misconfigured EtherChannel across access layer.",
            "resolution_steps": [
                "Verify Spanning Tree block states for Vlan 10",
                "Confirm 'channel-group' and 'switchport mode' match precisely on both physical bounds",
                "Enable 'spanning-tree bpduguard enable' on access interfaces downstream"
            ],
            "confidence_score": 0.95,
            "times_validated": 15,
            "source": "imported"
        }
    ]

    import uuid
    import re
    
    def fingerprint(log_text):
        text = log_text
        text = re.compile(r'^\*?[A-Z][a-z]{2}\s+\d+\s+\d{2}:\d{2}:\d{2}\.\d{3,}:?\s*', re.MULTILINE).sub('', text)
        text = re.compile(r'\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\s*').sub('', text)
        text = re.compile(r'([0-9A-Fa-f]{2}[:-]?){5}([0-9A-Fa-f]{2})|([0-9A-Fa-f]{4}\.[0-9A-Fa-f]{4}\.[0-9A-Fa-f]{4})', re.IGNORECASE).sub('[MAC]', text)
        text = re.compile(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b').sub('[IP]', text)
        text = re.compile(r'\b(Gi|Te|FastEthernet|GigabitEthernet|TenGigabitEthernet|Vlan|Port-channel)[a-zA-Z]*[\d/]+\b').sub('[INT]', text)
        return hashlib.sha256(text.strip().encode('utf-8')).hexdigest()

    count = 0
    for r in resolutions:
        fp = fingerprint(r["log_text"])
        cursor.execute("SELECT id FROM rasa_resolutions WHERE log_fingerprint = ?", (fp,))
        if cursor.fetchone():
            continue
        
        cursor.execute('''
            INSERT INTO rasa_resolutions (id, log_fingerprint, device_type, issue_category, root_cause, resolution_steps, confidence_score, times_validated, source, client_env_tags, created_at, last_seen, is_deleted)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?, False)
        ''', (
            str(uuid.uuid4()), fp, r["device_type"], r["issue_category"], r["root_cause"],
            json.dumps(r["resolution_steps"]), r["confidence_score"], r["times_validated"],
            r["source"], datetime.utcnow().isoformat(), datetime.utcnow().isoformat()
        ))
        count += 1
        
    conn.commit()
    conn.close()
    
    if count > 0:
        print(f"✅ Successfully seeded {count} new resolution templates into internal DB.")
    else:
        print("⚡ DB fully seeded, no new templates applied.")

if __name__ == "__main__":
    seed()
