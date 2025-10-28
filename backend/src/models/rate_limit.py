from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class RateLimit(BaseModel):
    """Model for rate limit tracking records"""
    id: UUID
    user_id: UUID
    attempted_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class RateLimitStatus(BaseModel):
    """Model for rate limit status response"""
    can_request: bool
    remaining_requests: int
    retry_after_seconds: int
    window_seconds: int = 60
    max_requests: int = 3
