/**
 * localStorage Keys (Feature 005 - V2 Port)
 *
 * Centralized localStorage key constants for session recovery.
 * Used to save/restore active generation state across browser sessions.
 *
 * Storage Strategy:
 * - Save request_id, areas, and address when generation starts
 * - Clear all keys when generation completes successfully
 * - Recover on page mount if active request exists
 * - Max storage: < 5KB per generation (within localStorage limits)
 */

/**
 * localStorage key for active generation request ID.
 * Stores the UUID of the current in-progress generation.
 *
 * @example
 * localStorage.setItem(STORAGE_KEYS.ACTIVE_REQUEST_ID, 'abc-123-def-456');
 */
export const ACTIVE_REQUEST_ID = 'yarda_active_request_id';

/**
 * localStorage key for active generation areas.
 * Stores JSON stringified array of selected yard areas.
 *
 * @example
 * localStorage.setItem(STORAGE_KEYS.ACTIVE_REQUEST_AREAS, JSON.stringify(['front_yard', 'back_yard']));
 */
export const ACTIVE_REQUEST_AREAS = 'yarda_active_request_areas';

/**
 * localStorage key for active generation address.
 * Stores the property address string.
 *
 * @example
 * localStorage.setItem(STORAGE_KEYS.ACTIVE_REQUEST_ADDRESS, '123 Main St, San Francisco, CA');
 */
export const ACTIVE_REQUEST_ADDRESS = 'yarda_active_request_address';

/**
 * Grouped storage keys object for convenient imports.
 */
export const STORAGE_KEYS = {
  ACTIVE_REQUEST_ID,
  ACTIVE_REQUEST_AREAS,
  ACTIVE_REQUEST_ADDRESS,
} as const;

/**
 * Helper to save generation state to localStorage.
 * @param requestId - Generation request UUID
 * @param areas - Array of selected area IDs
 * @param address - Property address string
 */
export function saveGenerationToLocalStorage(
  requestId: string,
  areas: string[],
  address: string
): void {
  try {
    localStorage.setItem(ACTIVE_REQUEST_ID, requestId);
    localStorage.setItem(ACTIVE_REQUEST_AREAS, JSON.stringify(areas));
    localStorage.setItem(ACTIVE_REQUEST_ADDRESS, address);
  } catch (error) {
    console.error('Failed to save generation to localStorage:', error);
    // Graceful degradation - continue without localStorage
  }
}

/**
 * Helper to retrieve generation state from localStorage.
 * @returns Object with requestId, areas, address (null if not found)
 */
export function getGenerationFromLocalStorage(): {
  requestId: string | null;
  areas: string[] | null;
  address: string | null;
} {
  try {
    const requestId = localStorage.getItem(ACTIVE_REQUEST_ID);
    const areasJson = localStorage.getItem(ACTIVE_REQUEST_AREAS);
    const address = localStorage.getItem(ACTIVE_REQUEST_ADDRESS);

    return {
      requestId,
      areas: areasJson ? JSON.parse(areasJson) : null,
      address,
    };
  } catch (error) {
    console.error('Failed to retrieve generation from localStorage:', error);
    return {
      requestId: null,
      areas: null,
      address: null,
    };
  }
}

/**
 * Helper to clear generation state from localStorage.
 * Called when generation completes or fails.
 */
export function clearGenerationFromLocalStorage(): void {
  try {
    localStorage.removeItem(ACTIVE_REQUEST_ID);
    localStorage.removeItem(ACTIVE_REQUEST_AREAS);
    localStorage.removeItem(ACTIVE_REQUEST_ADDRESS);
  } catch (error) {
    console.error('Failed to clear generation from localStorage:', error);
    // Graceful degradation - continue
  }
}

/**
 * Helper to check if there's an active generation in localStorage.
 * @returns Boolean indicating if active generation exists
 */
export function hasActiveGeneration(): boolean {
  try {
    const requestId = localStorage.getItem(ACTIVE_REQUEST_ID);
    return requestId !== null && requestId.length > 0;
  } catch (error) {
    return false;
  }
}
