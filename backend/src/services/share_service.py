"""
Social Media Sharing Service

Handles social media share tracking and credit rewards for holiday decorator feature.
Manages share creation, tracking, and verification.

Feature: 007-holiday-decorator
"""

import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple
from uuid import UUID
import urllib.parse
import structlog

from ..db.connection_pool import DatabasePool
from ..services.holiday_credit_service import HolidayCreditService
from ..models.holiday import SharePlatform

logger = structlog.get_logger(__name__)


class ShareService:
    """
    Service for managing social media shares and credit rewards.

    Features:
    - Create trackable share links for different platforms
    - Track share clicks and engagement
    - Award credits for verified shares (max 3/day)
    - Prevent duplicate credit farming
    """

    def __init__(
        self,
        db_pool: DatabasePool,
        credit_service: HolidayCreditService,
        base_url: str = "https://yarda.pro"
    ):
        """
        Initialize share service.

        Args:
            db_pool: Database connection pool
            credit_service: Holiday credit service for granting rewards
            base_url: Base URL for generating tracking links
        """
        self.db = db_pool
        self.credit_service = credit_service
        self.base_url = base_url
        self.max_shares_per_day = 3  # Max credits from shares per day

    async def create_share(
        self,
        user_id: UUID,
        generation_id: UUID,
        platform: SharePlatform,
        before_after_image_url: str
    ) -> dict:
        """
        Create a new share tracking link.

        Args:
            user_id: User UUID
            generation_id: Holiday generation UUID
            platform: Social media platform
            before_after_image_url: URL of the image to share

        Returns:
            Dict with share details including tracking link and share URL
        """
        try:
            # Generate unique tracking code
            tracking_code = self._generate_tracking_code()

            # Check daily share limit
            shares_today = await self._get_shares_today(user_id)
            can_earn_credit = shares_today < self.max_shares_per_day
            daily_shares_remaining = max(0, self.max_shares_per_day - shares_today)

            # Create tracking link
            tracking_link = f"{self.base_url}/h/{tracking_code}"

            # Create platform-specific share URL
            share_url = self._create_platform_share_url(
                platform,
                tracking_link,
                before_after_image_url
            )

            # Create share record
            share_id = await self.db.fetchval("""
                INSERT INTO social_shares (
                    user_id, generation_id, platform,
                    tracking_link, tracking_code,
                    created_at
                ) VALUES ($1, $2, $3, $4, $5, NOW())
                RETURNING id
            """, user_id, generation_id, platform.value, tracking_link, tracking_code)

            logger.info(
                f"Created share {share_id} for user {user_id} on {platform.value}. "
                f"Can earn credit: {can_earn_credit}"
            )

            return {
                "id": str(share_id),
                "user_id": str(user_id),
                "generation_id": str(generation_id),
                "platform": platform.value,
                "tracking_link": tracking_link,
                "share_url": share_url,
                "before_after_image_url": before_after_image_url,
                "can_earn_credit": can_earn_credit,
                "daily_shares_remaining": daily_shares_remaining,
                "created_at": datetime.now(timezone.utc).isoformat()
            }

        except Exception as e:
            logger.error(f"Failed to create share: {str(e)}")
            raise

    async def track_share_click(
        self,
        tracking_code: str
    ) -> Tuple[bool, bool, int, str]:
        """
        Track when someone clicks on a share link.
        Awards credit to sharer if eligible.

        Args:
            tracking_code: The tracking code from the URL

        Returns:
            Tuple of (success, credit_granted, credits_remaining, message)
        """
        try:
            # Find the share record
            share = await self.db.fetchrow("""
                SELECT id, user_id, clicked, credit_granted, created_at
                FROM social_shares
                WHERE tracking_code = $1
            """, tracking_code)

            if not share:
                return False, False, 0, "Invalid tracking link"

            # Update click status
            await self.db.execute("""
                UPDATE social_shares
                SET clicked = TRUE,
                    clicked_at = COALESCE(clicked_at, NOW())
                WHERE id = $1
            """, share['id'])

            # Check if credit already granted or not eligible
            if share['credit_granted']:
                return True, False, 0, "Share already credited"

            # Check if within 24 hours of share creation
            time_since_share = datetime.now(timezone.utc) - share['created_at']
            if time_since_share > timedelta(days=1):
                return True, False, 0, "Share expired for credit (>24 hours)"

            # Check daily limit
            shares_today = await self._get_credited_shares_today(share['user_id'])
            if shares_today >= self.max_shares_per_day:
                return True, False, 0, "Daily share limit reached"

            # Grant credit
            new_balance = await self.credit_service.grant_credit(
                share['user_id'],
                amount=1,
                reason="social_share"
            )

            # Mark credit as granted
            await self.db.execute("""
                UPDATE social_shares
                SET credit_granted = TRUE,
                    credit_granted_at = NOW(),
                    verified = TRUE
                WHERE id = $1
            """, share['id'])

            logger.info(
                f"Granted 1 credit to user {share['user_id']} for share {share['id']}. "
                f"New balance: {new_balance}"
            )

            return True, True, new_balance, "Credit granted for share!"

        except Exception as e:
            logger.error(f"Failed to track share click: {str(e)}")
            return False, False, 0, "Error tracking share"

    async def get_user_shares(
        self,
        user_id: UUID,
        limit: int = 20,
        offset: int = 0
    ) -> dict:
        """
        Get list of user's shares.

        Args:
            user_id: User UUID
            limit: Max number of results
            offset: Pagination offset

        Returns:
            Dict with shares list and pagination info
        """
        shares = await self.db.fetch("""
            SELECT
                s.id, s.generation_id, s.platform,
                s.tracking_link, s.tracking_code,
                s.clicked, s.credit_granted,
                s.created_at, s.clicked_at, s.credit_granted_at,
                g.before_after_image_url
            FROM social_shares s
            JOIN holiday_generations g ON s.generation_id = g.id
            WHERE s.user_id = $1
            ORDER BY s.created_at DESC
            LIMIT $2 OFFSET $3
        """, user_id, limit, offset)

        total = await self.db.fetchval("""
            SELECT COUNT(*) FROM social_shares
            WHERE user_id = $1
        """, user_id)

        # Get today's share count
        shares_today = await self._get_shares_today(user_id)
        daily_shares_remaining = max(0, self.max_shares_per_day - shares_today)

        return {
            "shares": [
                {
                    "id": str(s['id']),
                    "generation_id": str(s['generation_id']),
                    "platform": s['platform'],
                    "tracking_link": s['tracking_link'],
                    "share_url": self._create_platform_share_url(
                        SharePlatform(s['platform']),
                        s['tracking_link'],
                        s['before_after_image_url']
                    ),
                    "before_after_image_url": s['before_after_image_url'],
                    "clicked": s['clicked'],
                    "credit_granted": s['credit_granted'],
                    "created_at": s['created_at'].isoformat(),
                    "clicked_at": s['clicked_at'].isoformat() if s['clicked_at'] else None,
                    "credit_granted_at": s['credit_granted_at'].isoformat() if s['credit_granted_at'] else None
                }
                for s in shares
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
            "daily_shares_remaining": daily_shares_remaining
        }

    def _generate_tracking_code(self) -> str:
        """Generate a unique 8-character tracking code."""
        return secrets.token_urlsafe(6)[:8]

    async def _get_shares_today(self, user_id: UUID) -> int:
        """Get count of shares created today by user."""
        count = await self.db.fetchval("""
            SELECT COUNT(*) FROM social_shares
            WHERE user_id = $1
            AND created_at >= CURRENT_DATE
        """, user_id)
        return count or 0

    async def _get_credited_shares_today(self, user_id: UUID) -> int:
        """Get count of shares that earned credit today."""
        count = await self.db.fetchval("""
            SELECT COUNT(*) FROM social_shares
            WHERE user_id = $1
            AND credit_granted = TRUE
            AND credit_granted_at >= CURRENT_DATE
        """, user_id)
        return count or 0

    def _create_platform_share_url(
        self,
        platform: SharePlatform,
        tracking_link: str,
        image_url: str
    ) -> str:
        """
        Create platform-specific share URL.

        Args:
            platform: Social media platform
            tracking_link: The tracking URL to share
            image_url: URL of the image being shared

        Returns:
            Platform-specific share URL
        """
        share_text = "Transform Your Yard with AI, and decorate it this holiday season. Check out www.yarda.pro"
        encoded_text = urllib.parse.quote(share_text)
        encoded_url = urllib.parse.quote(tracking_link)

        if platform == SharePlatform.FACEBOOK or platform == "facebook":
            return f"https://www.facebook.com/sharer/sharer.php?u={encoded_url}&quote={encoded_text}"

        elif platform == SharePlatform.X or platform == "x":  # Twitter/X
            return f"https://twitter.com/intent/tweet?text={encoded_text}&url={encoded_url}"

        elif platform == SharePlatform.PINTEREST or platform == "pinterest":
            encoded_image = urllib.parse.quote(image_url)
            return f"https://pinterest.com/pin/create/button/?url={encoded_url}&media={encoded_image}&description={encoded_text}"

        elif platform == SharePlatform.INSTAGRAM or platform == "instagram":
            # Instagram doesn't have a direct share URL, return instructions
            return f"instagram://library?AssetPath={encoded_url}"

        elif platform == SharePlatform.TIKTOK or platform == "tiktok":
            # TikTok sharing is app-based, return deep link
            return f"tiktok://share?url={encoded_url}"

        else:
            return tracking_link