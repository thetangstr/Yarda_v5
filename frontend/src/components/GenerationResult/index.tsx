import React from 'react'
import type { Generation } from '@/types'

interface GenerationResultProps {
  generation: Generation | null
}

export const GenerationResult: React.FC<GenerationResultProps> = ({ generation }) => {
  if (!generation) {
    return null
  }

  const formatProcessingTime = (ms?: number) => {
    if (!ms) return 'N/A'
    if (ms < 1000) return `${ms} ms`
    return `${(ms / 1000).toFixed(1)} seconds`
  }

  const formatStyle = (style: string) => {
    return style.charAt(0).toUpperCase() + style.slice(1)
  }

  const isProcessing = generation.status === 'pending' || generation.status === 'processing'
  const isCompleted = generation.status === 'completed'
  const isFailed = generation.status === 'failed'

  return (
    <div className="generation-result">
      {isProcessing && (
        <div className="status-card processing" data-testid="generating-status">
          <div className="spinner">
            <svg className="spinner-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <h3>Generating Your Design</h3>
          <p>This may take up to 30 seconds. Please wait...</p>
          <div className="status-badge" data-testid="generation-status">
            {generation.status}
          </div>
        </div>
      )}

      {isCompleted && (
        <div className="status-card completed" data-testid="generation-complete">
          <div className="success-icon">✓</div>
          <h3>Design Generated Successfully!</h3>

          {generation.output_image_url && (
            <div className="output-image-container">
              <img
                src={generation.output_image_url}
                alt="Generated design"
                data-testid="output-image"
                className="output-image"
              />
            </div>
          )}

          <div className="generation-details">
            <div className="detail-row">
              <span className="detail-label">Style:</span>
              <span className="detail-value" data-testid="generation-style">
                {formatStyle(generation.style)}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Input:</span>
              <span className="detail-value" data-testid="generation-input">
                {generation.input_type === 'address' ? generation.input_address : 'Photo Upload'}
              </span>
            </div>

            {generation.custom_prompt && (
              <div className="detail-row">
                <span className="detail-label">Custom Instructions:</span>
                <span className="detail-value" data-testid="custom-prompt">
                  {generation.custom_prompt}
                </span>
              </div>
            )}

            <div className="detail-row">
              <span className="detail-label">Processing Time:</span>
              <span className="detail-value" data-testid="processing-time">
                {formatProcessingTime(generation.processing_time_ms)}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Credit Type Used:</span>
              <span className="detail-value credit-badge" data-testid="credit-type">
                {generation.credit_type || 'trial'}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span className="detail-value status-badge" data-testid="generation-status">
                {generation.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {isFailed && (
        <div className="status-card error" data-testid="generation-error">
          <div className="error-icon">✕</div>
          <h3>Generation Failed</h3>
          <p className="error-message" data-testid="error-message">
            {generation.error_message || 'An error occurred while generating your design. Please try again.'}
          </p>
          {generation.credit_refunded && (
            <div className="refund-notice">
              Your credit has been refunded.
            </div>
          )}
        </div>
      )}

      <style>{`
        .generation-result {
          margin-top: 30px;
        }

        .status-card {
          background: white;
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          text-align: center;
        }

        .status-card h3 {
          margin: 16px 0 8px 0;
          font-size: 24px;
          font-weight: 600;
          color: #2d3748;
        }

        .status-card p {
          color: #718096;
          margin: 0 0 20px 0;
        }

        .spinner {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .spinner-icon {
          width: 48px;
          height: 48px;
          color: #667eea;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .opacity-25 {
          opacity: 0.25;
        }

        .opacity-75 {
          opacity: 0.75;
        }

        .success-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
          color: white;
          border-radius: 50%;
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 16px;
        }

        .error-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
          color: white;
          border-radius: 50%;
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 16px;
        }

        .output-image-container {
          margin: 24px 0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .output-image {
          width: 100%;
          max-height: 500px;
          object-fit: cover;
          display: block;
        }

        .generation-details {
          text-align: left;
          margin-top: 24px;
          padding: 20px;
          background: #f7fafc;
          border-radius: 8px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-label {
          font-weight: 600;
          color: #4a5568;
          font-size: 14px;
        }

        .detail-value {
          color: #2d3748;
          font-size: 14px;
          text-align: right;
          max-width: 60%;
          word-break: break-word;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          background: #667eea;
          color: white;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: lowercase;
        }

        .credit-badge {
          display: inline-block;
          padding: 4px 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .error-message {
          color: #c53030;
          background: #fff5f5;
          padding: 16px;
          border-radius: 8px;
          margin: 16px 0;
          border: 1px solid #feb2b2;
        }

        .refund-notice {
          margin-top: 16px;
          padding: 12px;
          background: #c6f6d5;
          color: #22543d;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .status-card {
            padding: 24px;
          }

          .status-card h3 {
            font-size: 20px;
          }

          .detail-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }

          .detail-value {
            max-width: 100%;
            text-align: left;
          }
        }
      `}</style>
    </div>
  )
}
