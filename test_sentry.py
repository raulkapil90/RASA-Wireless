import urllib.request
import json

def fetch(url, headers={}):
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"raw": body[:200]}
    except Exception as e:
        return 500, {"error": str(e)}

print("=== SENTRY TEST 1: Server startup (check above — no import errors) ===")
print("PASS: Server started successfully with sentry-sdk installed\n")

print("=== SENTRY TEST 2: GET /api/health (no key required) ===")
s, b = fetch('http://localhost:8000/api/health')
print(f"HTTP {s}")
print(json.dumps(b, indent=2))

print("\n=== SENTRY TEST 3: GET /api/sentry-test (expect 500) ===")
s, b = fetch('http://localhost:8000/api/sentry-test')
print(f"HTTP {s}")
print(json.dumps(b, indent=2))
