"""
Retention Policy Service

Handles data retention rules for generations based on payment type:
- Trial: Deleted immediately (expires_at = created_at)
- Token: Deleted after 7 days (expires_at = created_at + 7 days)
- Subscription: Kept indefinitely (expires_at = NULL)

Feature: Retention Policy
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple


def calculate_expiry_timestamp(payment_type: str, created_at: datetime) -> Optional[datetime]:
    """
    Calculate when a generation should expire based on payment type.

    Args:
        payment_type: 'trial', 'token', or 'subscription'
        created_at: Creation timestamp (UTC)

    Returns:
        Expiry timestamp or None (for subscriptions)

    Logic:
        - Trial: Expires immediately (created_at) - not saved
        - Token: Expires in 7 days (created_at + 7 days)
        - Subscription: Never expires (None)
    """
    if payment_type == "subscription":
        return None  # Never expires
    elif payment_type == "trial":
        return created_at  # Expires immediately, not saved
    elif payment_type == "token":
        return created_at + timedelta(days=7)  # Expires in 7 days
    else:
        # Default to 7 days for unknown types
        return created_at + timedelta(days=7)


def get_retention_message_and_days(
    payment_type: str,
    expires_at: Optional[datetime]
) -> Tuple[str, Optional[int]]:
    """
    Get user-friendly retention message and days remaining.

    Args:
        payment_type: 'trial', 'token', or 'subscription'
        expires_at: Expiry timestamp or None

    Returns:
        Tuple of (message: str, days_remaining: Optional[int])

    Messages:
        - Trial: "Not saved (Trial)" - 0 days
        - Token: "Saved for X more days" or "Expires today" or "Expires tomorrow" - N days
        - Subscription: "Saved permanently (Subscription)" - None
    """
    if payment_type == "subscription":
        return "Saved permanently (Subscription)", None

    if payment_type == "trial":
        return "Not saved (Trial)", 0

    if payment_type == "token":
        if expires_at:
            days_remaining = (expires_at - datetime.now(timezone.utc)).days
            if days_remaining > 1:
                return f"Saved for {days_remaining} more days", days_remaining
            elif days_remaining == 1:
                return "Expires tomorrow", 1
            else:
                return "Expires today", 0
        else:
            return "Saved for 7 days", 7

    # Default
    return "Saved for 7 days", 7


def should_delete_generation(expires_at: Optional[datetime], is_deleted: bool) -> bool:
    """
    Check if a generation should be soft-deleted due to expiration.

    Args:
        expires_at: Expiry timestamp or None
        is_deleted: Current soft-delete status

    Returns:
        True if should be deleted, False otherwise
    """
    if is_deleted:
        # Already deleted
        return False

    if expires_at is None:
        # Subscription - never expires
        return False

    # Check if expired
    return expires_at <= datetime.now(timezone.utc)
