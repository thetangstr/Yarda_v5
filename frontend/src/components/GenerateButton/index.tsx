import React from 'react'

interface GenerateButtonProps {
  onClick: () => void
  disabled?: boolean
  isLoading?: boolean
  hasGenerated?: boolean
  isRateLimited?: boolean
}

export const GenerateButton: React.FC<GenerateButtonProps> = ({
  onClick,
  disabled = false,
  isLoading = false,
  hasGenerated = false,
  isRateLimited = false,
}) => {
  const getButtonText = () => {
    if (isRateLimited) return 'Rate Limited'
    if (isLoading) return 'Generating...'
    if (hasGenerated) return 'Generate Another'
    return 'Generate Design'
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || isLoading}
        data-testid="generate-button"
        className={`generate-button ${disabled || isLoading ? 'disabled' : ''}`}
      >
        {isLoading && (
          <span className="spinner">
            <svg
              className="spinner-icon"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </span>
        )}
        <span>{getButtonText()}</span>
      </button>

      <style>{`
        .generate-button {
          width: 100%;
          padding: 16px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .generate-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .generate-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .generate-button:disabled,
        .generate-button.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .spinner {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .spinner-icon {
          width: 20px;
          height: 20px;
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
      `}</style>
    </>
  )
}
