import { supabase } from '@/lib/supabase'
import type {
  UserWithCredits,
  RegisterRequest,
  VerifyEmailRequest,
  CreditBalance,
  CreateGenerationRequest,
  Generation,
  GenerationHistoryResponse,
  GenerationHistoryParams,
  TokenAccount,
} from '@/types'

/**
 * Rate limit status interface
 */
export interface RateLimitStatus {
  can_request: boolean
  remaining_requests: number
  retry_after_seconds: number
  window_seconds: number
  max_requests: number
}

/**
 * Custom error class for rate limit errors
 */
export class RateLimitError extends Error {
  constructor(public retryAfter: number, message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}

/**
 * API client for backend endpoints
 */
class ApiClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token

    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(error.message || error.detail || 'API request failed')
    }

    return response.json()
  }

  // Authentication endpoints
  async register(data: RegisterRequest): Promise<UserWithCredits> {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    })

    return this.handleResponse<UserWithCredits>(response)
  }

  async verifyEmail(data: VerifyEmailRequest): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/auth/verify-email`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    })

    return this.handleResponse(response)
  }

  async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/auth/resend-verification`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ email }),
    })

    return this.handleResponse(response)
  }

  async getCurrentUser(): Promise<UserWithCredits> {
    const response = await fetch(`${this.baseUrl}/auth/me`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    })

    return this.handleResponse<UserWithCredits>(response)
  }

  // Credit endpoints
  async getCreditBalance(): Promise<CreditBalance> {
    const response = await fetch(`${this.baseUrl}/credits/balance`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    })

    return this.handleResponse<CreditBalance>(response)
  }

  async getTokenAccount(): Promise<TokenAccount> {
    const response = await fetch(`${this.baseUrl}/credits/token-account`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    })

    return this.handleResponse<TokenAccount>(response)
  }

  // Rate limit endpoints
  async getRateLimitStatus(): Promise<RateLimitStatus> {
    const response = await fetch(`${this.baseUrl}/rate-limits/status`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error('Failed to get rate limit status')
    }

    return response.json()
  }

  // Generation endpoints
  async createGeneration(data: CreateGenerationRequest): Promise<Generation> {
    try {
      const response = await fetch(`${this.baseUrl}/generations`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(data),
      })

      // Handle rate limit error (429)
      if (response.status === 429) {
        const error = await response.json()
        const retryAfter = error.detail?.retry_after || error.retry_after || 60
        const message = error.detail?.message || error.message || 'Rate limit exceeded'
        throw new RateLimitError(retryAfter, message)
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }))
        throw new Error(error.message || error.detail || 'Generation failed')
      }

      return response.json()
    } catch (error) {
      // Re-throw RateLimitError as-is
      if (error instanceof RateLimitError) {
        throw error
      }
      throw error
    }
  }

  async getGenerationHistory(params?: GenerationHistoryParams): Promise<GenerationHistoryResponse> {
    const queryParams = new URLSearchParams()

    if (params?.limit) queryParams.set('limit', params.limit.toString())
    if (params?.offset) queryParams.set('offset', params.offset.toString())
    if (params?.status) queryParams.set('status', params.status)

    const url = `${this.baseUrl}/generations?${queryParams.toString()}`
    const response = await fetch(url, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    })

    const data = await this.handleResponse<any>(response)

    // Transform backend response format to frontend format
    return {
      generations: data.items || [],
      total: data.total || 0,
      limit: data.limit || 20,
      offset: data.offset || 0,
    }
  }

  async getGeneration(id: string): Promise<Generation> {
    const response = await fetch(`${this.baseUrl}/generations/${id}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    })

    return this.handleResponse<Generation>(response)
  }

  async listGenerations(limit?: number, offset?: number, status?: string): Promise<Generation[]> {
    const params: GenerationHistoryParams = {}
    if (limit) params.limit = limit
    if (offset) params.offset = offset
    if (status && status !== 'all') params.status = status as any

    const response = await this.getGenerationHistory(params)
    return response.generations
  }
}

export const api = new ApiClient()
export const apiClient = api // Alias for compatibility

// Supabase auth helpers
export const authHelpers = {
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) throw error
    return data
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  },

  async getUser() {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    return data.user
  },
}
