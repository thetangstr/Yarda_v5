"""
Generations API Endpoints

Handles landscape design generation requests, status polling, and history.
"""

from fastapi import APIRouter, Depends, status, Query
from typing import Optional
from uuid import UUID
from ...models.generation import (
    Generation,
    GenerationCreate,
    GenerationListResponse,
    GenerationStatus
)
from ...services.generation_service import GenerationService
from ..dependencies import get_supabase_client, get_verified_user, check_user_rate_limit

router = APIRouter(prefix="/generations", tags=["generations"])


@router.post(
    "",
    response_model=Generation,
    status_code=status.HTTP_201_CREATED,
    summary="Create new landscape design generation",
    description="""
    Create a new AI-powered landscape design generation.

    ## Requirements
    - User must be authenticated (JWT token required)
    - User must have verified email address
    - User must have available credits (trial or token)
    - Must not exceed rate limit (3 requests per 60 seconds)

    ## Credit Consumption
    - **Trial credits** are consumed first (3 free credits for new users)
    - **Token credits** are consumed after trial credits exhausted
    - Credits are **automatically refunded** if generation fails
    - Credit consumption is **atomic** (prevents race conditions)

    ## Process Flow
    1. Validates user authentication and email verification
    2. Checks rate limit (returns 429 if exceeded)
    3. Consumes one credit atomically using database function
    4. Creates generation record with status='pending'
    5. Starts async background processing (AI model)
    6. Returns generation object immediately (non-blocking)

    ## Status Polling
    Use `GET /generations/{id}` to poll for completion.

    **Expected state transitions:**
    - `pending` → Generation queued, not started yet
    - `processing` → AI model is actively generating design
    - `completed` → Generation successful, output_image_url available
    - `failed` → Generation failed, credit automatically refunded

    ## Input Types
    - **address**: Provide street address for satellite imagery
    - **photo**: Provide URL to uploaded yard photo

    ## Design Styles
    Available styles: modern, traditional, tropical, desert, zen, cottage

    ## Example Request
    ```json
    {
      "input_type": "address",
      "input_address": "123 Main St, San Francisco, CA 94102",
      "style": "modern"
    }
    ```

    ## Example Response
    ```json
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "status": "pending",
      "input_type": "address",
      "input_address": "123 Main St, San Francisco, CA 94102",
      "style": "modern",
      "credit_type": "trial",
      "created_at": "2025-10-28T12:00:00Z",
      "updated_at": "2025-10-28T12:00:00Z"
    }
    ```
    """,
    responses={
        201: {
            "description": "Generation created successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "user_id": "123e4567-e89b-12d3-a456-426614174000",
                        "status": "pending",
                        "input_type": "address",
                        "input_address": "123 Main St, San Francisco, CA",
                        "style": "modern",
                        "credit_type": "trial",
                        "created_at": "2025-10-28T12:00:00Z",
                        "updated_at": "2025-10-28T12:00:00Z"
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
        402: {
            "description": "Insufficient credits - no trial or token credits available",
            "content": {
                "application/json": {
                    "example": {
                        "error": "InsufficientCreditsError",
                        "message": "Insufficient credits. Please purchase tokens."
                    }
                }
            }
        },
        403: {
            "description": "Email not verified - must verify email before generating",
            "content": {
                "application/json": {
                    "example": {
                        "error": "EmailNotVerifiedError",
                        "message": "Email verification required"
                    }
                }
            }
        },
        422: {
            "description": "Validation error - invalid input data",
            "content": {
                "application/json": {
                    "example": {
                        "error": "ValidationError",
                        "message": "Invalid request data",
                        "details": [
                            {
                                "loc": ["body", "style"],
                                "msg": "field required",
                                "type": "value_error.missing"
                            }
                        ]
                    }
                }
            }
        },
        429: {
            "description": "Rate limit exceeded - too many requests",
            "content": {
                "application/json": {
                    "example": {
                        "error": "RateLimitError",
                        "message": "Rate limit exceeded",
                        "retry_after": 45
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
async def create_generation(
    generation_data: GenerationCreate,
    current_user=Depends(get_verified_user),
    _rate_limit_check=Depends(check_user_rate_limit),
    supabase=Depends(get_supabase_client)
):
    """
    Create a new design generation

    All exceptions are handled by global exception handlers and converted
    to appropriate HTTP responses with proper status codes.
    """
    generation_service = GenerationService(supabase)
    user_id = UUID(current_user.id)

    # Service will raise appropriate exceptions if issues occur
    # Global exception handlers will convert them to HTTP responses
    generation = await generation_service.create_generation(
        user_id=user_id,
        generation_data=generation_data
    )

    return generation


@router.get(
    "/{generation_id}",
    response_model=Generation,
    summary="Get generation by ID",
    description="""
    Retrieve a specific generation by its unique ID.

    ## Use Cases
    - **Status polling**: Check if generation is complete
    - **Result retrieval**: Get output_image_url when status is 'completed'
    - **Error checking**: View error details if status is 'failed'
    - **History viewing**: Retrieve past generation details

    ## Status Flow
    Generations progress through these states:

    1. **pending**: Generation queued, waiting to be processed
       - Immediately after creation
       - May stay in pending if queue is busy

    2. **processing**: AI model is actively generating the design
       - Satellite imagery downloaded (for address input)
       - AI model running
       - Usually takes 30-60 seconds

    3. **completed**: Generation successful
       - `output_image_url` field contains the generated design
       - URL is publicly accessible
       - Image stored in Supabase Storage

    4. **failed**: Generation failed
       - Check `error_message` field for details
       - Credit automatically refunded
       - Can retry with a new request

    ## Polling Strategy
    Recommended polling approach:
    ```python
    # Poll every 2 seconds for first 30 seconds
    # Then poll every 5 seconds for next 60 seconds
    # Then poll every 10 seconds until complete
    ```

    ## Access Control
    - Users can only access their own generations
    - Attempting to access another user's generation returns 404
    - RLS (Row Level Security) enforced at database level

    ## Example Response (Completed)
    ```json
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "status": "completed",
      "input_type": "address",
      "input_address": "123 Main St, San Francisco, CA",
      "style": "modern",
      "output_image_url": "https://storage.supabase.co/...",
      "credit_type": "trial",
      "created_at": "2025-10-28T12:00:00Z",
      "updated_at": "2025-10-28T12:01:30Z"
    }
    ```
    """,
    responses={
        200: {
            "description": "Generation retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "user_id": "123e4567-e89b-12d3-a456-426614174000",
                        "status": "completed",
                        "input_type": "address",
                        "input_address": "123 Main St, San Francisco, CA",
                        "style": "modern",
                        "output_image_url": "https://storage.supabase.co/...",
                        "credit_type": "trial",
                        "created_at": "2025-10-28T12:00:00Z",
                        "updated_at": "2025-10-28T12:01:30Z"
                    }
                }
            }
        },
        401: {
            "description": "Not authenticated",
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
        404: {
            "description": "Generation not found or not owned by user",
            "content": {
                "application/json": {
                    "example": {
                        "error": "ResourceNotFoundError",
                        "message": "Generation not found"
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
async def get_generation(
    generation_id: UUID,
    current_user=Depends(get_verified_user),
    supabase=Depends(get_supabase_client)
):
    """
    Get generation details

    Retrieves a specific generation by ID. Users can only access their own generations.
    Service will raise ResourceNotFoundError if not found (converted to 404 by global handler).
    """
    generation_service = GenerationService(supabase)
    user_id = UUID(current_user.id)

    generation = await generation_service.get_generation(
        generation_id=generation_id,
        user_id=user_id
    )

    return generation


@router.get(
    "",
    response_model=GenerationListResponse,
    summary="List user's generation history",
    description="""
    Get paginated list of the authenticated user's generation history.

    ## Features
    - **Pagination support**: Use limit/offset for efficient loading
    - **Status filtering**: Filter by pending, processing, completed, or failed
    - **Ordered by date**: Newest generations first (created_at DESC)
    - **Access control**: Only returns user's own generations (RLS protected)

    ## Performance
    - **Optimized with database indexes** for fast queries
    - **Efficiently handles 100+ generations** without performance degradation
    - **Fast queries even with thousands of records** per user
    - **Uses composite index** on (user_id, created_at DESC)
    - **Partial index** for status filtering reduces index size

    ## Pagination
    Standard offset-based pagination:
    - `limit`: Number of results per page (1-100, default 20)
    - `offset`: Number of results to skip (default 0)

    Example pagination:
    - Page 1: `?limit=20&offset=0`
    - Page 2: `?limit=20&offset=20`
    - Page 3: `?limit=20&offset=40`

    ## Status Filtering
    Filter by generation status:
    - `?status=pending` - Only queued generations
    - `?status=processing` - Only active generations
    - `?status=completed` - Only successful generations
    - `?status=failed` - Only failed generations

    ## Response Metadata
    The response includes pagination metadata:
    - `items`: Array of generation objects
    - `total`: Total number of generations (across all pages)
    - `limit`: Page size used
    - `offset`: Offset used
    - `has_more`: Boolean indicating if more pages exist

    ## Example Request
    ```
    GET /api/generations?limit=20&offset=0&status=completed
    ```

    ## Example Response
    ```json
    {
      "items": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "user_id": "123e4567-e89b-12d3-a456-426614174000",
          "status": "completed",
          "input_type": "address",
          "input_address": "123 Main St, San Francisco, CA",
          "style": "modern",
          "output_image_url": "https://storage.supabase.co/...",
          "credit_type": "trial",
          "created_at": "2025-10-28T12:00:00Z",
          "updated_at": "2025-10-28T12:01:30Z"
        }
      ],
      "total": 42,
      "limit": 20,
      "offset": 0,
      "has_more": true
    }
    ```

    ## Typical Use Cases
    1. **History page**: Display user's past generations
    2. **Dashboard**: Show recent generations
    3. **Status monitoring**: Filter by pending/processing to check active jobs
    4. **Gallery**: Filter by completed to show finished designs
    """,
    responses={
        200: {
            "description": "List of generations with pagination metadata",
            "content": {
                "application/json": {
                    "example": {
                        "items": [
                            {
                                "id": "550e8400-e29b-41d4-a716-446655440000",
                                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                                "status": "completed",
                                "input_type": "address",
                                "input_address": "123 Main St, San Francisco, CA",
                                "style": "modern",
                                "output_image_url": "https://storage.supabase.co/...",
                                "credit_type": "trial",
                                "created_at": "2025-10-28T12:00:00Z",
                                "updated_at": "2025-10-28T12:01:30Z"
                            }
                        ],
                        "total": 42,
                        "limit": 20,
                        "offset": 0,
                        "has_more": True
                    }
                }
            }
        },
        401: {
            "description": "Not authenticated",
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
        422: {
            "description": "Invalid pagination parameters",
            "content": {
                "application/json": {
                    "example": {
                        "error": "ValidationError",
                        "message": "Invalid request data",
                        "details": [
                            {
                                "loc": ["query", "limit"],
                                "msg": "ensure this value is less than or equal to 100",
                                "type": "value_error.number.not_le"
                            }
                        ]
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
async def list_generations(
    limit: int = Query(20, ge=1, le=100, description="Number of items to return (1-100)"),
    offset: int = Query(0, ge=0, description="Number of items to skip for pagination"),
    status_filter: Optional[GenerationStatus] = Query(
        None,
        alias="status",
        description="Filter by generation status (pending, processing, completed, failed)"
    ),
    current_user=Depends(get_verified_user),
    supabase=Depends(get_supabase_client)
):
    """
    List user's generation history

    Returns paginated list of generations for the current user,
    ordered by creation date (newest first). Optimized for fast queries
    even with 100+ generations per user.
    """
    generation_service = GenerationService(supabase)
    user_id = UUID(current_user.id)

    # Service will raise ValidationError if pagination params are invalid
    result = await generation_service.list_user_generations(
        user_id=user_id,
        limit=limit,
        offset=offset,
        status_filter=status_filter
    )

    return result
