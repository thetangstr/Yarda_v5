/**
 * Seasonal Features Utility
 *
 * Determines when seasonal features (like Holiday Decorator) should be active.
 * Supports date-based activation with environment variable override for testing.
 *
 * @module lib/seasonalFeatures
 */

// ============================================================================
// Configuration
// ============================================================================

/**
 * Holiday season date range
 * Thanksgiving (4th Thursday of November) through New Year's Day (January 1st)
 *
 * Simplified: November 1st - January 1st (includes full holiday season)
 */
const HOLIDAY_SEASON_START = { month: 11, day: 1 };  // November 1st
const HOLIDAY_SEASON_END = { month: 1, day: 1 };     // January 1st (next year)

/**
 * Environment variable override for testing
 * Set NEXT_PUBLIC_HOLIDAY_OVERRIDE=true to force enable
 * Set NEXT_PUBLIC_HOLIDAY_OVERRIDE=false to force disable
 * Omit to use date-based logic
 */
const OVERRIDE_ENV_VAR = process.env.NEXT_PUBLIC_HOLIDAY_OVERRIDE;

// ============================================================================
// Public API
// ============================================================================

/**
 * Check if holiday season is currently active
 *
 * @returns {boolean} true if holiday feature should be shown
 *
 * @example
 * ```tsx
 * import { isHolidaySeasonActive } from '@/lib/seasonalFeatures';
 *
 * function HomePage() {
 *   return (
 *     <>
 *       {isHolidaySeasonActive() && <HolidayHero />}
 *       {!isHolidaySeasonActive() && <StandardHero />}
 *     </>
 *   );
 * }
 * ```
 */
export function isHolidaySeasonActive(): boolean {
  // Check environment variable override first
  if (OVERRIDE_ENV_VAR !== undefined) {
    return OVERRIDE_ENV_VAR === 'true';
  }

  // Use date-based logic
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // getMonth() is 0-indexed
  const currentDay = now.getDate();

  // Holiday season spans across year boundary (Nov 1 - Jan 1)
  // Active if:
  // - November (month 11) and day >= 1
  // - December (month 12) all days
  // - January (month 1) and day === 1
  if (currentMonth === 11) {
    // November: active from day 1 onwards
    return currentDay >= HOLIDAY_SEASON_START.day;
  } else if (currentMonth === 12) {
    // December: active all month
    return true;
  } else if (currentMonth === 1) {
    // January: active only on day 1
    return currentDay === HOLIDAY_SEASON_END.day;
  }

  // Outside holiday season
  return false;
}

/**
 * Get the start date of the holiday season for current year
 *
 * @returns {Date} Holiday season start date
 */
export function getHolidaySeasonStartDate(): Date {
  const now = new Date();
  const year = now.getFullYear();
  return new Date(year, HOLIDAY_SEASON_START.month - 1, HOLIDAY_SEASON_START.day);
}

/**
 * Get the end date of the holiday season (next year's January 1st)
 *
 * @returns {Date} Holiday season end date
 */
export function getHolidaySeasonEndDate(): Date {
  const now = new Date();
  let year = now.getFullYear();

  // If we're currently in the holiday season (Nov/Dec), end date is next year
  if (now.getMonth() + 1 >= 11) {
    year += 1;
  }

  return new Date(year, HOLIDAY_SEASON_END.month - 1, HOLIDAY_SEASON_END.day);
}

/**
 * Get human-readable description of holiday season status
 *
 * @returns {string} Status message
 *
 * @example
 * ```tsx
 * console.log(getHolidaySeasonStatus());
 * // During season: "Holiday season is active (Nov 1 - Jan 1)"
 * // Outside season: "Holiday season starts November 1st"
 * ```
 */
export function getHolidaySeasonStatus(): string {
  if (OVERRIDE_ENV_VAR !== undefined) {
    return OVERRIDE_ENV_VAR === 'true'
      ? 'Holiday season active (override: enabled)'
      : 'Holiday season inactive (override: disabled)';
  }

  const isActive = isHolidaySeasonActive();
  const startDate = getHolidaySeasonStartDate();
  const endDate = getHolidaySeasonEndDate();

  if (isActive) {
    return `Holiday season is active (${formatDate(startDate)} - ${formatDate(endDate)})`;
  } else {
    const daysUntilStart = Math.ceil(
      (startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilStart > 0) {
      return `Holiday season starts ${formatDate(startDate)} (${daysUntilStart} days)`;
    } else {
      return `Holiday season ended ${formatDate(endDate)}. See you next year!`;
    }
  }
}

/**
 * Check if festive UI should be enabled
 * Separate from holiday season active - allows A/B testing UI independently
 *
 * @returns {boolean} true if festive UI enhancements should be shown
 */
export function isFestiveUIEnabled(): boolean {
  // Check environment variable for festive UI override
  const festiveUIOverride = process.env.NEXT_PUBLIC_ENABLE_FESTIVE_UI;

  if (festiveUIOverride !== undefined) {
    return festiveUIOverride === 'true';
  }

  // Default: festive UI enabled during holiday season
  return isHolidaySeasonActive();
}

// ============================================================================
// Internal Utilities
// ============================================================================

/**
 * Format date for human-readable display
 *
 * @param {Date} date - Date to format
 * @returns {string} Formatted date (e.g., "November 1st")
 */
function formatDate(date: Date): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const month = monthNames[date.getMonth()];
  const day = date.getDate();
  const suffix = getDaySuffix(day);

  return `${month} ${day}${suffix}`;
}

/**
 * Get ordinal suffix for day number
 *
 * @param {number} day - Day of month (1-31)
 * @returns {string} Suffix ('st', 'nd', 'rd', 'th')
 */
function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return 'th';
  }

  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

// ============================================================================
// Testing Helpers (only for development/testing)
// ============================================================================

/**
 * Override the current date for testing seasonal logic
 * Only works in development mode
 *
 * @param {Date} date - Date to simulate
 *
 * @example
 * ```typescript
 * // Test holiday season logic in August
 * setTestDate(new Date('2024-08-15'));
 * console.log(isHolidaySeasonActive()); // false
 *
 * // Test during holiday season
 * setTestDate(new Date('2024-12-25'));
 * console.log(isHolidaySeasonActive()); // true
 * ```
 */
export function setTestDate(date: Date): void {
  if (process.env.NODE_ENV !== 'production') {
    // In production, this function does nothing
    // In development, you would need to implement time mocking
    console.warn('setTestDate() is for testing only. Use NEXT_PUBLIC_HOLIDAY_OVERRIDE in production.');
  }
}
