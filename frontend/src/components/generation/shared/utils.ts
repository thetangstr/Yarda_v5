/**
 * Shared utility functions for generation components
 * Feature 005 - V2 Port
 */

import {
  AREA_EMOJI_MAP,
  AREA_DISPLAY_NAME_MAP,
  STATUS_TEXT_MAP,
  STATUS_COLOR_MAP,
  DEFAULT_AREA_EMOJI,
  DEFAULT_STATUS_COLOR,
} from './constants';

/**
 * Maps area ID to emoji icon
 */
export function getAreaEmoji(areaId: string): string {
  return AREA_EMOJI_MAP[areaId] || DEFAULT_AREA_EMOJI;
}

/**
 * Maps area ID to display name
 */
export function getAreaDisplayName(areaId: string): string {
  return AREA_DISPLAY_NAME_MAP[areaId] || areaId;
}

/**
 * Maps area status to user-friendly display text
 */
export function getStatusText(status: string): string {
  return STATUS_TEXT_MAP[status] || status;
}

/**
 * Maps area status to color classes
 */
export function getStatusColor(status: string): string {
  return STATUS_COLOR_MAP[status] || DEFAULT_STATUS_COLOR;
}
