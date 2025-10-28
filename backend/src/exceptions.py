"""Custom exception classes for Yarda application"""


class YardaException(Exception):
    """Base exception for all Yarda errors"""

    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class AuthenticationError(YardaException):
    """Raised when authentication fails"""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, status_code=401)


class AuthorizationError(YardaException):
    """Raised when user lacks permissions"""

    def __init__(self, message: str = "Unauthorized access"):
        super().__init__(message, status_code=403)


class ResourceNotFoundError(YardaException):
    """Raised when requested resource doesn't exist"""

    def __init__(self, resource: str):
        super().__init__(f"{resource} not found", status_code=404)


class ValidationError(YardaException):
    """Raised when input validation fails"""

    def __init__(self, message: str):
        super().__init__(message, status_code=422)


class InsufficientCreditsError(YardaException):
    """Raised when user has no credits"""

    def __init__(self):
        super().__init__(
            "Insufficient credits to generate design. Please purchase tokens or wait for trial credit reset.",
            status_code=402
        )


class RateLimitError(YardaException):
    """Raised when rate limit exceeded"""

    def __init__(self, retry_after: int):
        self.retry_after = retry_after
        super().__init__(
            f"Rate limit exceeded. Try again in {retry_after} seconds",
            status_code=429
        )


class DatabaseError(YardaException):
    """Raised when database operation fails"""

    def __init__(self, message: str = "Database operation failed"):
        super().__init__(message, status_code=500)


class ExternalServiceError(YardaException):
    """Raised when external service (AI, payment, etc.) fails"""

    def __init__(self, service: str, message: str = None):
        error_message = f"{service} service error"
        if message:
            error_message += f": {message}"
        super().__init__(error_message, status_code=503)
