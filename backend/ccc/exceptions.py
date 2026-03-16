"""
CCC SDK — Custom Exception Types
==================================
Enterprise-grade exception hierarchy for Cisco Catalyst Center API errors.
"""


class CCCError(Exception):
    """Base exception for all CCC SDK errors."""

    def __init__(self, message: str, status_code: int = None, response_body: dict = None):
        self.status_code = status_code
        self.response_body = response_body or {}
        super().__init__(message)


class CCCAuthError(CCCError):
    """Raised when authentication with CCC fails (invalid credentials, expired token)."""
    pass


class CCCApiError(CCCError):
    """Raised when a CCC API call returns a non-2xx response."""
    pass


class CCCRateLimitError(CCCError):
    """Raised when CCC returns HTTP 429 (Too Many Requests)."""

    def __init__(self, retry_after: int = 60, **kwargs):
        self.retry_after = retry_after
        super().__init__(
            f"CCC rate limit exceeded. Retry after {retry_after}s.",
            status_code=429,
            **kwargs,
        )


class CCCTimeoutError(CCCError):
    """Raised when a CCC API call exceeds the timeout threshold."""
    pass


class CCCConnectionError(CCCError):
    """Raised when the CCC instance is unreachable."""
    pass
