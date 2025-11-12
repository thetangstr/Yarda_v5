/**
 * Unified Credit Sync Manager
 *
 * Manages automatic synchronization of all credit types (trial, token, holiday)
 * between frontend state and backend API.
 *
 * Features:
 * - Automatic 15-second refresh for all credit types
 * - Manual refresh on-demand
 * - Syncs with userStore (localStorage)
 * - Prevents localStorage staleness
 * - Unified interface for all credit operations
 *
 * Feature: Credit Systems Consolidation (2025-11-11)
 */

import React from 'react';
import { creditsAPI, UnifiedBalanceResponse } from './api';
import { useUserStore } from '@/store/userStore';

export type CreditType = 'trial' | 'token' | 'holiday';

export interface CreditSyncOptions {
  /**
   * Auto-refresh interval in milliseconds
   * Default: 15000 (15 seconds)
   * Set to 0 to disable auto-refresh
   */
  refreshInterval?: number;

  /**
   * Callback when credits are updated
   */
  onUpdate?: (balances: UnifiedBalanceResponse) => void;

  /**
   * Callback when fetch fails
   */
  onError?: (error: Error) => void;
}

/**
 * Credit Sync Manager
 *
 * Singleton class that manages credit synchronization across the app.
 */
export class CreditSyncManager {
  private static instance: CreditSyncManager | null = null;
  private refreshIntervalId: NodeJS.Timeout | null = null;
  private isRefreshing: boolean = false;
  private options: CreditSyncOptions;

  private constructor(options: CreditSyncOptions = {}) {
    this.options = {
      refreshInterval: 15000, // 15 seconds default
      ...options,
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(options?: CreditSyncOptions): CreditSyncManager {
    if (!CreditSyncManager.instance) {
      CreditSyncManager.instance = new CreditSyncManager(options);
    }
    return CreditSyncManager.instance;
  }

  /**
   * Start automatic credit refresh
   */
  public start(): void {
    // Don't start if already running or if interval is 0
    if (this.refreshIntervalId || this.options.refreshInterval === 0) {
      return;
    }

    // Initial sync (don't await - errors are handled in refreshNow)
    this.refreshNow().catch(() => {
      // Error already logged in refreshNow, just silently continue
    });

    // Set up periodic refresh
    this.refreshIntervalId = setInterval(() => {
      this.refreshNow().catch(() => {
        // Error already logged in refreshNow, just silently continue
      });
    }, this.options.refreshInterval);

    console.log(
      `[CreditSync] Started auto-refresh (interval: ${this.options.refreshInterval}ms)`
    );
  }

  /**
   * Stop automatic credit refresh
   */
  public stop(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
      console.log('[CreditSync] Stopped auto-refresh');
    }
  }

  /**
   * Manually refresh credits immediately
   *
   * Returns: Promise that resolves with updated balances or null on error
   */
  public async refreshNow(): Promise<UnifiedBalanceResponse | null> {
    // Skip refresh if user is not authenticated
    const { user, isAuthenticated } = useUserStore.getState();
    if (!user || !isAuthenticated) {
      return null;
    }

    // Prevent concurrent refreshes
    if (this.isRefreshing) {
      console.log('[CreditSync] Refresh already in progress, skipping');
      return null;
    }

    this.isRefreshing = true;

    try {
      // Fetch unified balance from backend
      const balances = await creditsAPI.getBalance();

      // Update userStore with latest balances
      this.updateStore(balances);

      // Call onUpdate callback if provided
      if (this.options.onUpdate) {
        this.options.onUpdate(balances);
      }

      console.log('[CreditSync] Refreshed credits:', {
        trial: balances.trial.remaining,
        token: balances.token.balance,
        holiday: balances.holiday.credits,
      });
      console.log('[CreditSync] Updated user store with fresh balances');

      return balances;
    } catch (error) {
      console.error('[CreditSync] Failed to refresh credits:', error);

      // Call onError callback if provided
      if (this.options.onError && error instanceof Error) {
        this.options.onError(error);
      }

      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Update userStore with unified balances
   */
  private updateStore(balances: UnifiedBalanceResponse): void {
    const { user, setBalances } = useUserStore.getState();

    if (!user) {
      console.warn('[CreditSync] No user in store, skipping update');
      return;
    }

    // Update unified balances (automatically updates user and tokenBalance)
    setBalances(balances);
  }

  /**
   * Get current refresh interval
   */
  public getRefreshInterval(): number {
    return this.options.refreshInterval || 0;
  }

  /**
   * Check if auto-refresh is active
   */
  public isActive(): boolean {
    return this.refreshIntervalId !== null;
  }

  /**
   * Reset singleton instance (for testing)
   */
  public static reset(): void {
    if (CreditSyncManager.instance) {
      CreditSyncManager.instance.stop();
      CreditSyncManager.instance = null;
    }
  }
}

/**
 * React Hook for credit synchronization
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   useCredits(); // Auto-starts credit sync
 *
 *   const { user } = useUserStore();
 *   return <div>Trial: {user?.trial_remaining}</div>;
 * }
 * ```
 */
export function useCredits(options?: CreditSyncOptions): {
  refresh: () => Promise<UnifiedBalanceResponse | null>;
  isRefreshing: boolean;
} {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const syncManager = React.useRef<CreditSyncManager | null>(null);

  React.useEffect(() => {
    // Initialize sync manager
    syncManager.current = CreditSyncManager.getInstance(options);

    // Start auto-refresh
    syncManager.current.start();

    // Immediately do a sync to ensure fresh data on page load
    setIsRefreshing(true);
    syncManager.current.refreshNow().finally(() => {
      setIsRefreshing(false);
    });

    // Cleanup on unmount
    return () => {
      syncManager.current?.stop();
    };
  }, [options]);

  const refresh = React.useCallback(async () => {
    if (!syncManager.current) return null;

    setIsRefreshing(true);
    const result = await syncManager.current.refreshNow();
    setIsRefreshing(false);
    return result;
  }, []);

  return { refresh, isRefreshing };
}
