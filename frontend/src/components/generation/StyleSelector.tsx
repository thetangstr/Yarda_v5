/**
 * StyleSelector Component
 *
 * Design style selection component with visual previews.
 *
 * Requirements:
 * - T020: Style selection with descriptions
 * - FR-005: 7 design style options
 * - Research: Visual style previews for better UX
 *
 * Features:
 * - 7 landscape design styles
 * - Visual cards with descriptions
 * - Custom prompt textarea (optional)
 * - Character counter (500 char max)
 * - Accessible keyboard navigation
 */

import React from 'react';
import { DesignStyle, type LandscapeStyle } from '@/types/generation';

interface StyleOption {
  value: LandscapeStyle;
  label: string;
  description: string;
  tags: string[];
  emoji: string;
}

const STYLE_OPTIONS: StyleOption[] = [
  {
    value: DesignStyle.ModernMinimalist,
    label: 'Modern Minimalist',
    description: 'Clean lines, simple geometry, minimal plantings with architectural focus',
    tags: ['Contemporary', 'Low maintenance', 'Geometric'],
    emoji: '🏛️',
  },
  {
    value: DesignStyle.CaliforniaNative,
    label: 'California Native',
    description: 'Drought-resistant native plants, sustainable water-wise landscaping',
    tags: ['Eco-friendly', 'Drought-tolerant', 'Native species'],
    emoji: '🌿',
  },
  {
    value: DesignStyle.JapaneseZen,
    label: 'Japanese Zen',
    description: 'Tranquil zen garden with rocks, bamboo, and water features',
    tags: ['Peaceful', 'Asian-inspired', 'Meditative'],
    emoji: '🎋',
  },
  {
    value: DesignStyle.EnglishGarden,
    label: 'English Garden',
    description: 'Lush colorful flowers, romantic pathways, and traditional charm',
    tags: ['Classic', 'Colorful', 'Cottage-style'],
    emoji: '🌹',
  },
  {
    value: DesignStyle.DesertLandscape,
    label: 'Desert Landscape',
    description: 'Cacti, succulents, and xeriscaping for arid climates',
    tags: ['Xeriscape', 'Southwestern', 'Low water'],
    emoji: '🌵',
  },
  {
    value: DesignStyle.Mediterranean,
    label: 'Mediterranean',
    description: 'Olive trees, lavender, terracotta pots with European flair',
    tags: ['Tuscan', 'Warm climate', 'Herb gardens'],
    emoji: '🫒',
  },
  {
    value: DesignStyle.TropicalResort,
    label: 'Tropical Resort',
    description: 'Lush palms, exotic flowers, creating vacation-like ambiance',
    tags: ['Exotic', 'Bold colors', 'Resort-style'],
    emoji: '🌴',
  },
];

interface StyleSelectorProps {
  /** Selected style */
  value: LandscapeStyle;
  /** Callback when style changes */
  onChange: (value: LandscapeStyle) => void;
  /** Custom prompt value */
  customPrompt?: string;
  /** Callback when custom prompt changes */
  onCustomPromptChange?: (value: string) => void;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
  /** Custom CSS classes */
  className?: string;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({
  value,
  onChange,
  customPrompt = '',
  onCustomPromptChange,
  disabled = false,
  error,
  className = '',
}) => {
  const maxPromptLength = 500;

  return (
    <div className={className}>
      {/* Style Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-neutral-900 mb-2">
          Design Style
        </label>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          role="radiogroup"
          aria-label="Design style selection"
        >
          {STYLE_OPTIONS.map((option) => {
            const isSelected = value === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => !disabled && onChange(option.value)}
                disabled={disabled}
                className={`
                  relative flex flex-col items-start p-4 border-2 rounded-lg
                  transition-all duration-200 text-left
                  ${isSelected
                    ? 'border-brand-green bg-brand-sage ring-2 ring-brand-green ring-opacity-50'
                    : 'border-neutral-300 bg-white hover:border-brand-green hover:bg-neutral-50'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2
                `}
                role="radio"
                aria-checked={isSelected}
                data-testid={`style-option-${option.value}`}
              >
                {/* Header with emoji and radio indicator */}
                <div className="flex items-start justify-between w-full mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden="true">
                      {option.emoji}
                    </span>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                        ${isSelected ? 'border-brand-green' : 'border-neutral-400'}
                      `}
                    >
                      {isSelected && <div className="w-3 h-3 rounded-full bg-brand-green" />}
                    </div>
                  </div>
                </div>

                {/* Style name */}
                <h3 className={`font-semibold mb-1 ${isSelected ? 'text-brand-dark-green' : 'text-neutral-900'}`}>
                  {option.label}
                </h3>

                {/* Description */}
                <p className="text-sm text-neutral-600 mb-3 line-clamp-2">
                  {option.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {option.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`px-2 py-0.5 text-xs rounded-full
                        ${isSelected
                          ? 'bg-brand-green text-white'
                          : 'bg-neutral-100 text-neutral-600'
                        }
                      `}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <p className="mt-2 text-sm text-error-600" role="alert" data-testid="style-selector-error">
            {error}
          </p>
        )}
      </div>

      {/* Custom Prompt (Optional) */}
      {onCustomPromptChange && (
        <div>
          <label htmlFor="custom-prompt" className="block text-sm font-medium text-neutral-900 mb-2">
            Custom Instructions <span className="text-neutral-500 font-normal">(Optional)</span>
          </label>

          <textarea
            id="custom-prompt"
            name="custom_prompt"
            value={customPrompt}
            onChange={(e) => onCustomPromptChange(e.target.value)}
            disabled={disabled}
            rows={3}
            maxLength={maxPromptLength}
            placeholder="Add specific features you'd like (e.g., 'Include a water feature near the entrance' or 'Use drought-resistant plants only')"
            className={`w-full px-4 py-3 border rounded-lg transition-colors duration-200
              border-neutral-300 focus:ring-brand-green focus:border-brand-green
              focus:ring-2 focus:outline-none
              disabled:bg-neutral-100 disabled:cursor-not-allowed
              placeholder:text-neutral-400
              resize-none
            `}
            data-testid="custom-prompt-input"
          />

          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-neutral-500">
              Be specific about colors, materials, or features you'd like to see
            </p>
            <p
              className={`text-xs font-medium ${
                customPrompt.length > maxPromptLength * 0.9
                  ? 'text-warning-600'
                  : 'text-neutral-500'
              }`}
            >
              {customPrompt.length}/{maxPromptLength}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StyleSelector;
