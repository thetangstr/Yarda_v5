import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GenerationCard } from '@/components/GenerationCard'
import { useGenerationStore } from '@/store/generationStore'
import type { GenerationStatus } from '@/types'

export const GenerationHistory: React.FC = () => {
  const navigate = useNavigate()
  const {
    generations,
    totalCount,
    currentPage,
    pageSize,
    statusFilter,
    isLoading,
    error,
    fetchGenerations,
    setStatusFilter,
    setSelectedGeneration,
    nextPage,
    prevPage,
  } = useGenerationStore()

  useEffect(() => {
    fetchGenerations()
  }, [])

  const totalPages = Math.ceil(totalCount / pageSize)
  const hasNextPage = currentPage < totalPages
  const hasPrevPage = currentPage > 1

  if (error) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <p style={{ fontSize: '18px', color: '#e53e3e', marginBottom: '24px' }}>
          Failed to load generations: {error}
        </p>
        <button
          onClick={() => fetchGenerations()}
          style={{
            padding: '12px 32px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (isLoading && generations.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e2e8f0',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        <p style={{ fontSize: '18px', color: '#718096' }}>Loading your generations...</p>
      </div>
    )
  }

  if (!isLoading && generations.length === 0) {
    return (
      <div
        data-testid="empty-history"
        style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div
          style={{
            fontSize: '64px',
            marginBottom: '16px',
          }}
        >
          🎨
        </div>
        <p style={{ fontSize: '24px', color: '#2d3748', marginBottom: '8px', fontWeight: 600 }}>
          No generations yet
        </p>
        <p style={{ fontSize: '16px', color: '#718096', marginBottom: '24px' }}>
          Create your first landscape design to get started!
        </p>
        <button
          data-testid="create-first-generation"
          onClick={() => navigate('/generate')}
          style={{
            padding: '12px 32px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '16px',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          Generate Design
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Filter controls */}
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label
            htmlFor="status-filter"
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#4a5568',
            }}
          >
            Filter by status:
          </label>
          <select
            id="status-filter"
            data-testid="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as GenerationStatus | 'all')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '2px solid #e2e8f0',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              background: 'white',
              color: '#2d3748',
              outline: 'none',
            }}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div style={{ fontSize: '14px', color: '#718096' }}>
          Showing {(currentPage - 1) * pageSize + 1}-
          {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
        </div>
      </div>

      {/* Generations grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '24px',
          marginBottom: '32px',
        }}
      >
        {generations.map((generation) => (
          <GenerationCard
            key={generation.id}
            generation={generation}
            onClick={() => setSelectedGeneration(generation)}
          />
        ))}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '16px',
            padding: '24px 0',
          }}
        >
          <button
            data-testid="pagination-prev"
            onClick={prevPage}
            disabled={!hasPrevPage || isLoading}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: '2px solid #e2e8f0',
              background: hasPrevPage && !isLoading ? 'white' : '#f7fafc',
              color: hasPrevPage && !isLoading ? '#2d3748' : '#a0aec0',
              fontWeight: 600,
              cursor: hasPrevPage && !isLoading ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (hasPrevPage && !isLoading) {
                e.currentTarget.style.borderColor = '#667eea'
                e.currentTarget.style.color = '#667eea'
              }
            }}
            onMouseLeave={(e) => {
              if (hasPrevPage && !isLoading) {
                e.currentTarget.style.borderColor = '#e2e8f0'
                e.currentTarget.style.color = '#2d3748'
              }
            }}
          >
            Previous
          </button>

          <span style={{ fontSize: '14px', color: '#718096', fontWeight: 500 }}>
            Page {currentPage} of {totalPages}
          </span>

          <button
            data-testid="pagination-next"
            onClick={nextPage}
            disabled={!hasNextPage || isLoading}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: '2px solid #e2e8f0',
              background: hasNextPage && !isLoading ? 'white' : '#f7fafc',
              color: hasNextPage && !isLoading ? '#2d3748' : '#a0aec0',
              fontWeight: 600,
              cursor: hasNextPage && !isLoading ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (hasNextPage && !isLoading) {
                e.currentTarget.style.borderColor = '#667eea'
                e.currentTarget.style.color = '#667eea'
              }
            }}
            onMouseLeave={(e) => {
              if (hasNextPage && !isLoading) {
                e.currentTarget.style.borderColor = '#e2e8f0'
                e.currentTarget.style.color = '#2d3748'
              }
            }}
          >
            Next
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
