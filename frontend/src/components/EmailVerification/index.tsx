import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { apiClient } from '@/services/api';

interface VerificationStatus {
  type: 'idle' | 'verifying' | 'success' | 'error' | 'expired';
  message?: string;
}

export const EmailVerification: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useUserStore((state) => state.user);

  const [status, setStatus] = useState<VerificationStatus>({ type: 'idle' });
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Extract token from URL query parameters
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    }
  }, [token]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const verifyEmail = async (verificationToken: string) => {
    setStatus({ type: 'verifying', message: 'Verifying your email...' });

    try {
      await apiClient.verifyEmail(verificationToken);

      setStatus({
        type: 'success',
        message: 'Email verified successfully! Redirecting to dashboard...',
      });

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (error) {
      console.error('Email verification error:', error);

      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          setStatus({
            type: 'expired',
            message: 'Your verification link has expired. Please request a new one.',
          });
        } else if (error.message.includes('Invalid')) {
          setStatus({
            type: 'error',
            message: 'Invalid verification link. Please check your email or request a new link.',
          });
        } else {
          setStatus({
            type: 'error',
            message: error.message,
          });
        }
      } else {
        setStatus({
          type: 'error',
          message: 'An unexpected error occurred during verification.',
        });
      }
    }
  };

  const handleResendEmail = async () => {
    if (!user?.email) {
      setStatus({
        type: 'error',
        message: 'No email address found. Please register again.',
      });
      return;
    }

    if (resendCooldown > 0) {
      return;
    }

    setIsResending(true);

    try {
      await apiClient.resendVerificationEmail(user.email);

      setStatus({
        type: 'idle',
        message: 'Verification email sent! Please check your inbox.',
      });

      // Set 60 second cooldown
      setResendCooldown(60);
    } catch (error) {
      console.error('Resend email error:', error);

      if (error instanceof Error) {
        setStatus({
          type: 'error',
          message: error.message,
        });
      } else {
        setStatus({
          type: 'error',
          message: 'Failed to resend verification email. Please try again.',
        });
      }
    } finally {
      setIsResending(false);
    }
  };

  const renderContent = () => {
    switch (status.type) {
      case 'verifying':
        return (
          <div className="verification-status verifying">
            <div className="spinner" aria-label="Loading"></div>
            <h2>Verifying Email</h2>
            <p>{status.message}</p>
          </div>
        );

      case 'success':
        return (
          <div className="verification-status success" data-testid="verification-success">
            <div className="success-icon">✓</div>
            <h2>Email Verified!</h2>
            <p>{status.message}</p>
            <div className="credit-info">
              <p className="credits-badge">3 Trial Credits Available</p>
              <p className="credits-description">
                Start creating amazing landscape designs right away!
              </p>
            </div>
          </div>
        );

      case 'error':
      case 'expired':
        return (
          <div className="verification-status error" data-testid="verification-error">
            <div className="error-icon">✕</div>
            <h2>{status.type === 'expired' ? 'Link Expired' : 'Verification Failed'}</h2>
            <p>{status.message}</p>
            <button
              onClick={handleResendEmail}
              disabled={isResending || resendCooldown > 0}
              className="resend-button"
            >
              {isResending
                ? 'Sending...'
                : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : 'Resend Verification Email'}
            </button>
          </div>
        );

      case 'idle':
      default:
        return (
          <div className="verification-status idle">
            <div className="email-icon">✉</div>
            <h2>Check Your Email</h2>
            <p>
              We've sent a verification link to <strong>{user?.email}</strong>
            </p>
            <p className="instructions">
              Click the link in the email to verify your account and start using your 3 trial
              credits.
            </p>

            <div className="expiry-notice">
              <p>The verification link will expire in 1 hour.</p>
            </div>

            {status.message && (
              <div className="info-message">{status.message}</div>
            )}

            <div className="resend-section">
              <p>Didn't receive the email?</p>
              <button
                onClick={handleResendEmail}
                disabled={isResending || resendCooldown > 0}
                className="resend-button"
              >
                {isResending
                  ? 'Sending...'
                  : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : 'Resend Verification Email'}
              </button>
            </div>

            <div className="help-section">
              <p className="help-text">
                Still having trouble? Check your spam folder or{' '}
                <a href="/support">contact support</a>
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="email-verification">
      {renderContent()}
    </div>
  );
};
