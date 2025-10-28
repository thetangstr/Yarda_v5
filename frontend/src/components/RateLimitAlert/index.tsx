import React, { useEffect, useState } from 'react'

interface RateLimitAlertProps {
  retryAfter: number // seconds until reset
  onRetryReady?: () => void
}

export const RateLimitAlert: React.FC<RateLimitAlertProps> = ({ retryAfter, onRetryReady }) => {
  const [timeRemaining, setTimeRemaining] = useState(retryAfter)

  useEffect(() => {
    // Reset timer when retryAfter changes
    setTimeRemaining(retryAfter)
  }, [retryAfter])

  useEffect(() => {
    // Countdown timer that updates every second
    if (timeRemaining <= 0) {
      // Timer reached 0, call callback
      if (onRetryReady) {
        onRetryReady()
      }
      return
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        const newValue = Math.max(0, prev - 1)
        if (newValue === 0 && onRetryReady) {
          onRetryReady()
        }
        return newValue
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining, onRetryReady])

  return (
    <>
      <div className="rate-limit-alert" data-testid="rate-limit-alert">
        <div className="alert-icon">⏱️</div>
        <div className="alert-content">
          <h3 data-testid="rate-limit-title">Rate Limit Reached</h3>
          <p data-testid="rate-limit-message">
            You've reached the maximum of 3 generations per minute. Please wait before generating again.
          </p>
          <div className="retry-timer" data-testid="retry-timer">
            Retry available in: <strong data-testid="countdown-timer">{timeRemaining}s</strong>
          </div>
        </div>
      </div>

      <style>{`
        .rate-limit-alert {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          display: flex;
          align-items: flex-start;
          gap: 16px;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .alert-icon {
          font-size: 32px;
          line-height: 1;
          flex-shrink: 0;
        }

        .alert-content {
          flex: 1;
        }

        .alert-content h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
        }

        .alert-content p {
          margin: 0 0 12px 0;
          font-size: 14px;
          opacity: 0.9;
          line-height: 1.5;
        }

        .retry-timer {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.2);
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          backdrop-filter: blur(10px);
        }

        .retry-timer strong {
          font-size: 18px;
          font-weight: 700;
          min-width: 40px;
          text-align: center;
        }

        @media (max-width: 768px) {
          .rate-limit-alert {
            padding: 20px;
            gap: 12px;
          }

          .alert-icon {
            font-size: 24px;
          }

          .alert-content h3 {
            font-size: 18px;
          }

          .alert-content p {
            font-size: 13px;
          }

          .retry-timer {
            font-size: 13px;
          }

          .retry-timer strong {
            font-size: 16px;
          }
        }
      `}</style>
    </>
  )
}
