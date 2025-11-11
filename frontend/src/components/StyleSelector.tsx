'use client';

/**
 * Style Selector Component
 *
 * Allows users to choose their holiday decoration style:
 * - Classic: Traditional red/green with wreaths and string lights
 * - Modern: Minimalist whites/silvers with geometric patterns
 * - Over-the-Top: Maximum festivity with inflatables and synchronized lights
 *
 * Feature: 007-holiday-decorator (T026)
 * User Story 1: New User Discovery & First Generation
 */

import React from 'react';

// Type definition matching backend contract
export type HolidayStyle = 'classic' | 'modern' | 'over_the_top';

interface StyleOption {
  id: HolidayStyle;
  name: string;
  description: string;
  icon: string;
  emoji: string;
  features: string[];
  testId: string;
}

const STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional holiday charm with timeless decorations',
    icon: '🎄',
    emoji: '🎁',
    features: [
      'Red & green color scheme',
      'Wreaths on doors',
      'String lights on roofline',
      'Traditional ornaments',
    ],
    testId: 'style-classic',
  },
  {
    id: 'modern',
    name: 'Modern Minimalist',
    description: 'Elegant and sophisticated with clean lines',
    icon: '✨',
    emoji: '❄️',
    features: [
      'White & silver palette',
      'Geometric patterns',
      'Minimal decorations',
      'LED lighting',
    ],
    testId: 'style-modern',
  },
  {
    id: 'over_the_top',
    name: 'Over-the-Top',
    description: 'Maximum festivity! Go big or go home',
    icon: '🎅',
    emoji: '🦌',
    features: [
      'Inflatable displays',
      'Synchronized lights',
      'Yard decorations',
      'Animated characters',
    ],
    testId: 'style-over-the-top',
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
  return (
    <div
      data-testid="style-selector"
      className={`
        w-full max-w-5xl mx-auto
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      {/* Header */}
      <div className="mb-6 text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Your Decoration Style
        </h3>
        <p className="text-gray-600">
          Select the holiday vibe that matches your home's personality
        </p>
      </div>

      {/* Style Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {STYLE_OPTIONS.map((style) => {
          const isSelected = selectedStyle === style.id;

          return (
            <button
              key={style.id}
              data-testid={style.testId}
              onClick={() => onStyleChange(style.id)}
              disabled={disabled}
              className={`
                relative p-6 rounded-xl text-left
                border-2 transition-all duration-200
                hover:scale-105 hover:shadow-xl
                disabled:cursor-not-allowed
                ${
                  isSelected
                    ? 'border-green-500 bg-green-50 ring-4 ring-green-200 shadow-lg scale-105'
                    : 'border-gray-200 bg-white hover:border-green-300'
                }
              `}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <svg
                    className="w-6 h-6 text-white"
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
              )}

              {/* Icon */}
              <div className="mb-4 text-center">
                <span className="text-6xl">{style.icon}</span>
              </div>

              {/* Title */}
              <h4
                className={`
                  text-xl font-bold mb-2 text-center
                  ${isSelected ? 'text-green-700' : 'text-gray-900'}
                `}
              >
                {style.name}
              </h4>

              {/* Description */}
              <p className="text-sm text-gray-600 text-center mb-4">
                {style.description}
              </p>

              {/* Features List */}
              <ul className="space-y-2">
                {style.features.map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <span className="text-green-500">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Emoji decoration */}
              <div className="mt-4 text-center text-2xl opacity-70">
                {style.emoji}
              </div>

              {/* Hover effect gradient */}
              <div
                className={`
                  absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200
                  ${isSelected ? 'opacity-0' : 'hover:opacity-10'}
                `}
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(52, 211, 153, 0.3) 100%)',
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Selection Confirmation */}
      {selectedStyle && (
        <div className="mt-6 p-4 rounded-lg bg-green-50 border border-green-200 animate-fade-in">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">
              {STYLE_OPTIONS.find((s) => s.id === selectedStyle)?.icon}
            </span>
            <p className="text-sm font-medium text-green-800">
              <strong>
                {STYLE_OPTIONS.find((s) => s.id === selectedStyle)?.name}
              </strong>{' '}
              style selected! Ready to generate your decoration.
            </p>
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="mt-8 p-4 rounded-lg bg-blue-50 border border-blue-200">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div className="text-sm text-blue-800">
            <strong>Not sure which style to choose?</strong>
            <p className="mt-1">
              Classic works great for traditional homes, Modern suits contemporary architecture,
              and Over-the-Top is perfect if you want to be the talk of the neighborhood! You can
              try different styles using your free credits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
