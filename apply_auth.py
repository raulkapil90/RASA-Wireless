import glob
import os
import re

print("Starting auth implementation...")

# 1. Update config.py
with open("backend/config.py", "r") as f:
    config = f.read()

if "RASA_API_KEY" not in config:
    config += "\n# Authentication Configuration\n"
    config += 'RASA_API_KEY = os.getenv("RASA_API_KEY", "dev-secret-key-123")\n'
    config += 'API_KEY_ENABLED = os.getenv("API_KEY_ENABLED", "true").lower() == "true"\n'
    with open("backend/config.py", "w") as f:
        f.write(config)
    print("Updated config.py")

# 2. Update .env.example
with open("backend/.env.example", "r") as f:
    env = f.read()

if "RASA_API_KEY" not in env:
    env += "\n# Authentication\nRASA_API_KEY=your_secure_api_key_here\nAPI_KEY_ENABLED=true\n"
    with open("backend/.env.example", "w") as f:
        f.write(env)
    print("Updated .env.example")

# 3. Create services/auth.py
os.makedirs("backend/services", exist_ok=True)
with open("backend/services/auth.py", "w") as f:
    f.write('''from fastapi import Security, HTTPException
from fastapi.security.api_key import APIKeyHeader
from backend.config import RASA_API_KEY, API_KEY_ENABLED

api_key_header = APIKeyHeader(name="X-RASA-API-Key", auto_error=False)

async def verify_api_key(api_key: str = Security(api_key_header)):
    if not API_KEY_ENABLED:
        return True
    if api_key != RASA_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")
    return True
''')
print("Created services/auth.py")

# 4. Process all routers
router_files = glob.glob("backend/routers/*.py") + ["backend/webhooks/router.py"]
for fpath in router_files:
    if not os.path.exists(fpath): continue
    with open(fpath, "r") as f:
        content = f.read()
    
    if "verify_api_key" in content:
        continue
        
    content = "from fastapi import Depends\nfrom backend.services.auth import verify_api_key\n" + content
    content = re.sub(
        r'router\s*=\s*APIRouter\((.*?)\)',
        r'router = APIRouter(\1, dependencies=[Depends(verify_api_key)])',
        content
    )
    content = content.replace("APIRouter(, ", "APIRouter(")
    
    with open(fpath, "w") as f:
        f.write(content)
    print(f"Updated {fpath}")

# 5. Process main.py
with open("backend/main.py", "r") as f:
    main_content = f.read()

if "api_router = APIRouter(" not in main_content:
    # We inject the api_router definition right above the # Request/Response models
    router_def = """
from fastapi import APIRouter, Depends
from .services.auth import verify_api_key

api_router = APIRouter(dependencies=[Depends(verify_api_key)])
app.include_router(api_router)
"""
    main_content = main_content.replace("# ── Request / Response Models ─────────────────────────────────────────────", 
                                        router_def + "\n# ── Request / Response Models ─────────────────────────────────────────────")
    
    # We replace @app.get/post with @api_router.get/post except for /api/health
    # Find all: @app.post("/query")
    routes_to_move = [
        "/query",
        "/ingest",
        "/analyze-logs",
        "/sources",
        "/ccc/issues",
        "/ccc/ipam/forecast",
        "/ccc/reports",
        "/ccc/remediate/propose",
        "/ccc/remediate/approve/{proposal_id}",
        "/ccc/remediate/execute/{proposal_id}"
    ]
    
    for route in routes_to_move:
        main_content = main_content.replace(f'@app.post("{route}")', f'@api_router.post("{route}")')
        main_content = main_content.replace(f'@app.get("{route}")', f'@api_router.get("{route}")')

    with open("backend/main.py", "w") as f:
        f.write(main_content)
    print("Updated main.py")

print("Auth implementation complete.")
