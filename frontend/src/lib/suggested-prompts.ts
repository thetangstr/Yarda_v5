/**
 * Suggested Prompts System (Feature 005 - V2 Port)
 *
 * Provides pre-defined prompt suggestions with emoji mappings for yard areas.
 * - 5 prompts per area (front_yard, back_yard, walkway)
 * - 30+ emoji keyword mappings
 * - Automatic emoji detection based on prompt text
 */

import type { SuggestedPrompt } from '@/types/generation';

// Emoji keyword mappings (30+ total from v2)
export const PROMPT_EMOJI_MAP: Record<string, string> = {
  // Plants & Nature
  flower: '🌸',
  rose: '🌹',
  grass: '🌿',
  tree: '🌳',
  plant: '🌱',
  succulent: '🌵',
  palm: '🌴',
  herb: '🌿',
  vegetable: '🥬',
  garden: '🪴',

  // Hardscape & Features
  patio: '🪑',
  water: '⛲',
  fountain: '⛲',
  rock: '🪨',
  stone: '🪨',
  gravel: '🪨',
  pathway: '🚶',
  walkway: '🚶',
  deck: '🪵',
  pergola: '⛱️',

  // Styles & Themes
  zen: '🧘',
  modern: '🏗️',
  minimalist: '⬜',
  rustic: '🏕️',
  natural: '🍃',
  drought: '💧',
  native: '🌎',

  // Activities & Spaces
  entertainment: '🎉',
  dining: '🍽️',
  play: '🎮',
  seating: '🪑',
  shade: '🌳',

  // Default fallback
  default: '🏡',
};

// Pre-defined suggested prompts per area (from v2 research)
export const SUGGESTED_PROMPTS_DATA: Record<string, string[]> = {
  front_yard: [
    'colorful flower beds with seasonal blooms',
    'drought-tolerant native plants with decorative rocks',
    'modern minimalist landscaping with clean lines',
    'native California plants with natural gravel pathways',
    'low-maintenance xeriscaping with succulents',
  ],
  back_yard: [
    'entertainment area with patio and outdoor seating',
    'dining space with pergola and shade features',
    'natural stone pathways with mixed planting beds',
    'play area with soft artificial turf',
    'vegetable garden with raised beds',
  ],
  walkway: [
    'symmetrical pathway with border plantings',
    'curved natural stone pathway',
    'modern concrete pavers with ground cover',
    'rustic gravel path with native plants',
    'linear stepping stones through lawn',
  ],
};

/**
 * Detects the best matching emoji for a prompt text based on keyword matching.
 * @param promptText - The prompt text to analyze
 * @returns Emoji character (defaults to 🏡 if no match)
 */
export function getEmojiForPrompt(promptText: string): string {
  const lowerText = promptText.toLowerCase();

  // Check each keyword in priority order (more specific first)
  for (const [keyword, emoji] of Object.entries(PROMPT_EMOJI_MAP)) {
    if (lowerText.includes(keyword)) {
      return emoji;
    }
  }

  return PROMPT_EMOJI_MAP.default;
}

/**
 * Generates suggested prompts for a specific yard area.
 * @param areaId - The yard area identifier (front_yard, back_yard, walkway)
 * @returns Array of SuggestedPrompt objects (max 5)
 */
export function getSuggestedPromptsForArea(areaId: string): SuggestedPrompt[] {
  const prompts = SUGGESTED_PROMPTS_DATA[areaId] || [];

  return prompts.map((text, index) => ({
    id: `${areaId}_${index}`,
    text,
    emoji: getEmojiForPrompt(text),
    selected: false,
    areaId,
  }));
}

/**
 * Gets all suggested prompts organized by area.
 * @returns Record of area IDs to their suggested prompts
 */
export function getAllSuggestedPrompts(): Record<string, SuggestedPrompt[]> {
  return {
    front_yard: getSuggestedPromptsForArea('front_yard'),
    back_yard: getSuggestedPromptsForArea('back_yard'),
    walkway: getSuggestedPromptsForArea('walkway'),
  };
}

/**
 * Validates that selected prompts don't exceed maximum (3 per area).
 * @param selectedPrompts - Array of selected prompt texts
 * @returns Boolean indicating if selection is valid
 */
export function isValidPromptSelection(selectedPrompts: string[]): boolean {
  return selectedPrompts.length <= 3;
}

/**
 * Formats selected prompts as comma-separated string for API submission.
 * @param selectedPrompts - Array of selected prompt texts
 * @returns Comma-separated string
 */
export function formatPromptsForSubmission(selectedPrompts: string[]): string {
  return selectedPrompts.join(', ');
}

/**
 * Parses comma-separated prompt string into array.
 * @param promptString - Comma-separated prompt text
 * @returns Array of individual prompts (trimmed, filtered)
 */
export function parsePromptsFromString(promptString: string): string[] {
  return promptString
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0);
}
