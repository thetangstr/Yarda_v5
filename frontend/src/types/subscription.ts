/**
 * Subscription Type Definitions
 *
 * T094: Create SubscriptionPlan and SubscriptionStatus types
 *
 * Centralized type definitions for subscription-related data structures.
 * These types are used across the frontend for type safety and consistency.
 */

/**
 * Subscription Plan
 * Represents an available subscription tier (e.g., Monthly Pro)
 */
export interface SubscriptionPlan {
  /** Unique identifier for the plan */
  plan_id: string;

  /** Display name of the plan */
  name: string;

  /** Price in cents (e.g., 9900 for $99.00) */
  price_cents: number;

  /** Human-readable description of the plan */
  description: string;

  /** List of features included in this plan */
  features: string[];

  /** Billing frequency */
  billing_period: 'monthly' | 'annual';
}

/**
 * Subscription Status
 * Represents the current state of a user's subscription
 */
export interface SubscriptionStatus {
  /** Unique identifier for this subscription instance */
  subscription_id: string;

  /** Current status of the subscription */
  status: 'active' | 'inactive' | 'past_due' | 'cancelled';

  /** ID of the plan this subscription is for */
  plan_id: string;

  /** Name of the plan (denormalized for convenience) */
  plan_name: string;

  /** Price in cents */
  price_cents: number;

  /** Start of current billing period (ISO 8601 date string) */
  current_period_start: string;

  /** End of current billing period (ISO 8601 date string) */
  current_period_end: string;

  /** Whether the subscription will cancel at the end of the current period */
  cancel_at_period_end: boolean;

  /** When the subscription was cancelled (ISO 8601 date string), if applicable */
  cancelled_at?: string;
}

/**
 * Helper function to check if a subscription is active
 */
export function isSubscriptionActive(subscription: SubscriptionStatus | null): boolean {
  return subscription?.status === 'active' && !subscription?.cancel_at_period_end;
}

/**
 * Helper function to format subscription price
 */
export function formatSubscriptionPrice(priceCents: number): string {
  return `$${(priceCents / 100).toFixed(2)}`;
}

/**
 * Helper function to get days remaining in subscription
 */
export function getDaysRemaining(subscription: SubscriptionStatus): number {
  const endDate = new Date(subscription.current_period_end);
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
