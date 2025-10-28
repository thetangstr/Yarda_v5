import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditDisplay } from '@/components/CreditDisplay'
import { GenerateForm } from '@/components/GenerateForm'
import { GenerationResult } from '@/components/GenerationResult'
import { RateLimitAlert } from '@/components/RateLimitAlert'
import { useUserStore } from '@/store/userStore'
import type { CreateGenerationRequest } from '@/types'
import { RateLimitError } from '@/services/api'

interface FormErrors {
  input?: string
  style?: string
  general?: string
}

export const Generate: React.FC = () => {
  const navigate = useNavigate()
  const user = useUserStore((state) => state.user)
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)
  const credits = useUserStore((state) => state.credits)
  const currentGeneration = useUserStore((state) => state.currentGeneration)
  const isGenerating = useUserStore((state) => state.isGenerating)
  const startGeneration = useUserStore((state) => state.startGeneration)
  const isRateLimited = useUserStore((state) => state.isRateLimited)
  const rateLimitStatus = useUserStore((state) => state.rateLimitStatus)
  const fetchRateLimitStatus = useUserStore((state) => state.fetchRateLimitStatus)
  const clearRateLimit = useUserStore((state) => state.clearRateLimit)
  const [errors, setErrors] = useState<FormErrors>({})
  const [hasGenerated, setHasGenerated] = useState(false)

  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    // Redirect if email not verified
    if (!user?.email_verified) {
      navigate('/verify-email')
      return
    }

    // Fetch rate limit status on mount
    fetchRateLimitStatus()
  }, [isAuthenticated, user, navigate, fetchRateLimitStatus])

  const validateForm = (data: any): FormErrors => {
    const newErrors: FormErrors = {}

    // Validate input
    if (data.inputType === 'address') {
      if (!data.address || data.address.trim() === '') {
        newErrors.input = 'Please provide an address or upload a photo'
      }
    } else if (data.inputType === 'photo') {
      if (!data.photoFile && !data.photoUrl) {
        newErrors.input = 'Please provide an address or upload a photo'
      }
    }

    // Validate style
    if (!data.style || data.style === '') {
      newErrors.style = 'Please select a design style'
    }

    return newErrors
  }

  const handleGenerate = async (formData: any) => {
    setErrors({})

    // Validate form
    const validationErrors = validateForm(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    // Check rate limit before generation attempt
    await fetchRateLimitStatus()
    if (!rateLimitStatus.canRequest) {
      // Rate limit will be shown in UI
      return
    }

    // Check credits
    if (credits.total === 0) {
      setErrors({
        general: 'Insufficient credits. Please purchase more credits to continue.',
      })
      return
    }

    try {
      // Prepare request data
      const requestData: CreateGenerationRequest = {
        input_type: formData.inputType,
        style: formData.style,
        custom_prompt: formData.customPrompt || undefined,
      }

      if (formData.inputType === 'address') {
        requestData.input_address = formData.address
      } else {
        // For photo upload, you would typically upload to a storage service first
        // and get a URL, but for now we'll use a placeholder
        // In a real implementation, you'd upload to Supabase Storage or similar
        if (formData.photoFile) {
          // TODO: Upload photo to storage and get URL
          // For now, we'll use a placeholder or the local preview
          requestData.input_photo_url = formData.photoUrl || 'placeholder'
        }
      }

      await startGeneration(requestData)
      setHasGenerated(true)
    } catch (error) {
      console.error('Generation error:', error)

      if (error instanceof RateLimitError) {
        // Rate limit error is already handled in the store
        setErrors({
          general: 'Rate limit exceeded. Please wait before trying again.',
        })
      } else if (error instanceof Error) {
        if (error.message.toLowerCase().includes('insufficient')) {
          setErrors({
            general: 'Insufficient credits. Please purchase more credits to continue.',
          })
        } else if (error.message.toLowerCase().includes('invalid')) {
          setErrors({
            general: error.message,
          })
        } else {
          setErrors({
            general: 'Failed to generate design. Please try again.',
          })
        }
      } else {
        setErrors({
          general: 'An unexpected error occurred. Please try again.',
        })
      }
    }
  }

  const handleRetryReady = () => {
    clearRateLimit()
    fetchRateLimitStatus()
  }

  if (!isAuthenticated || !user?.email_verified) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="generate-page">
      <div className="generate-container">
        <header className="page-header">
          <div className="logo">
            <h1>Landscape Designer</h1>
          </div>
          <nav className="page-nav">
            <a href="/dashboard" className="nav-link">
              Dashboard
            </a>
            <a href="/history" className="nav-link">
              History
            </a>
            <a href="/account" className="nav-link">
              Account
            </a>
          </nav>
        </header>

        <main className="generate-main">
          <div className="page-title">
            <h2>Generate Landscape Design</h2>
            <p>Transform your outdoor space with AI-powered design</p>
          </div>

          <CreditDisplay />

          {/* Rate Limit Alert */}
          {isRateLimited && (
            <RateLimitAlert retryAfter={rateLimitStatus.retryAfter} onRetryReady={handleRetryReady} />
          )}

          {/* Remaining Requests Display */}
          {!isRateLimited && (
            <div className="rate-limit-info" data-testid="requests-remaining">
              Remaining requests: {rateLimitStatus.remainingRequests}/3 per minute
            </div>
          )}

          {errors.general && (
            <div
              className="error-banner"
              data-testid={
                errors.general.toLowerCase().includes('rate limit')
                  ? 'rate-limit-error'
                  : errors.general.toLowerCase().includes('insufficient')
                  ? 'insufficient-credits-error'
                  : 'generation-error'
              }
            >
              {errors.general}
            </div>
          )}

          <GenerateForm
            onSubmit={handleGenerate}
            isLoading={isGenerating}
            hasGenerated={hasGenerated}
            errors={errors}
            disabled={isRateLimited}
          />

          {currentGeneration && (
            <>
              {(currentGeneration.status === 'pending' || currentGeneration.status === 'processing') && (
                <div className="generating-status" data-testid="generating-status">
                  <div className="spinner-large">
                    <svg
                      className="spinner-icon-large"
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
                  </div>
                  <p>Generating your landscape design...</p>
                </div>
              )}
              <GenerationResult generation={currentGeneration} />
            </>
          )}
        </main>

        <footer className="page-footer">
          <div className="footer-content">
            <p>&copy; 2025 Landscape Designer. All rights reserved.</p>
            <div className="footer-links">
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
              <a href="/support">Support</a>
            </div>
          </div>
        </footer>
      </div>

      <style>{`
        .generate-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding: 20px;
        }

        .generate-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 0;
          margin-bottom: 30px;
        }

        .logo h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .page-nav {
          display: flex;
          gap: 20px;
        }

        .nav-link {
          color: #4a5568;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }

        .nav-link:hover {
          color: #667eea;
        }

        .generate-main {
          max-width: 800px;
          margin: 0 auto;
        }

        .page-title {
          text-align: center;
          margin-bottom: 40px;
        }

        .page-title h2 {
          font-size: 36px;
          font-weight: 700;
          margin: 0 0 12px 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .page-title p {
          color: #718096;
          font-size: 18px;
          margin: 0;
        }

        .rate-limit-info {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: center;
          font-weight: 500;
          font-size: 14px;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
        }

        .error-banner {
          background: #fff5f5;
          border: 1px solid #feb2b2;
          border-radius: 8px;
          padding: 16px;
          color: #c53030;
          margin-bottom: 20px;
          font-size: 14px;
          font-weight: 500;
        }

        .generating-status {
          background: white;
          border-radius: 12px;
          padding: 40px;
          margin-top: 30px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .spinner-large {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .spinner-icon-large {
          width: 64px;
          height: 64px;
          animation: spin 1s linear infinite;
          color: #667eea;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .generating-status p {
          font-size: 18px;
          color: #4a5568;
          font-weight: 500;
          margin: 0;
        }

        .page-footer {
          margin-top: 60px;
          padding: 30px 0;
          text-align: center;
          color: #718096;
        }

        .footer-content p {
          margin: 0 0 16px 0;
          font-size: 14px;
        }

        .footer-links {
          display: flex;
          justify-content: center;
          gap: 24px;
        }

        .footer-links a {
          color: #718096;
          text-decoration: none;
          font-size: 14px;
          transition: color 0.2s;
        }

        .footer-links a:hover {
          color: #667eea;
        }

        @media (max-width: 768px) {
          .generate-page {
            padding: 10px;
          }

          .page-header {
            flex-direction: column;
            gap: 16px;
          }

          .page-nav {
            width: 100%;
            justify-content: center;
          }

          .page-title h2 {
            font-size: 28px;
          }

          .page-title p {
            font-size: 16px;
          }

          .rate-limit-info {
            font-size: 13px;
            padding: 10px 16px;
          }

          .generating-status {
            padding: 30px 20px;
          }

          .spinner-icon-large {
            width: 48px;
            height: 48px;
          }

          .generating-status p {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  )
}
