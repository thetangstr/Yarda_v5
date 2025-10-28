/**
 * Database types generated from Supabase schema
 * Run `supabase gen types typescript` to regenerate
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          email_verified: boolean
          email_verification_token: string | null
          email_verification_expires_at: string | null
          trial_credits: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          email_verified?: boolean
          email_verification_token?: string | null
          email_verification_expires_at?: string | null
          trial_credits?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          email_verified?: boolean
          email_verification_token?: string | null
          email_verification_expires_at?: string | null
          trial_credits?: number
          created_at?: string
          updated_at?: string
        }
      }
      token_accounts: {
        Row: {
          id: string
          user_id: string
          balance: number
          lifetime_purchased: number
          lifetime_consumed: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          balance?: number
          lifetime_purchased?: number
          lifetime_consumed?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          balance?: number
          lifetime_purchased?: number
          lifetime_consumed?: number
          created_at?: string
          updated_at?: string
        }
      }
      generations: {
        Row: {
          id: string
          user_id: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          input_type: 'photo' | 'address'
          input_photo_url: string | null
          input_address: string | null
          style: string
          custom_prompt: string | null
          output_image_url: string | null
          error_message: string | null
          processing_time_ms: number | null
          credit_type: 'trial' | 'token' | null
          credit_refunded: boolean
          created_at: string
          started_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          input_type: 'photo' | 'address'
          input_photo_url?: string | null
          input_address?: string | null
          style: string
          custom_prompt?: string | null
          output_image_url?: string | null
          error_message?: string | null
          processing_time_ms?: number | null
          credit_type?: 'trial' | 'token' | null
          credit_refunded?: boolean
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          input_type?: 'photo' | 'address'
          input_photo_url?: string | null
          input_address?: string | null
          style?: string
          custom_prompt?: string | null
          output_image_url?: string | null
          error_message?: string | null
          processing_time_ms?: number | null
          credit_type?: 'trial' | 'token' | null
          credit_refunded?: boolean
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
      }
      rate_limits: {
        Row: {
          id: string
          user_id: string
          attempted_at: string
        }
        Insert: {
          id?: string
          user_id: string
          attempted_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          attempted_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_credit: {
        Args: { p_user_id: string }
        Returns: string
      }
      check_rate_limit: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      refund_credit: {
        Args: { p_generation_id: string }
        Returns: void
      }
      get_credit_balance: {
        Args: { p_user_id: string }
        Returns: {
          trial_credits: number
          token_balance: number
          total_available: number
        }[]
      }
      cleanup_old_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}