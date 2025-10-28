from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID, uuid4
from supabase import Client
import logging
from ..models.user import User, UserCreate, UserWithCredits
from ..models.token_account import TokenAccount, TokenAccountCreate
from ..exceptions import (
    AuthenticationError,
    ResourceNotFoundError,
    DatabaseError,
    ValidationError
)

logger = logging.getLogger(__name__)


class AuthService:
    """Service for authentication and registration operations"""

    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client

    async def register_user(self, user_data: UserCreate) -> UserWithCredits:
        """
        Register a new user with trial credits and token account

        Args:
            user_data: User registration data

        Returns:
            UserWithCredits: Newly created user with credit information

        Raises:
            ValidationError: If email already exists or data is invalid
            DatabaseError: If registration fails
        """
        try:
            # Register user with Supabase Auth
            auth_response = self.supabase.auth.sign_up({
                "email": user_data.email,
                "password": user_data.password,
            })

            if not auth_response.user:
                logger.error(f"Failed to create auth user for email: {user_data.email}")
                raise DatabaseError("Failed to create user")

            user_id = auth_response.user.id
            logger.info(f"User registered: {user_id}")

            # Set email verification expiry (1 hour from now)
            verification_expiry = datetime.utcnow() + timedelta(hours=1)

            # Update user record with verification token expiry
            user_record = self.supabase.table('users').update({
                'email_verification_expires_at': verification_expiry.isoformat()
            }).eq('id', user_id).execute()

            # Create token account for the user
            token_account_data = TokenAccountCreate(
                user_id=UUID(user_id),
                balance=0,
                total_purchased=0,
                total_consumed=0
            )

            token_account_response = self.supabase.table('token_accounts').insert(
                token_account_data.model_dump()
            ).execute()

            if not token_account_response.data:
                logger.error(f"Failed to create token account for user {user_id}")
                raise DatabaseError("Failed to create token account")

            logger.info(f"Token account created for user {user_id}")

            # Fetch complete user data
            user = await self.get_user_with_credits(UUID(user_id))

            return user

        except (ValidationError, DatabaseError, ResourceNotFoundError):
            # Re-raise custom exceptions
            raise
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Registration failed: {error_msg}")

            # Check for specific errors
            if "already" in error_msg.lower() or "duplicate" in error_msg.lower():
                raise ValidationError("Email already registered")

            if "invalid" in error_msg.lower():
                raise ValidationError(f"Invalid registration data: {error_msg}")

            raise DatabaseError(f"Registration failed: {error_msg}")

    async def get_user_with_credits(self, user_id: UUID) -> UserWithCredits:
        """
        Get user with credit information

        Args:
            user_id: User UUID

        Returns:
            UserWithCredits: User with trial and token credits

        Raises:
            ResourceNotFoundError: If user not found
            DatabaseError: If query fails
        """
        try:
            # Get user data
            user_response = self.supabase.table('users').select('*').eq(
                'id', str(user_id)
            ).single().execute()

            if not user_response.data:
                logger.warning(f"User {user_id} not found")
                raise ResourceNotFoundError("User")

            user = User(**user_response.data)

            # Get token account
            token_response = self.supabase.table('token_accounts').select('*').eq(
                'user_id', str(user_id)
            ).maybe_single().execute()

            token_account = TokenAccount(**token_response.data) if token_response.data else None

            logger.debug(f"Retrieved user with credits: {user_id}")

            return UserWithCredits.from_user_and_token_account(user, token_account)

        except ResourceNotFoundError:
            # Re-raise custom exceptions
            raise
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to get user with credits: {error_msg}")

            if "not found" in error_msg.lower():
                raise ResourceNotFoundError("User")

            raise DatabaseError(f"Failed to get user data: {error_msg}")

    async def verify_email(self, token: UUID) -> dict:
        """
        Verify user email with token

        Args:
            token: Email verification token

        Returns:
            dict: Verification result

        Raises:
            ValidationError: If token is invalid or expired
            DatabaseError: If update fails
        """
        try:
            # Find user by verification token
            user_response = self.supabase.table('users').select('*').eq(
                'email_verification_token', str(token)
            ).maybe_single().execute()

            if not user_response.data:
                logger.warning(f"Invalid verification token: {token}")
                raise ValidationError("Invalid verification token")

            user = user_response.data

            # Check if token is expired
            expires_at = datetime.fromisoformat(user['email_verification_expires_at'])
            if datetime.utcnow() > expires_at:
                logger.warning(f"Expired verification token for user {user['id']}")
                raise ValidationError("Verification token has expired")

            # Update user as verified
            update_response = self.supabase.table('users').update({
                'email_verified': True,
                'email_verification_token': None,
                'email_verification_expires_at': None
            }).eq('id', user['id']).execute()

            if not update_response.data:
                logger.error(f"Failed to update verification status for user {user['id']}")
                raise DatabaseError("Failed to verify email")

            logger.info(f"Email verified for user {user['id']}")

            return {
                "success": True,
                "message": "Email verified successfully",
                "user_id": user['id']
            }

        except ValidationError:
            # Re-raise custom exceptions
            raise
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Email verification failed: {error_msg}")

            if "invalid" in error_msg.lower():
                raise ValidationError("Invalid verification token")

            if "expired" in error_msg.lower():
                raise ValidationError("Verification token has expired")

            raise DatabaseError(f"Email verification failed: {error_msg}")

    async def resend_verification_email(self, email: str) -> dict:
        """
        Resend verification email

        Args:
            email: User email address

        Returns:
            dict: Resend result

        Raises:
            ResourceNotFoundError: If user not found
            DatabaseError: If update fails
        """
        try:
            # Generate new token and expiry
            new_token = uuid4()
            new_expiry = datetime.utcnow() + timedelta(hours=1)

            # Update user with new token
            update_response = self.supabase.table('users').update({
                'email_verification_token': str(new_token),
                'email_verification_expires_at': new_expiry.isoformat()
            }).eq('email', email).execute()

            if not update_response.data or len(update_response.data) == 0:
                logger.warning(f"User not found for email: {email}")
                raise ResourceNotFoundError("User")

            logger.info(f"Verification email resent to: {email}")

            # Note: Actual email sending would be handled by Supabase Auth or external service

            return {
                "success": True,
                "message": "Verification email sent"
            }

        except ResourceNotFoundError:
            # Re-raise custom exceptions
            raise
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to resend verification email: {error_msg}")

            if "not found" in error_msg.lower():
                raise ResourceNotFoundError("User")

            raise DatabaseError(f"Failed to resend verification email: {error_msg}")
