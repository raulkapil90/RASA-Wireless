import requests
import json

base_url = "http://localhost:8000"

def run_test(name, method, url, json_data=None):
    print(f"--- {name} ---")
    try:
        if method == "GET":
            response = requests.get(url)
        else:
            response = requests.post(url, json=json_data)
        
        print(f"STATUS: {response.status_code}")
        try:
            print("JSON_START")
            print(json.dumps(response.json(), indent=2))
        except:
            print("RAW_START")
            print(response.text)
    except Exception as e:
        print(f"ERROR: {e}")
    print(f"--- END {name} ---\n")

run_test("TEST 1 - SOURCES", "GET", f"{base_url}/sources")

log_payload = {
  "log_text": "*Mar 1 00:01:23.456: %DOT11-6-ASSOC: Station 00:11:22:33:44:55 Associated KEY_MGMT[WPAv2]\n*Mar 1 00:02:11.789: %DOT11-4-DISASSOC: Station 00:11:22:33:44:55 Disassociated REASON-CODE: 3\n*Mar 1 00:02:45.123: %RADIUS-4-RADIUS_DEAD: RADIUS server 192.168.1.10 is not responding"
}
run_test("TEST 2 - POST LOGS WITH log_text", "POST", f"{base_url}/analyze-logs", log_payload)

log_payload_fixed = {
  "logs": "*Mar 1 00:01:23.456: %DOT11-6-ASSOC: Station 00:11:22:33:44:55 Associated KEY_MGMT[WPAv2]\n*Mar 1 00:02:11.789: %DOT11-4-DISASSOC: Station 00:11:22:33:44:55 Disassociated REASON-CODE: 3\n*Mar 1 00:02:45.123: %RADIUS-4-RADIUS_DEAD: RADIUS server 192.168.1.10 is not responding"
}
run_test("TEST 2B - POST LOGS WITH logs (Fixed Schema)", "POST", f"{base_url}/analyze-logs", log_payload_fixed)

run_test("TEST 3 - ISSUES", "GET", f"{base_url}/ccc/issues")
