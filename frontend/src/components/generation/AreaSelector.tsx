/**
 * AreaSelector Component
 *
 * Yard area selection component with single-select and multi-select modes.
 *
 * Requirements:
 * - T019: Single-select mode for US1 (trial users)
 * - T039: Multi-select mode for US2 (token/subscription users)
 * - FR-003: Area selection with visual indicators
 *
 * Features:
 * - Single-select mode (radio buttons) for US1
 * - Multi-select mode (checkboxes) for US2
 * - 6 yard area types
 * - Visual area descriptions and icons
 * - Accessible keyboard navigation
 */

import React from 'react';
import { YardArea } from '@/types/generation';

interface AreaOption {
  value: YardArea;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const AREA_OPTIONS: AreaOption[] = [
  {
    value: YardArea.FrontYard,
    label: 'Front Yard',
    description: 'Curb appeal and welcoming entrance',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    value: YardArea.Backyard,
    label: 'Backyard',
    description: 'Private outdoor living space',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    value: YardArea.Walkway,
    label: 'Walkway',
    description: 'Paths and entry walkways',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    value: YardArea.Patio,
    label: 'Patio',
    description: 'Outdoor seating and dining',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    value: YardArea.PoolArea,
    label: 'Pool Area',
    description: 'Poolside landscaping',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
      </svg>
    ),
  },
];

interface AreaSelectorProps {
  /** Selected area(s) */
  value: YardArea | YardArea[];
  /** Callback when selection changes */
  onChange: (value: YardArea | YardArea[]) => void;
  /** Single-select (US1) or multi-select (US2) mode */
  mode?: 'single' | 'multiple';
  /** Whether input is disabled */
  disabled?: boolean;
  /** Maximum areas for multi-select (default 5) */
  maxAreas?: number;
  /** Error message to display */
  error?: string;
  /** Custom CSS classes */
  className?: string;
}

export const AreaSelector: React.FC<AreaSelectorProps> = ({
  value,
  onChange,
  mode = 'single',
  disabled = false,
  maxAreas = 5,
  error,
  className = '',
}) => {
  const selectedAreas = Array.isArray(value) ? value : [value];
  const isSingleSelect = mode === 'single';

  const handleSelect = (area: YardArea) => {
    if (disabled) return;

    if (isSingleSelect) {
      onChange(area);
    } else {
      // Multi-select mode
      if (selectedAreas.includes(area)) {
        // Deselect
        const newSelection = selectedAreas.filter((a) => a !== area);
        onChange(newSelection.length === 0 ? [] : newSelection);
      } else {
        // Select if under max
        if (selectedAreas.length < maxAreas) {
          onChange([...selectedAreas, area]);
        }
      }
    }
  };

  const isSelected = (area: YardArea) => selectedAreas.includes(area);
  const isMaxReached = !isSingleSelect && selectedAreas.length >= maxAreas;

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-neutral-900 mb-2">
        {isSingleSelect ? 'Landscape Area' : 'Landscape Areas'}
        {!isSingleSelect && (
          <span className="ml-2 text-neutral-500 font-normal">
            ({selectedAreas.length}/{maxAreas} selected)
          </span>
        )}
      </label>

      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
        role={isSingleSelect ? 'radiogroup' : 'group'}
        aria-label="Landscape area selection"
      >
        {AREA_OPTIONS.map((option) => {
          const selected = isSelected(option.value);
          const canSelect = !disabled && (!isMaxReached || selected);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              disabled={!canSelect}
              className={`
                relative flex items-start gap-4 p-4 border-2 rounded-lg
                transition-all duration-200 text-left
                ${selected
                  ? 'border-brand-green bg-brand-sage ring-2 ring-brand-green ring-opacity-50'
                  : 'border-neutral-300 bg-white hover:border-brand-green hover:bg-brand-sage'
                }
                ${!canSelect ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2
              `}
              role={isSingleSelect ? 'radio' : 'checkbox'}
              aria-checked={selected}
              data-testid={`area-option-${option.value}`}
            >
              {/* Icon */}
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                  ${selected ? 'bg-brand-green text-white' : 'bg-neutral-100 text-neutral-600'}
                `}
              >
                {option.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${selected ? 'text-brand-dark-green' : 'text-neutral-900'}`}>
                    {option.label}
                  </span>
                  {selected && (
                    <svg className="w-5 h-5 text-brand-green flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <p className="text-sm text-neutral-600 mt-1">{option.description}</p>
              </div>

              {/* Selection indicator (radio/checkbox) */}
              <div className="flex-shrink-0">
                {isSingleSelect ? (
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                      ${selected ? 'border-brand-green' : 'border-neutral-400'}
                    `}
                  >
                    {selected && <div className="w-3 h-3 rounded-full bg-brand-green" />}
                  </div>
                ) : (
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center
                      ${selected ? 'border-brand-green bg-brand-green' : 'border-neutral-400 bg-white'}
                    `}
                  >
                    {selected && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm text-error-600" role="alert" data-testid="area-selector-error">
          {error}
        </p>
      )}

      {/* Helper text */}
      {!error && !isSingleSelect && isMaxReached && (
        <p className="mt-2 text-sm text-warning-600">
          Maximum {maxAreas} areas selected
        </p>
      )}

      {!error && !isSingleSelect && !isMaxReached && selectedAreas.length > 0 && (
        <p className="mt-2 text-xs text-neutral-500">
          You can select up to {maxAreas} areas per generation
        </p>
      )}
    </div>
  );
};

export default AreaSelector;
