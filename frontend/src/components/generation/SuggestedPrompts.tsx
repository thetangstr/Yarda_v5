/**
 * Suggested Prompts Component (v2 enhancement)
 *
 * Provides pre-written prompt suggestions based on:
 * - Yard area (front_yard, backyard, etc.)
 * - Design style (modern_minimalist, japanese_zen, etc.)
 *
 * Based on Yarda v2's LandscapeStudioEnhanced.tsx suggested prompts
 */

import React from 'react';
import { YardArea, DesignStyle } from '@/types/generation';

interface SuggestedPromptsProps {
  area: YardArea;
  style: DesignStyle;
  onSelect: (prompt: string) => void;
  className?: string;
}

// Suggested prompts by area type (from v2)
const AREA_PROMPTS: Record<YardArea, string[]> = {
  [YardArea.FrontYard]: [
    'Colorful flower beds with seasonal blooms',
    'Modern entrance pathway with lighting',
    'Low-maintenance drought-resistant plants',
    'Symmetrical design with focal point',
    'Add a water feature near the entrance',
  ],
  [YardArea.Backyard]: [
    'Entertainment area with patio and outdoor seating',
    'Children-friendly play space with soft landscaping',
    'Vegetable garden with raised beds',
    'Privacy screening with tall hedges or trees',
    'Fire pit with seating area',
    'Pool-adjacent tropical planting',
  ],
  [YardArea.Patio]: [
    'Outdoor dining area with modern furniture',
    'Cozy seating nook with ambient lighting',
    'Mediterranean-style patio with potted plants',
    'Contemporary patio with integrated water feature',
  ],
  [YardArea.Walkway]: [
    'Curved pathway with border plantings',
    'Stone or paver walkway with lighting',
    'Lined with fragrant herbs and flowers',
    'Stepping stones through low ground cover',
  ],
  [YardArea.PoolArea]: [
    'Tropical resort-style planting',
    'Low-maintenance poolside landscaping',
    'Privacy screening around perimeter',
    'Shade structures with climbing vines',
  ],
};

// Style-specific prompt enhancements (v2 enhancement)
const STYLE_KEYWORDS: Record<DesignStyle, string[]> = {
  [DesignStyle.ModernMinimalist]: [
    'clean geometric lines',
    'structured plantings',
    'minimalist water feature',
    'simple hardscaping',
  ],
  [DesignStyle.CaliforniaNative]: [
    'drought-tolerant natives',
    'wildlife-friendly',
    'dry creek bed',
    'native wildflowers',
  ],
  [DesignStyle.JapaneseZen]: [
    'bamboo groves',
    'stone lanterns',
    'koi pond',
    'raked gravel',
  ],
  [DesignStyle.EnglishGarden]: [
    'cottage flowers',
    'climbing roses',
    'brick pathways',
    'boxwood hedges',
  ],
  [DesignStyle.DesertLandscape]: [
    'agave and cacti',
    'decomposed granite',
    'boulder accents',
    'xeriscape design',
  ],
  [DesignStyle.Mediterranean]: [
    'terracotta planters',
    'olive trees',
    'lavender borders',
    'gravel pathways',
  ],
  [DesignStyle.TropicalResort]: [
    'palm trees',
    'lush foliage',
    'tiki torches',
    'tropical flowers',
  ],
};

export function SuggestedPrompts({
  area,
  style,
  onSelect,
  className = '',
}: SuggestedPromptsProps) {
  const areaPrompts = AREA_PROMPTS[area] || [];
  const styleKeywords = STYLE_KEYWORDS[style] || [];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Area-specific suggestions */}
      {areaPrompts.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">💡</span>
            <h4 className="text-base font-bold text-gray-900">
              Suggestions for {area.replace('_', ' ')}
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {areaPrompts.map((prompt, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onSelect(prompt)}
                className="
                  px-4 py-2.5 text-sm font-medium rounded-lg
                  bg-white hover:bg-blue-600
                  text-blue-700 hover:text-white
                  border-2 border-blue-400 hover:border-blue-600
                  transition-all duration-200
                  hover:shadow-lg hover:scale-105
                  active:scale-95
                "
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Style-specific keywords */}
      {styleKeywords.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🎨</span>
            <h4 className="text-base font-bold text-gray-900">
              Style Elements
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {styleKeywords.map((keyword, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onSelect(keyword)}
                className="
                  px-4 py-2.5 text-sm font-medium rounded-lg
                  bg-white hover:bg-purple-600
                  text-purple-700 hover:text-white
                  border-2 border-purple-400 hover:border-purple-600
                  transition-all duration-200
                  hover:shadow-lg hover:scale-105
                  active:scale-95
                "
              >
                {keyword}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
        <span className="text-xl">👆</span>
        <p className="text-sm font-medium text-gray-700">
          Click any suggestion to add it to your custom prompt
        </p>
      </div>
    </div>
  );
}
