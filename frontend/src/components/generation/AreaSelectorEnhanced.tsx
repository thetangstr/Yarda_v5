/**
 * Enhanced Area Selector Component
 *
 * Beautiful multi-area selection with custom prompts and suggested prompts.
 * Ported from Yarda v2 SuperMinimalYardSelector.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { YardArea } from '@/types/generation';

interface YardAreaState {
  area: YardArea;
  selected: boolean;
  customPrompt: string;
}

interface AreaSelectorEnhancedProps {
  areas: YardAreaState[];
  onToggle: (area: YardArea) => void;
  onPromptChange: (area: YardArea, prompt: string) => void;
  mode?: 'single' | 'multi';
  disabled?: boolean;
  error?: string;
}

const suggestedPrompts: Record<YardArea, string[]> = {
  [YardArea.FrontYard]: [
    "colorful flower beds with seasonal blooms",
    "drought-tolerant native plants with decorative rocks",
    "modern minimalist design with ornamental grasses",
    "welcoming pathway with symmetrical plantings",
    "vibrant perennial garden with butterfly-friendly flowers"
  ],
  [YardArea.Backyard]: [
    "entertainment area with patio and outdoor seating",
    "vegetable garden with raised beds",
    "zen meditation garden with water feature",
    "privacy screening with tall shrubs and trees",
    "outdoor dining space with pergola and ambient lighting"
  ],
  [YardArea.Walkway]: [
    "curved pathway with colorful border plants",
    "straight walkway with symmetrical hedges",
    "stepping stone path through ground cover",
    "illuminated pathway with solar lights",
    "rustic gravel path with native wildflowers"
  ],
  [YardArea.Patio]: [
    "outdoor dining area with modern furniture",
    "cozy seating nook with shade structure",
    "entertaining space with ambient lighting",
    "Mediterranean-style patio with potted plants",
    "contemporary patio with integrated water feature"
  ],
  [YardArea.PoolArea]: [
    "tropical landscaping with palm trees",
    "modern pool deck with clean lines",
    "privacy screening with tall plants",
    "outdoor shower area",
    "poolside lounge with shade structures"
  ]
};

const AreaSelectorEnhanced: React.FC<AreaSelectorEnhancedProps> = ({
  areas,
  onToggle,
  onPromptChange,
  mode = 'multi',
  disabled = false,
  error
}) => {
  const getIcon = (area: YardArea): string => {
    switch (area) {
      case YardArea.FrontYard:
        return '🏠';
      case YardArea.Backyard:
        return '🌲';
      case YardArea.Walkway:
        return '🚶';
      case YardArea.Patio:
        return '🪑';
      case YardArea.PoolArea:
        return '🏊';
      default:
        return '🏡';
    }
  };

  const getPromptEmoji = (prompt: string): string => {
    const lowerPrompt = prompt.toLowerCase();

    // Flower-related
    if (lowerPrompt.includes('flower') || lowerPrompt.includes('blooms')) return '🌸';
    if (lowerPrompt.includes('rose')) return '🌹';

    // Plant-related
    if (lowerPrompt.includes('native plants') || lowerPrompt.includes('drought')) return '🌵';
    if (lowerPrompt.includes('grass') || lowerPrompt.includes('lawn')) return '🌿';
    if (lowerPrompt.includes('tree')) return '🌳';
    if (lowerPrompt.includes('fern') || lowerPrompt.includes('shade')) return '🍃';

    // Garden features
    if (lowerPrompt.includes('pathway') || lowerPrompt.includes('walkway')) return '🚶';
    if (lowerPrompt.includes('water') || lowerPrompt.includes('fountain')) return '⛲';
    if (lowerPrompt.includes('rock') || lowerPrompt.includes('stone')) return '🪨';
    if (lowerPrompt.includes('patio') || lowerPrompt.includes('seating')) return '🪑';
    if (lowerPrompt.includes('dining')) return '🍽️';

    // Entertainment features
    if (lowerPrompt.includes('entertainment') || lowerPrompt.includes('outdoor living')) return '🎭';
    if (lowerPrompt.includes('play') || lowerPrompt.includes('children')) return '🎮';
    if (lowerPrompt.includes('vegetable') || lowerPrompt.includes('garden')) return '🥬';
    if (lowerPrompt.includes('zen') || lowerPrompt.includes('meditation')) return '🧘';

    // Lighting and ambiance
    if (lowerPrompt.includes('light') || lowerPrompt.includes('solar')) return '💡';
    if (lowerPrompt.includes('pergola') || lowerPrompt.includes('shade')) return '⛱️';

    // Privacy and screening
    if (lowerPrompt.includes('privacy') || lowerPrompt.includes('screening')) return '🌲';
    if (lowerPrompt.includes('hedge')) return '🌳';

    // Design styles
    if (lowerPrompt.includes('modern') || lowerPrompt.includes('minimalist')) return '✨';
    if (lowerPrompt.includes('rustic') || lowerPrompt.includes('gravel')) return '🏞️';
    if (lowerPrompt.includes('curved') || lowerPrompt.includes('symmetrical')) return '〰️';

    // Default
    return '🌱';
  };

  const getGradient = (area: YardArea, selected: boolean) => {
    const gradients = {
      [YardArea.FrontYard]: selected
        ? 'bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-300'
        : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200',
      [YardArea.Backyard]: selected
        ? 'bg-gradient-to-br from-emerald-50 to-teal-100 border-emerald-300'
        : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200',
      [YardArea.Walkway]: selected
        ? 'bg-gradient-to-br from-amber-50 to-orange-100 border-amber-300'
        : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200',
      [YardArea.Patio]: selected
        ? 'bg-gradient-to-br from-purple-50 to-pink-100 border-purple-300'
        : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200',
      [YardArea.PoolArea]: selected
        ? 'bg-gradient-to-br from-cyan-50 to-blue-100 border-cyan-300'
        : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
    };
    return gradients[area];
  };

  const getAreaName = (area: YardArea): string => {
    switch (area) {
      case YardArea.FrontYard: return 'Front Yard';
      case YardArea.Backyard: return 'Back Yard';
      case YardArea.Walkway: return 'Walkway';
      case YardArea.Patio: return 'Patio';
      case YardArea.PoolArea: return 'Pool Area';
      default: return area;
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Landscape Areas</h3>
        <p className="text-gray-600">
          {mode === 'multi' ? 'Select the areas you\'d like to transform' : 'Select one area to transform'}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      {/* Beautiful grid layout */}
      <div className="grid grid-cols-2 gap-6">
        {areas.map((areaState) => {
          const { area, selected, customPrompt } = areaState;

          return (
            <motion.div
              key={area}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative">
                <button
                  type="button"
                  onClick={() => !disabled && onToggle(area)}
                  disabled={disabled}
                  className={`
                    relative w-full p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border-2 transition-all duration-300 group
                    ${getGradient(area, selected)}
                    hover:shadow-lg hover:scale-105 hover:-translate-y-1
                    ${selected ? 'shadow-xl ring-4 ring-opacity-20' : 'hover:border-gray-300'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {/* Selection indicator */}
                  <AnimatePresence>
                    {selected && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-green-500"
                      >
                        <Check className="w-4 h-4 text-green-500" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Content */}
                  <div className="flex flex-col items-center space-y-4">
                    <div className={`
                      p-4 rounded-2xl transition-all duration-300
                      ${selected
                        ? 'bg-white bg-opacity-70 shadow-md'
                        : 'bg-white bg-opacity-50 group-hover:bg-opacity-70'
                      }
                    `}>
                      <div className="text-4xl sm:text-5xl transition-transform duration-300 group-hover:scale-110">
                        {getIcon(area)}
                      </div>
                    </div>
                    <div className="text-center">
                      <h4 className={`
                        font-semibold text-lg transition-colors duration-300
                        ${selected ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'}
                      `}>
                        {getAreaName(area)}
                      </h4>
                    </div>
                  </div>
                </button>

                {/* Custom prompt - elegantly positioned */}
                <AnimatePresence>
                  {selected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 space-y-3">
                        {/* Suggested prompts */}
                        {suggestedPrompts[area] && (
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                              <span className="text-sm">✨</span>
                              Suggested prompts (click to add, max 3):
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {suggestedPrompts[area].map((prompt, idx) => {
                                // Check if this prompt is already in the customPrompt
                                const isSelected = customPrompt.toLowerCase().includes(prompt.toLowerCase());
                                // Count how many prompts are currently selected (split by comma)
                                const selectedCount = customPrompt.trim() ? customPrompt.split(',').filter(p => p.trim()).length : 0;
                                const canAdd = selectedCount < 3;

                                return (
                                  <button
                                    type="button"
                                    key={idx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (disabled) return;

                                      if (isSelected) {
                                        // Remove this prompt
                                        const prompts = customPrompt.split(',').map(p => p.trim()).filter(p => p.toLowerCase() !== prompt.toLowerCase());
                                        onPromptChange(area, prompts.join(', '));
                                      } else if (canAdd) {
                                        // Add this prompt (max 3)
                                        const current = customPrompt.trim();
                                        const newPrompt = current ? `${current}, ${prompt}` : prompt;
                                        onPromptChange(area, newPrompt);
                                      }
                                    }}
                                    disabled={(!isSelected && !canAdd) || disabled}
                                    className={`px-3 py-1.5 text-xs rounded-full
                                             transition-all duration-200 shadow-sm hover:shadow-md
                                             font-medium flex items-center gap-1.5
                                             ${isSelected
                                               ? 'bg-blue-500 text-white border-2 border-blue-600 hover:bg-blue-600'
                                               : canAdd
                                                 ? 'bg-white border border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700'
                                                 : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                                             }`}
                                  >
                                    <span className="text-sm">{getPromptEmoji(prompt)}</span>
                                    {prompt}
                                    {isSelected && <span className="ml-1">✓</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Custom prompt input */}
                        <div className="relative">
                          <textarea
                            value={customPrompt}
                            onChange={(e) => !disabled && onPromptChange(area, e.target.value)}
                            placeholder={`Describe your vision for ${getAreaName(area).toLowerCase()}...`}
                            disabled={disabled}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl
                                     focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100
                                     resize-none text-sm text-gray-700 placeholder-gray-400
                                     transition-all duration-200 bg-white shadow-sm
                                     disabled:bg-gray-100 disabled:cursor-not-allowed"
                            rows={3}
                          />
                          <div className="absolute top-3 right-3 opacity-30 text-base">
                            ✨
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Selected count indicator */}
      <div className="flex items-center justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full border border-blue-200"
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-700">
              {areas.filter(a => a.selected).length} area{areas.filter(a => a.selected).length !== 1 ? 's' : ''} selected
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AreaSelectorEnhanced;
