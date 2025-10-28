import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserWithCredits, CreditBalance, Generation, CreateGenerationRequest, TokenAccount } from '@/types'
import { apiClient, RateLimitError } from '@/services/api'

interface UserState {
  user: UserWithCredits | null
  isAuthenticated: boolean
  isLoading: boolean

  // Credit tracking
  credits: {
    trial: number
    tokens: number
    total: number
  }

  // Token account
  tokenAccount: TokenAccount | null

  // Generation state
  currentGeneration: Generation | null
  isGenerating: boolean

  // Rate limit state
  rateLimitStatus: {
    canRequest: boolean
    remainingRequests: number
    retryAfter: number
  }
  isRateLimited: boolean

  // Actions
  setUser: (user: UserWithCredits | null) => void
  updateCredits: (credits: CreditBalance) => void
  logout: () => void
  setLoading: (loading: boolean) => void

  // Credit actions
  fetchCredits: () => Promise<void>
  fetchTokenAccount: () => Promise<void>

  // Rate limit actions
  fetchRateLimitStatus: () => Promise<void>
  handleRateLimitError: (retryAfter: number) => void
  clearRateLimit: () => void

  // Generation actions
  startGeneration: (data: CreateGenerationRequest) => Promise<Generation>
  updateGenerationStatus: (id: string, status: string) => Promise<void>
  setCurrentGeneration: (generation: Generation | null) => void
  pollGenerationStatus: (id: string) => Promise<void>
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      credits: {
        trial: 0,
        tokens: 0,
        total: 0,
      },

      tokenAccount: null,

      currentGeneration: null,
      isGenerating: false,

      // Initial rate limit state
      rateLimitStatus: {
        canRequest: true,
        remainingRequests: 3,
        retryAfter: 0,
      },
      isRateLimited: false,

      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
          tokenAccount: user?.token_account || null,
          credits: user
            ? {
                trial: user.trial_credits,
                tokens: user.token_account?.balance || 0,
                total: user.trial_credits + (user.token_account?.balance || 0),
              }
            : { trial: 0, tokens: 0, total: 0 },
        })
      },

      updateCredits: (credits) =>
        set((state) => {
          if (!state.user) return state

          return {
            user: {
              ...state.user,
              trial_credits: credits.trial_credits,
              token_account: {
                ...state.user.token_account,
                balance: credits.token_balance,
              },
            },
            credits: {
              trial: credits.trial_credits,
              tokens: credits.token_balance,
              total: credits.total_credits,
            },
          }
        }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          credits: { trial: 0, tokens: 0, total: 0 },
          tokenAccount: null,
          currentGeneration: null,
          isGenerating: false,
          rateLimitStatus: {
            canRequest: true,
            remainingRequests: 3,
            retryAfter: 0,
          },
          isRateLimited: false,
        }),

      setLoading: (loading) =>
        set({
          isLoading: loading,
        }),

      fetchCredits: async () => {
        try {
          const credits = await apiClient.getCreditBalance()
          get().updateCredits(credits)
        } catch (error) {
          console.error('Failed to fetch credits:', error)
          throw error
        }
      },

      fetchTokenAccount: async () => {
        try {
          const account = await apiClient.getTokenAccount()
          set({ tokenAccount: account })
        } catch (error) {
          console.error('Failed to fetch token account:', error)
        }
      },

      // Rate limit actions
      fetchRateLimitStatus: async () => {
        try {
          const status = await apiClient.getRateLimitStatus()
          set({
            rateLimitStatus: {
              canRequest: status.can_request,
              remainingRequests: status.remaining_requests,
              retryAfter: status.retry_after_seconds,
            },
            isRateLimited: !status.can_request,
          })
        } catch (error) {
          console.error('Failed to fetch rate limit status:', error)
        }
      },

      handleRateLimitError: (retryAfter: number) => {
        set({
          isRateLimited: true,
          rateLimitStatus: {
            canRequest: false,
            remainingRequests: 0,
            retryAfter,
          },
        })
      },

      clearRateLimit: () => {
        set({
          isRateLimited: false,
          rateLimitStatus: {
            canRequest: true,
            remainingRequests: 3,
            retryAfter: 0,
          },
        })
      },

      startGeneration: async (data: CreateGenerationRequest) => {
        set({ isGenerating: true })
        try {
          const generation = await apiClient.createGeneration(data)
          set({ currentGeneration: generation })

          // Immediately fetch updated credit balance and rate limit status
          await get().fetchCredits()
          await get().fetchRateLimitStatus()

          // Start polling for status updates
          if (generation.status === 'pending' || generation.status === 'processing') {
            get().pollGenerationStatus(generation.id)
          }

          return generation
        } catch (error) {
          // Handle rate limit error
          if (error instanceof RateLimitError) {
            get().handleRateLimitError(error.retryAfter)
          }
          set({ isGenerating: false })
          throw error
        }
      },

      updateGenerationStatus: async (id: string, status: string) => {
        try {
          const generation = await apiClient.getGeneration(id)
          set({ currentGeneration: generation })

          if (generation.status === 'completed' || generation.status === 'failed') {
            set({ isGenerating: false })

            // Refresh credits in case of refund
            await get().fetchCredits()
          }
        } catch (error) {
          console.error('Failed to update generation status:', error)
          set({ isGenerating: false })
        }
      },

      pollGenerationStatus: async (id: string) => {
        const maxAttempts = 60 // 60 attempts = 2 minutes max
        let attempts = 0

        const poll = async () => {
          attempts++
          const generation = await apiClient.getGeneration(id)
          set({ currentGeneration: generation })

          if (generation.status === 'completed' || generation.status === 'failed') {
            set({ isGenerating: false })
            await get().fetchCredits()
            return
          }

          if (attempts < maxAttempts) {
            setTimeout(poll, 2000) // Poll every 2 seconds
          } else {
            set({ isGenerating: false })
          }
        }

        poll()
      },

      setCurrentGeneration: (generation) =>
        set({
          currentGeneration: generation,
          isGenerating: generation
            ? generation.status === 'pending' || generation.status === 'processing'
            : false,
        }),
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
