/**
 * Shared TypeScript types for Yarda AI frontend
 */

export interface User {
  id: string;
  email: string;
  email_verified: boolean;
  trial_remaining: number;
  trial_used: number;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  subscription_status: 'active' | 'inactive' | 'cancelled' | 'past_due';
  created_at: string;
  avatar_url?: string;
  full_name?: string;
}

export interface Generation {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  image_urls: string[];
  metadata: {
    address?: string;
    area?: string;
    style?: string;
    prompt?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
  error_message?: string;
}

export interface Project extends Generation {
  title: string;
  image_url?: string;
}

export interface TokenTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'purchase' | 'usage' | 'refund' | 'bonus';
  balance_after: number;
  created_at: string;
  stripe_payment_intent_id?: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  plan_name: string;
  plan_amount: number;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}
