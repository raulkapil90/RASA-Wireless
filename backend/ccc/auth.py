"""
CCC SDK — Authentication & Token Management
=============================================
Thread-safe Cisco Catalyst Center token lifecycle manager.

Features:
  • Automatic token refresh before expiry
  • Exponential backoff on transient failures
  • HTTP 429 rate-limit awareness
  • Environment-variable driven — zero hardcoded credentials
"""

import logging
import os
import threading
import time
from datetime import datetime, timedelta, timezone

import requests
from requests.exceptions import ConnectionError as ReqConnectionError
from requests.exceptions import Timeout as ReqTimeout

from .exceptions import (
    CCCAuthError,
    CCCConnectionError,
    CCCRateLimitError,
    CCCTimeoutError,
)

logger = logging.getLogger(__name__)

# Token refresh buffer: renew 5 minutes before actual expiry
_REFRESH_BUFFER_SECONDS = 300

# Retry config for transient failures
_MAX_RETRIES = 3
_BACKOFF_BASE = 2  # seconds


class CccAuth:
    """
    Manages the CCC authentication token lifecycle.

    Usage:
        auth = CccAuth()
        headers = auth.get_auth_headers()
        # → {"X-Auth-Token": "eyJ...", "Content-Type": "application/json"}
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        """Singleton — one auth manager per process."""
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True

        self.base_url = os.getenv("CCC_BASE_URL", "").rstrip("/")
        self.username = os.getenv("CCC_USERNAME", "")
        self.password = os.getenv("CCC_PASSWORD", "")
        self.verify_ssl = os.getenv("CCC_VERIFY_SSL", "true").lower() == "true"

        self._token: str | None = None
        self._token_expiry: datetime | None = None
        self._token_lock = threading.Lock()

        if not self.base_url:
            logger.warning(
                "CCC_BASE_URL not set — running in DEMO mode. "
                "Set CCC_BASE_URL, CCC_USERNAME, CCC_PASSWORD in .env to connect."
            )

    @property
    def is_demo_mode(self) -> bool:
        """True when no CCC instance is configured."""
        return not self.base_url

    def get_token(self) -> str:
        """
        Returns a valid CCC auth token, refreshing if necessary.
        Thread-safe.
        """
        if self.is_demo_mode:
            return "DEMO_TOKEN"

        with self._token_lock:
            if self._token and self._token_expiry and datetime.now(timezone.utc) < self._token_expiry:
                return self._token

            # Token is missing or expired — authenticate
            self._authenticate()
            return self._token

    def get_auth_headers(self) -> dict[str, str]:
        """Returns headers dict with the current auth token."""
        return {
            "X-Auth-Token": self.get_token(),
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def invalidate(self):
        """Force token refresh on next call."""
        with self._token_lock:
            self._token = None
            self._token_expiry = None
            logger.info("CCC token invalidated — will re-authenticate on next request.")

    # ── Private ───────────────────────────────────────────────────────────

    def _authenticate(self):
        """
        Authenticates against POST /dna/system/api/v1/auth/token.
        Retries with exponential backoff on transient errors.
        """
        url = f"{self.base_url}/dna/system/api/v1/auth/token"
        last_error = None

        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                logger.info("CCC auth attempt %d/%d → %s", attempt, _MAX_RETRIES, url)

                resp = requests.post(
                    url,
                    auth=(self.username, self.password),
                    headers={"Content-Type": "application/json"},
                    verify=self.verify_ssl,
                    timeout=30,
                )

                if resp.status_code == 200:
                    data = resp.json()
                    self._token = data.get("Token", "")
                    # CCC tokens typically expire in 60 minutes
                    self._token_expiry = datetime.now(timezone.utc) + timedelta(
                        seconds=3600 - _REFRESH_BUFFER_SECONDS
                    )
                    logger.info("CCC authenticated successfully. Token valid until %s.", self._token_expiry.isoformat())
                    return

                if resp.status_code == 401:
                    raise CCCAuthError(
                        "Invalid CCC credentials. Check CCC_USERNAME and CCC_PASSWORD.",
                        status_code=401,
                    )

                if resp.status_code == 429:
                    retry_after = int(resp.headers.get("Retry-After", 60))
                    raise CCCRateLimitError(retry_after=retry_after)

                # Other non-2xx
                last_error = CCCAuthError(
                    f"CCC auth returned HTTP {resp.status_code}: {resp.text[:200]}",
                    status_code=resp.status_code,
                )

            except ReqTimeout:
                last_error = CCCTimeoutError("CCC auth request timed out.")
            except ReqConnectionError:
                last_error = CCCConnectionError(f"Cannot reach CCC at {self.base_url}")
            except (CCCAuthError, CCCRateLimitError):
                raise  # Don't retry auth failures or rate limits

            # Exponential backoff
            wait = _BACKOFF_BASE ** attempt
            logger.warning("CCC auth attempt %d failed, retrying in %ds…", attempt, wait)
            time.sleep(wait)

        raise last_error or CCCAuthError("CCC authentication failed after all retries.")
