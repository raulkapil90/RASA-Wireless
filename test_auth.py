import urllib.request
import json
import traceback

def fetch(url, headers={}):
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())
    except Exception as e:
        return 500, {"error": str(e), "trace": traceback.format_exc()}

if __name__ == "__main__":
    print("--- TEST 1: HEALTH NO KEY ---")
    s, b = fetch('http://localhost:8000/api/health')
    print(f"Status: {s}")
    print(json.dumps(b, indent=2))

    print("\n--- TEST 2: SOURCES NO KEY ---")
    s, b = fetch('http://localhost:8000/sources')
    print(f"Status: {s}")
    print(json.dumps(b, indent=2))

    print("\n--- TEST 3: SOURCES WITH KEY ---")
    s, b = fetch('http://localhost:8000/sources', headers={'X-RASA-API-Key': 'test-key'})
    print(f"Status: {s}")
    print(json.dumps(b, indent=2))
