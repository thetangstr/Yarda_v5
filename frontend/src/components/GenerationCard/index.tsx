import React from 'react'
import type { Generation } from '@/types'

interface GenerationCardProps {
  generation: Generation
  onClick: () => void
}

export const GenerationCard: React.FC<GenerationCardProps> = ({ generation, onClick }) => {
  const formatStyle = (style: string) => {
    return style.charAt(0).toUpperCase() + style.slice(1)
  }

  const formatProcessingTime = (ms?: number) => {
    if (!ms) return 'N/A'

    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
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
      className="generation-card"
      data-testid="generation-card"
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}
    >
      {generation.output_image_url && (
        <div
          style={{
            width: '100%',
            height: '200px',
            overflow: 'hidden',
            background: '#f7fafc',
          }}
        >
          <img
            src={generation.output_image_url}
            alt="Generated design"
            data-testid="generation-thumbnail"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      )}

      <div style={{ padding: '20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <span
            data-testid="generation-status"
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'capitalize',
              background: getStatusColor(generation.status),
              color: getStatusTextColor(generation.status),
            }}
          >
            {generation.status}
          </span>

          <span
            data-testid="credit-type"
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'capitalize',
            }}
          >
            {generation.credit_type || 'trial'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '14px', color: '#4a5568' }}>
            <strong style={{ color: '#2d3748' }}>Style:</strong> {formatStyle(generation.style)}
          </div>

          <div
            style={{
              fontSize: '14px',
              color: '#4a5568',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <strong style={{ color: '#2d3748' }}>Input:</strong> {getInputDisplay()}
          </div>

          {generation.custom_prompt && (
            <div
              style={{
                fontSize: '14px',
                color: '#4a5568',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <strong style={{ color: '#2d3748' }}>Prompt:</strong> {generation.custom_prompt}
            </div>
          )}

          <div style={{ fontSize: '14px', color: '#4a5568' }}>
            <strong style={{ color: '#2d3748' }}>Time:</strong>{' '}
            <span data-testid="processing-time">{formatProcessingTime(generation.processing_time_ms)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
