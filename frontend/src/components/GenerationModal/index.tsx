import React from 'react'
import type { Generation } from '@/types'

interface GenerationModalProps {
  generation: Generation
  onClose: () => void
}

export const GenerationModal: React.FC<GenerationModalProps> = ({ generation, onClose }) => {
  const formatStyle = (style: string) => {
    return style.charAt(0).toUpperCase() + style.slice(1)
  }

  const formatProcessingTime = (ms?: number) => {
    if (!ms) return 'N/A'

    if (ms < 1000) return `${ms} milliseconds`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)} seconds`
    return `${(ms / 60000).toFixed(1)} minutes`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getInputDisplay = () => {
    if (generation.input_type === 'address') {
      return generation.input_address || 'Address not available'
    }
    return 'Photo Upload'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#c6f6d5'
      case 'failed':
        return '#fed7d7'
      case 'processing':
      case 'pending':
        return '#feebc8'
      default:
        return '#e2e8f0'
    }
  }

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#22543d'
      case 'failed':
        return '#742a2a'
      case 'processing':
      case 'pending':
        return '#744210'
      default:
        return '#2d3748'
    }
  }

  return (
    <div
      data-testid="generation-modal"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          data-testid="close-modal"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.9)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            color: '#4a5568',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            transition: 'all 0.2s',
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f7fafc'
            e.currentTarget.style.transform = 'scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          ×
        </button>

        {/* Output image */}
        {generation.output_image_url && (
          <div
            style={{
              width: '100%',
              maxHeight: '400px',
              overflow: 'hidden',
              background: '#f7fafc',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
            }}
          >
            <img
              src={generation.output_image_url}
              alt="Generated design"
              data-testid="modal-output-image"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </div>
        )}

        {/* Details */}
        <div style={{ padding: '32px' }}>
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '24px',
              flexWrap: 'wrap',
            }}
          >
            <span
              data-testid="modal-status"
              style={{
                display: 'inline-block',
                padding: '6px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                textTransform: 'capitalize',
                background: getStatusColor(generation.status),
                color: getStatusTextColor(generation.status),
              }}
            >
              {generation.status}
            </span>

            <span
              data-testid="modal-credit-type"
              style={{
                display: 'inline-block',
                padding: '6px 16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              {generation.credit_type || 'trial'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px', fontWeight: 600 }}>
                INPUT
              </div>
              <div data-testid="modal-address" style={{ fontSize: '16px', color: '#2d3748' }}>
                {getInputDisplay()}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px', fontWeight: 600 }}>
                STYLE
              </div>
              <div data-testid="modal-style" style={{ fontSize: '16px', color: '#2d3748' }}>
                {formatStyle(generation.style)}
              </div>
            </div>

            {generation.custom_prompt && (
              <div>
                <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px', fontWeight: 600 }}>
                  CUSTOM PROMPT
                </div>
                <div data-testid="modal-prompt" style={{ fontSize: '16px', color: '#2d3748' }}>
                  {generation.custom_prompt}
                </div>
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                paddingTop: '16px',
                borderTop: '1px solid #e2e8f0',
              }}
            >
              <div>
                <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px', fontWeight: 600 }}>
                  PROCESSING TIME
                </div>
                <div data-testid="modal-processing-time" style={{ fontSize: '16px', color: '#2d3748' }}>
                  {formatProcessingTime(generation.processing_time_ms)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px', fontWeight: 600 }}>
                  CREATED
                </div>
                <div style={{ fontSize: '16px', color: '#2d3748' }}>
                  {formatDate(generation.created_at)}
                </div>
              </div>
            </div>

            {generation.status === 'failed' && generation.error_message && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '16px',
                  background: '#fff5f5',
                  border: '1px solid #feb2b2',
                  borderRadius: '8px',
                }}
              >
                <div style={{ fontSize: '12px', color: '#742a2a', marginBottom: '4px', fontWeight: 600 }}>
                  ERROR MESSAGE
                </div>
                <div style={{ fontSize: '14px', color: '#c53030' }}>{generation.error_message}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
