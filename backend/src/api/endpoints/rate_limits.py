"""
Rate Limits API Endpoints

Provides rate limit status information for the authenticated user.
"""

from fastapi import APIRouter, Depends
from uuid import UUID
from ...models.rate_limit import RateLimitStatus
from ...services.rate_limit_service import RateLimitService
from ..dependencies import get_verified_user, get_rate_limit_service

router = APIRouter(prefix="/rate-limits", tags=["rate-limits"])


@router.get(
    "/status",
    response_model=RateLimitStatus,
    summary="Get rate limit status",
    description="""
    Get the authenticated user's current rate limit status.

    ## Rate Limiting Overview
    To prevent abuse and ensure fair usage, Yarda enforces rate limits
    on generation requests:

    - **Maximum requests**: 3 generations per window
    - **Window duration**: 60 seconds (rolling window)
    - **Applied per user**: Each user has their own independent limit

    ## Response Fields
    - **can_request**: Boolean - whether user can make a request now
    - **remaining_requests**: Number of requests available in current window
    - **retry_after_seconds**: Seconds to wait before next request (0 if can_request=true)
    - **window_seconds**: Size of the rate limit window (always 60)
    - **max_requests**: Maximum requests allowed per window (always 3)

    ## Example Responses

    ### Fresh Start (No Recent Requests)
    ```json
    {
      "can_request": true,
      "remaining_requests": 3,
      "retry_after_seconds": 0,
      "window_seconds": 60,
      "max_requests": 3
    }
    ```
    User can make 3 requests immediately.

    ### After 1 Request
    ```json
    {
      "can_request": true,
      "remaining_requests": 2,
      "retry_after_seconds": 0,
      "window_seconds": 60,
      "max_requests": 3
    }
    ```
    User can still make 2 more requests.

    ### After 3 Requests (Rate Limited)
    ```json
    {
      "can_request": false,
      "remaining_requests": 0,
      "retry_after_seconds": 45,
      "window_seconds": 60,
      "max_requests": 3
    }
    ```
    User must wait 45 seconds before making another request.

    ### Rate Limit Resetting
    ```json
    {
      "can_request": true,
      "remaining_requests": 1,
      "retry_after_seconds": 0,
      "window_seconds": 60,
      "max_requests": 3
    }
    ```
    After waiting, oldest requests have expired and user has 1 available slot.

    ## How Rate Limiting Works

    ### Rolling Window
    The rate limit uses a **rolling 60-second window**, not a fixed time slot:

    - **Example Timeline**:
      - `00:00` - Request 1
      - `00:15` - Request 2
      - `00:30` - Request 3 (now rate limited)
      - `00:59` - Still rate limited (29s left)
      - `01:00` - Request 1 expires, can make new request
      - `01:15` - Request 2 expires, can make new request
      - `01:30` - Request 3 expires, can make new request

    ### Why Check Rate Limit?
    1. **Prevent 429 errors**: Check before attempting generation
    2. **Show UI feedback**: Display "X requests remaining"
    3. **Countdown timer**: Show "Try again in X seconds"
    4. **Disable buttons**: Disable generate button when rate limited

    ## Integration Examples

    ### React Hook
    ```typescript
    const useRateLimitStatus = () => {
      const { data } = useQuery(
        ['rate-limit-status'],
        () => fetch('/api/rate-limits/status').then(r => r.json()),
        { refetchInterval: 5000 } // Poll every 5 seconds
      );

      return {
        canGenerate: data?.can_request ?? false,
        remaining: data?.remaining_requests ?? 0,
        retryAfter: data?.retry_after_seconds ?? 0
      };
    };
    ```

    ### UI Components
    ```typescript
    // Show remaining requests
    {remaining > 0 && (
      <Badge>{remaining} requests remaining</Badge>
    )}

    // Show countdown when rate limited
    {retryAfter > 0 && (
      <Alert>
        Rate limit exceeded. Try again in {retryAfter}s
      </Alert>
    )}

    // Disable button when rate limited
    <Button
      disabled={!canGenerate}
      onClick={handleGenerate}
    >
      Generate Design
    </Button>
    ```

    ## Best Practices
    1. **Check before generating**: Prevent unnecessary 429 errors
    2. **Poll periodically**: Update UI every 5-10 seconds
    3. **Show clear feedback**: Tell users when they're rate limited
    4. **Display countdown**: Show time until next request available
    5. **Handle gracefully**: Provide alternative actions when rate limited

    ## Rate Limit vs 429 Error
    - **This endpoint**: Proactive check, always returns 200
    - **Generation endpoint**: Returns 429 if rate limit exceeded
    - **Recommendation**: Check status before attempting generation
    """,
    responses={
        200: {
            "description": "Rate limit status retrieved successfully",
            "content": {
                "application/json": {
                    "examples": {
                        "available": {
                            "summary": "User can make requests",
                            "value": {
                                "can_request": True,
                                "remaining_requests": 3,
                                "retry_after_seconds": 0,
                                "window_seconds": 60,
                                "max_requests": 3
                            }
                        },
                        "rate_limited": {
                            "summary": "User is rate limited",
                            "value": {
                                "can_request": False,
                                "remaining_requests": 0,
                                "retry_after_seconds": 45,
                                "window_seconds": 60,
                                "max_requests": 3
                            }
                        },
                        "partial": {
                            "summary": "Some requests remaining",
                            "value": {
                                "can_request": True,
                                "remaining_requests": 1,
                                "retry_after_seconds": 0,
                                "window_seconds": 60,
                                "max_requests": 3
                            }
                        }
                    }
                }
            }
        },
        401: {
            "description": "Not authenticated - JWT token missing or invalid",
            "content": {
                "application/json": {
                    "example": {
                        "error": "AuthenticationError",
                        "message": "Authentication required"
                    }
                }
            }
        },
        403: {
            "description": "Email not verified",
            "content": {
                "application/json": {
                    "example": {
                        "error": "EmailNotVerifiedError",
                        "message": "Email verification required"
                    }
                }
            }
        },
        500: {
            "description": "Internal server error",
            "content": {
                "application/json": {
                    "example": {
                        "error": "InternalServerError",
                        "message": "An unexpected error occurred. Please try again later."
                    }
                }
            }
        }
    }
)
async def get_rate_limit_status(
    current_user=Depends(get_verified_user),
    rate_limit_service: RateLimitService = Depends(get_rate_limit_service)
):
    """
    Get current rate limit status for user.

    Returns information about whether user can make a request,
    how many requests remain, and when they can request again if rate limited.
    """
    user_id = UUID(current_user.id)

    # Service will raise DatabaseError if operations fail
    # Global exception handler will convert to 500 response

    # Check if user can make request
    can_request = await rate_limit_service.check_rate_limit(user_id)

    # Get remaining requests
    remaining = await rate_limit_service.get_remaining_requests(user_id)

    # Get retry after time (only if rate limited)
    retry_after = 0
    if not can_request:
        retry_after = await rate_limit_service.get_time_until_reset(user_id)

    return RateLimitStatus(
        can_request=can_request,
        remaining_requests=remaining,
        retry_after_seconds=retry_after,
        window_seconds=60,
        max_requests=3
    )
