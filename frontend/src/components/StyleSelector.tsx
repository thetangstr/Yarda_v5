'use client';

/**
 * Style Selector Component - Premium Design
 *
 * Allows users to choose their holiday decoration style with a festive red theme,
 * Material Icons, and premium typography (Playfair Display + Poppins).
 *
 * Feature: 007-holiday-decorator (T026)
 * User Story 1: New User Discovery & First Generation
 */

import React, { useMemo } from 'react';
import type { HolidayStyle } from '@/types/holiday';

// Re-export for backward compatibility with holiday.tsx
export type { HolidayStyle };

interface StyleOption {
  id: HolidayStyle;
  name: string;
  description: string;
  emoji: string;
  features: string[];
  suggestedPrompt?: string;
  testId: string;
}

const STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional charm with timeless decorations.',
    emoji: '🎄',
    features: [
      'Red & green color scheme',
      'Wreaths on doors',
      'String lights on roofline',
      'Traditional ornaments',
    ],
    suggestedPrompt: 'Add classic Christmas decorations with red bows, wreath, and warm white lights',
    testId: 'style-classic',
  },
  {
    id: 'modern',
    name: 'Modern Minimalist',
    description: 'Elegant and sophisticated with clean lines.',
    emoji: '✨',
    features: [
      'White & silver palette',
      'Geometric patterns',
      'Minimal decorations',
      'LED lighting',
    ],
    suggestedPrompt: 'Create a modern minimalist Christmas look with white and silver geometric patterns',
    testId: 'style-modern',
  },
  {
    id: 'over_the_top',
    name: 'Over-the-Top',
    description: 'Maximum festivity! Go big or go home.',
    emoji: '🎅',
    features: [
      'Inflatable displays',
      'Synchronized lights',
      'Yard decorations',
      'Animated characters',
    ],
    suggestedPrompt: 'Go all out with giant inflatables, animated lights, and yard decorations that light up the neighborhood',
    testId: 'style-over-the-top',
  },
  {
    id: 'pop_culture',
    name: '✨ Pop Culture Christmas',
    description: 'Trendy & fun with memes, K-pop & collector vibes.',
    emoji: '🌟',
    features: [
      'Labubu Santa & designer toys',
      'K-pop Christmas aesthetics',
      'Gen-Z trendy decorations',
      'Meme-worthy displays',
    ],
    suggestedPrompt: 'Decorate with trendy collector items, cute Labubu Santa figures, K-pop inspired colors and motifs, and Gen-Z aesthetic Christmas vibes',
    testId: 'style-pop-culture',
  },
  {
    id: 'glam_gold',
    name: '💎 Glam & Gold',
    description: 'Luxe and glamorous with gold, white & sparkles.',
    emoji: '👑',
    features: [
      'Gold & white color scheme',
      'Luxury garland & bows',
      'Crystal-like decorations',
      'Sophisticated sparkle',
    ],
    suggestedPrompt: 'Transform your home into a luxury palace with gold accents, white decorations, sparkling lights, and elegant garland',
    testId: 'style-glam-gold',
  },
  {
    id: 'cyber_christmas',
    name: '🌐 Cyber Christmas',
    description: 'Futuristic with neon lights & tech vibes.',
    emoji: '🔮',
    features: [
      'Neon purple & cyan lights',
      'Holographic decorations',
      'Tech-inspired patterns',
      'Glow-in-the-dark elements',
    ],
    suggestedPrompt: 'Create a futuristic cyberpunk Christmas with neon purple and cyan lights, holographic decorations, and electric tech vibes',
    testId: 'style-cyber-christmas',
  },
  {
    id: 'cozy_rustic',
    name: '🔥 Cozy & Rustic',
    description: 'Warm and inviting with cabin charm.',
    emoji: '🏡',
    features: [
      'Wood & plaid elements',
      'Warm fireplace glow',
      'Natural greenery',
      'Comfort-focused design',
    ],
    suggestedPrompt: 'Create a cozy cabin aesthetic with wooden decorations, plaid accents, warm fireplace, hot cocoa vibes, and natural greenery',
    testId: 'style-cozy-rustic',
  },
];

interface StyleSelectorProps {
  selectedStyle: HolidayStyle | null;
  onStyleChange: (style: HolidayStyle) => void;
  disabled?: boolean;
}

export default function StyleSelector({
  selectedStyle,
  onStyleChange,
  disabled = false,
}: StyleSelectorProps) {
  // Memoize selected option to avoid O(n) .find() calls on every render
  const selectedOption = useMemo(
    () => STYLE_OPTIONS.find((s) => s.id === selectedStyle),
    [selectedStyle]
  );

  return (
    <div
      data-testid="style-selector"
      className={`w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl font-bold text-text-light dark:text-text-dark mb-2">
          <span className="text-accent-light dark:text-accent-dark">🎨</span> Choose Your Style
        </h2>
        <p className="text-subtle-light dark:text-subtle-dark max-w-sm mx-auto">
          From timeless classics to trendy vibes, pick your perfect holiday theme.
        </p>
      </div>

      {/* Style Cards Grid - Vertical layout (like the design) */}
      <div className="space-y-4">
        {STYLE_OPTIONS.map((style) => {
          const isSelected = selectedStyle === style.id;

          return (
            <button
              key={style.id}
              data-testid={style.testId}
              onClick={() => onStyleChange(style.id)}
              disabled={disabled}
              className={`w-full bg-surface-light dark:bg-surface-dark rounded-xl p-5 shadow-card dark:shadow-card-dark transition-all duration-300 text-left ${
                isSelected
                  ? 'border-2 border-primary ring-4 ring-primary/20'
                  : 'border border-gray-200/50 dark:border-gray-700/50 hover:border-accent-light dark:hover:border-accent-dark hover:shadow-lg'
              }`}
            >
              {/* Content wrapper */}
              <div className="flex items-start gap-4">
                {/* Emoji icon */}
                <div className="text-5xl flex-shrink-0">{style.emoji}</div>

                {/* Text content */}
                <div className="flex-grow">
                  {/* Title and Description */}
                  <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-1">
                    {style.name}
                  </h3>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mb-3">
                    {style.description}
                  </p>

                  {/* Features List */}
                  <ul className="space-y-1">
                    {style.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-sm text-text-light dark:text-text-dark"
                      >
                        <span className="material-icons text-success text-base">
                          check_circle
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selection Confirmation with Suggested Prompt */}
      {selectedOption && (
        <div className="mt-6 space-y-4 animate-fade-in">
          {/* Confirmation Message */}
          <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/50 border border-green-200 dark:border-green-700">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">{selectedOption.emoji}</span>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                <strong>{selectedOption.name}</strong> style
                selected! Ready to generate your decoration.
              </p>
            </div>
          </div>

          {/* Suggested Prompt */}
          {selectedOption.suggestedPrompt && (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50">
              <div className="flex gap-3">
                <span className="text-xl flex-shrink-0">💡</span>
                <div>
                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1">
                    AI WILL USE THIS PROMPT
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-300 italic">
                    "{selectedOption.suggestedPrompt}"
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
