import urllib.request
import json
import traceback

def get_health():
    try:
        resp = urllib.request.urlopen('http://localhost:8000/api/health')
        return json.loads(resp.read().decode())
    except Exception as e:
        return {"error": str(e), "trace": traceback.format_exc()}

if __name__ == "__main__":
    import sys
    print("Health response:", get_health())
