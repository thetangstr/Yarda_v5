/**
 * Shared constants for generation components
 * Feature 005 - V2 Port
 */

// Area type mappings (shared across components)
export const AREA_EMOJI_MAP: Record<string, string> = {
  front_yard: '🏠',
  back_yard: '🌲',
  walkway: '🚶',
} as const;

export const AREA_DISPLAY_NAME_MAP: Record<string, string> = {
  front_yard: 'Front Yard',
  back_yard: 'Back Yard',
  walkway: 'Walkway',
} as const;

// Status mappings
export const STATUS_TEXT_MAP: Record<string, string> = {
  pending: 'Queued...',
  processing: 'Generating...',
  completed: 'Complete!',
  failed: 'Failed',
} as const;

export const STATUS_COLOR_MAP: Record<string, string> = {
  pending: 'text-gray-500',
  processing: 'text-blue-600',
  completed: 'text-green-600',
  failed: 'text-red-600',
} as const;

// Animation constants
export const ANIMATION_DURATION = {
  fast: 0.3,
  normal: 0.5,
  slow: 1,
  spinner: 1,
  spinnerSlow: 2,
  pulse: 1.5,
} as const;

export const ANIMATION_DELAY = {
  none: 0,
  short: 0.1,
  medium: 0.2,
  long: 0.4,
  button: 0.5,
} as const;

// Default fallbacks
export const DEFAULT_AREA_EMOJI = '🏡';
export const DEFAULT_STATUS_COLOR = 'text-gray-500';
