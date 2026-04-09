from fastapi import Security, HTTPException
from fastapi.security.api_key import APIKeyHeader
from backend.config import RASA_API_KEY, API_KEY_ENABLED

api_key_header = APIKeyHeader(name="X-RASA-API-Key", auto_error=False)

async def verify_api_key(api_key: str = Security(api_key_header)):
    if not API_KEY_ENABLED:
        return True
    if api_key != RASA_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")
    return True
