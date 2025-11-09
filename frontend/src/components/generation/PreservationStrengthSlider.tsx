/**
 * Preservation Strength Slider Component (v2 enhancement)
 *
 * Allows users to control transformation intensity:
 * - 0.0-0.4: Dramatic transformation
 * - 0.4-0.6: Balanced transformation (default)
 * - 0.6-1.0: Subtle refinement
 *
 * Based on Yarda v2's preservation strength controls
 */

import React from 'react';

interface PreservationStrengthSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

const getPreservationLabel = (value: number): string => {
  if (value < 0.4) return 'Dramatic';
  if (value < 0.6) return 'Balanced';
  return 'Subtle';
};

const getPreservationDescription = (value: number): string => {
  if (value < 0.4) {
    return 'Complete redesign with bold changes for maximum visual impact';
  }
  if (value < 0.6) {
    return 'Balance enhancement with preservation of existing character';
  }
  return 'Minimal changes focused on refinement rather than replacement';
};

const getPreservationColor = (value: number): string => {
  if (value < 0.4) return 'text-purple-600 dark:text-purple-400';
  if (value < 0.6) return 'text-blue-600 dark:text-blue-400';
  return 'text-green-600 dark:text-green-400';
};

export function PreservationStrengthSlider({
  value,
  onChange,
  disabled = false,
  className = '',
}: PreservationStrengthSliderProps) {
  const label = getPreservationLabel(value);
  const description = getPreservationDescription(value);
  const colorClass = getPreservationColor(value);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
          Transformation Intensity
        </label>
        <span className={`text-sm font-semibold ${colorClass}`}>
          {label}
        </span>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className={`
            w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
            dark:bg-gray-700
            disabled:opacity-50 disabled:cursor-not-allowed

            /* Slider thumb styling */
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-gradient-to-br
            [&::-webkit-slider-thumb]:from-blue-500
            [&::-webkit-slider-thumb]:to-blue-600
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:hover:shadow-lg
            [&::-webkit-slider-thumb]:transition-all

            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-gradient-to-br
            [&::-moz-range-thumb]:from-blue-500
            [&::-moz-range-thumb]:to-blue-600
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:shadow-md
            [&::-moz-range-thumb]:hover:shadow-lg
            [&::-moz-range-thumb]:transition-all
          `}
        />

        {/* Scale markers */}
        <div className="flex justify-between mt-1 px-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">0.0</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">0.5</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">1.0</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        {description}
      </p>

      {/* Visual guide */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div
          className={`p-2 rounded border ${
            value < 0.4
              ? 'border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/20'
              : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
          }`}
        >
          <div className="font-semibold text-purple-600 dark:text-purple-400">
            Dramatic
          </div>
          <div className="text-gray-600 dark:text-gray-400 mt-1">0.0 - 0.4</div>
        </div>

        <div
          className={`p-2 rounded border ${
            value >= 0.4 && value < 0.6
              ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
              : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
          }`}
        >
          <div className="font-semibold text-blue-600 dark:text-blue-400">
            Balanced
          </div>
          <div className="text-gray-600 dark:text-gray-400 mt-1">0.4 - 0.6</div>
        </div>

        <div
          className={`p-2 rounded border ${
            value >= 0.6
              ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
              : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
          }`}
        >
          <div className="font-semibold text-green-600 dark:text-green-400">
            Subtle
          </div>
          <div className="text-gray-600 dark:text-gray-400 mt-1">0.6 - 1.0</div>
        </div>
      </div>
    </div>
  );
}
