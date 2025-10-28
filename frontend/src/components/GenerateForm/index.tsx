import React, { useState } from 'react'
import { GenerateButton } from '@/components/GenerateButton'
import type { InputType, DesignStyle } from '@/types'

interface GenerateFormProps {
  onSubmit: (data: FormData) => void
  isLoading?: boolean
  hasGenerated?: boolean
  errors?: FormErrors
  disabled?: boolean
}

interface FormData {
  inputType: InputType
  address?: string
  photoFile?: File
  photoUrl?: string
  style: DesignStyle | ''
  customPrompt?: string
}

interface FormErrors {
  input?: string
  style?: string
  general?: string
}

export const GenerateForm: React.FC<GenerateFormProps> = ({
  onSubmit,
  isLoading = false,
  hasGenerated = false,
  errors = {},
  disabled = false,
}) => {
  const [inputMode, setInputMode] = useState<'address' | 'photo'>('address')
  const [formData, setFormData] = useState<FormData>({
    inputType: 'address',
    address: '',
    style: '',
    customPrompt: '',
  })
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const handleInputModeChange = (mode: 'address' | 'photo') => {
    setInputMode(mode)
    setFormData((prev) => ({
      ...prev,
      inputType: mode,
      address: mode === 'address' ? prev.address : '',
      photoFile: mode === 'photo' ? prev.photoFile : undefined,
      photoUrl: mode === 'photo' ? prev.photoUrl : undefined,
    }))
    if (mode === 'address') {
      setPhotoPreview(null)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev) => ({ ...prev, photoFile: file }))
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = () => {
    onSubmit(formData)
  }

  const styles: DesignStyle[] = ['modern', 'tropical', 'minimalist', 'traditional', 'contemporary']

  const isDisabled = isLoading || disabled

  return (
    <div className="generate-form">
      <div className="input-mode-tabs">
        <button
          type="button"
          className={`tab ${inputMode === 'address' ? 'active' : ''}`}
          onClick={() => handleInputModeChange('address')}
          disabled={isLoading}
        >
          Address Input
        </button>
        <button
          type="button"
          className={`tab ${inputMode === 'photo' ? 'active' : ''}`}
          onClick={() => handleInputModeChange('photo')}
          disabled={isLoading}
          data-testid="photo-input-tab"
        >
          Photo Upload
        </button>
      </div>

      <div className="form-content">
        {inputMode === 'address' ? (
          <div className="form-group">
            <label htmlFor="address">Property Address</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="123 Main Street, San Francisco, CA"
              disabled={isLoading}
              className={errors.input ? 'error' : ''}
            />
            {errors.input && (
              <span className="error-message" data-testid="input-required-error">
                {errors.input}
              </span>
            )}
          </div>
        ) : (
          <div className="form-group">
            <label htmlFor="photo">Upload Photo</label>
            <input
              type="file"
              id="photo"
              accept="image/*"
              onChange={handlePhotoChange}
              disabled={isLoading}
              className={errors.input ? 'error' : ''}
            />
            {photoPreview && (
              <div className="photo-preview" data-testid="photo-preview">
                <img src={photoPreview} alt="Preview" />
              </div>
            )}
            {errors.input && (
              <span className="error-message" data-testid="input-required-error">
                {errors.input}
              </span>
            )}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="style">Design Style</label>
          <select
            id="style"
            name="style"
            value={formData.style}
            onChange={(e) => setFormData((prev) => ({ ...prev, style: e.target.value as DesignStyle }))}
            disabled={isLoading}
            className={errors.style ? 'error' : ''}
          >
            <option value="">Select a style...</option>
            {styles.map((style) => (
              <option key={style} value={style}>
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </option>
            ))}
          </select>
          {errors.style && (
            <span className="error-message" data-testid="style-required-error">
              {errors.style}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="customPrompt">
            Custom Instructions <span className="optional">(optional)</span>
          </label>
          <textarea
            id="customPrompt"
            name="customPrompt"
            value={formData.customPrompt}
            onChange={(e) => setFormData((prev) => ({ ...prev, customPrompt: e.target.value }))}
            placeholder="e.g., Include a water feature, native plants, or specific colors..."
            disabled={isLoading}
            rows={4}
            maxLength={500}
          />
          <div className="char-count">
            {formData.customPrompt?.length || 0}/500
          </div>
        </div>

        <GenerateButton
          onClick={handleSubmit}
          disabled={isDisabled}
          isLoading={isLoading}
          hasGenerated={hasGenerated}
          isRateLimited={disabled}
        />
      </div>

      <style>{`
        .generate-form {
          background: white;
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .input-mode-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 24px;
          border-bottom: 2px solid #e2e8f0;
        }

        .tab {
          padding: 12px 24px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          font-size: 16px;
          font-weight: 500;
          color: #718096;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: -2px;
        }

        .tab:hover:not(:disabled) {
          color: #667eea;
        }

        .tab.active {
          color: #667eea;
          border-bottom-color: #667eea;
        }

        .tab:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .form-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          font-weight: 500;
          color: #2d3748;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .optional {
          font-weight: 400;
          color: #718096;
          font-size: 13px;
        }

        .form-group input[type="text"],
        .form-group select,
        .form-group textarea {
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 16px;
          font-family: inherit;
          transition: border-color 0.2s;
        }

        .form-group input[type="text"]:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #667eea;
        }

        .form-group input[type="text"].error,
        .form-group select.error,
        .form-group input[type="file"].error {
          border-color: #f56565;
        }

        .form-group input[type="text"]:disabled,
        .form-group select:disabled,
        .form-group textarea:disabled {
          background-color: #f7fafc;
          cursor: not-allowed;
        }

        .form-group input[type="file"] {
          padding: 10px;
          border: 2px dashed #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .form-group input[type="file"]:hover:not(:disabled) {
          border-color: #667eea;
        }

        .photo-preview {
          margin-top: 12px;
          border-radius: 8px;
          overflow: hidden;
          max-width: 100%;
        }

        .photo-preview img {
          width: 100%;
          max-height: 300px;
          object-fit: cover;
          display: block;
        }

        .error-message {
          margin-top: 6px;
          color: #f56565;
          font-size: 13px;
        }

        .char-count {
          margin-top: 4px;
          font-size: 12px;
          color: #718096;
          text-align: right;
        }

        @media (max-width: 768px) {
          .generate-form {
            padding: 20px;
          }

          .tab {
            padding: 10px 16px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  )
}
