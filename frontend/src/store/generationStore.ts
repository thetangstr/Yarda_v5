import { create } from 'zustand'
import { apiClient } from '@/services/api'
import type { Generation, GenerationStatus } from '@/types'

interface GenerationStore {
  // State
  generations: Generation[]
  totalCount: number
  currentPage: number
  pageSize: number
  statusFilter: GenerationStatus | 'all'
  selectedGeneration: Generation | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchGenerations: (page?: number, status?: GenerationStatus | 'all') => Promise<void>
  setStatusFilter: (status: GenerationStatus | 'all') => void
  setSelectedGeneration: (generation: Generation | null) => void
  clearSelectedGeneration: () => void
  nextPage: () => void
  prevPage: () => void
  refreshGenerations: () => Promise<void>
}

export const useGenerationStore = create<GenerationStore>((set, get) => ({
  // Initial state
  generations: [],
  totalCount: 0,
  currentPage: 1,
  pageSize: 10,
  statusFilter: 'all',
  selectedGeneration: null,
  isLoading: false,
  error: null,

  // Fetch generations with pagination and filtering
  fetchGenerations: async (page?: number, status?: GenerationStatus | 'all') => {
    const state = get()
    const targetPage = page !== undefined ? page : state.currentPage
    const targetStatus = status !== undefined ? status : state.statusFilter

    set({ isLoading: true, error: null })

    try {
      const offset = (targetPage - 1) * state.pageSize
      const params: any = {
        limit: state.pageSize,
        offset: offset,
      }

      // Only add status filter if not 'all'
      if (targetStatus !== 'all') {
        params.status = targetStatus
      }

      const response = await apiClient.getGenerationHistory(params)

      set({
        generations: response.generations,
        totalCount: response.total,
        currentPage: targetPage,
        statusFilter: targetStatus,
        isLoading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch generations',
        isLoading: false,
      })
    }
  },

  // Set status filter and refetch
  setStatusFilter: async (status: GenerationStatus | 'all') => {
    // Reset to page 1 when changing filter
    await get().fetchGenerations(1, status)
  },

  // Set selected generation for modal
  setSelectedGeneration: (generation: Generation | null) => {
    set({ selectedGeneration: generation })
  },

  // Clear selected generation
  clearSelectedGeneration: () => {
    set({ selectedGeneration: null })
  },

  // Navigate to next page
  nextPage: async () => {
    const state = get()
    const totalPages = Math.ceil(state.totalCount / state.pageSize)

    if (state.currentPage < totalPages) {
      await get().fetchGenerations(state.currentPage + 1)
    }
  },

  // Navigate to previous page
  prevPage: async () => {
    const state = get()

    if (state.currentPage > 1) {
      await get().fetchGenerations(state.currentPage - 1)
    }
  },

  // Refresh current page
  refreshGenerations: async () => {
    await get().fetchGenerations()
  },
}))
