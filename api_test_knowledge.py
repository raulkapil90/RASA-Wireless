import requests
import json

base_url = "http://localhost:8000"

print("--- TEST 1: KNOWN RADIUS LOG ---")
res = requests.post(f"{base_url}/analyze-logs", json={"logs": "*Mar 1 00:02:45.123: %RADIUS-4-RADIUS_DEAD: RADIUS server 192.168.1.10 is not responding"})
data = res.json()
print("STATUS:", res.status_code)
print(json.dumps(data, indent=2))

res_id = data.get("findings", [{}])[0].get("id")

print("\n--- TEST 2: NOVEL LOG ---")
# This should trigger Tier 2 LLM consensus
res2 = requests.post(f"{base_url}/analyze-logs", json={"logs": "*Apr 5 12:00:00.000: %NOVEL-ERR-001: Experimental quantum AP 5ghz phased array decoupling unexpectedly"})
print("STATUS:", res2.status_code)
print(json.dumps(res2.json(), indent=2))

print("\n--- TEST 3: STATS ---")
res3 = requests.get(f"{base_url}/knowledge/stats")
print("STATUS:", res3.status_code)
print(json.dumps(res3.json(), indent=2))

print("\n--- TEST 4: CONFIRM RESOLUTION ---")
if res_id:
    res4 = requests.post(f"{base_url}/knowledge/resolutions/{res_id}/confirm")
    print("STATUS:", res4.status_code)
    print(json.dumps(res4.json(), indent=2))
else:
    print("No resolution ID generated to test.")
