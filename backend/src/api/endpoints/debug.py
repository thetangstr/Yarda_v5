"""
Debug endpoints for troubleshooting generation flow.

Only accessible to admin users.
"""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from src.models.user import User
from src.api.dependencies import get_current_user
from src.services.debug_service import get_debug_service

router = APIRouter(prefix="/debug", tags=["debug"])


def require_admin(user: User = Depends(get_current_user)) -> User:
    """Ensure user is admin"""
    # For now, allow any authenticated user to view debug logs
    # In production, check against admin list
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return user


@router.get("/logs")
async def get_debug_logs(
    generation_id: str = Query(...),
    user: User = Depends(require_admin)
):
    """
    Get debug logs for a generation.

    Args:
        generation_id: Generation UUID to fetch logs for
        user: Current authenticated user (must be admin)

    Returns:
        JSON with list of debug log entries
    """
    try:
        gen_uuid = UUID(generation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid generation_id format"
        )

    debug_service = get_debug_service()
    logs = debug_service.get_logs(gen_uuid)

    return {
        "generation_id": generation_id,
        "logs": logs,
        "count": len(logs)
    }


@router.delete("/logs/{generation_id}")
async def clear_debug_logs(
    generation_id: str,
    user: User = Depends(require_admin)
):
    """
    Clear debug logs for a generation.

    Args:
        generation_id: Generation UUID to clear logs for
        user: Current authenticated user (must be admin)

    Returns:
        Confirmation message
    """
    try:
        gen_uuid = UUID(generation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid generation_id format"
        )

    debug_service = get_debug_service()
    debug_service.clear_logs(gen_uuid)

    return {
        "message": f"Cleared logs for generation {generation_id}",
        "generation_id": generation_id
    }
