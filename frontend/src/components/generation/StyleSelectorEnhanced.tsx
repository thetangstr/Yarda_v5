/**
 * Enhanced Style Selector Component
 *
 * Beautiful multi-style selection with emoji icons and color-coded gradients.
 * Ported from Yarda v2 SuperMinimalStyleSelector.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { DesignStyle, type LandscapeStyle, YardArea } from '@/types/generation';
import { SuggestedPrompts } from './SuggestedPrompts';

interface StyleSelectorEnhancedProps {
  value: LandscapeStyle;
  onChange: (value: LandscapeStyle) => void;
  customPrompt?: string;
  onCustomPromptChange?: (value: string) => void;
  mode?: 'single' | 'multi';
  selectedStyles?: LandscapeStyle[];
  onStylesChange?: (styles: LandscapeStyle[]) => void;
  disabled?: boolean;
  error?: string;
  /** Selected yard area for suggested prompts (v2 enhancement) */
  selectedArea?: YardArea;
}

const StyleSelectorEnhanced: React.FC<StyleSelectorEnhancedProps> = ({
  value,
  onChange,
  customPrompt = '',
  onCustomPromptChange,
  mode = 'single',
  selectedStyles = [],
  onStylesChange,
  disabled = false,
  error,
  selectedArea
}) => {
  const getStyleIcon = (styleId: DesignStyle): string => {
    const iconMap: Record<DesignStyle, string> = {
      [DesignStyle.ModernMinimalist]: '🏠',
      [DesignStyle.CaliforniaNative]: '🌲',
      [DesignStyle.JapaneseZen]: '🎋',
      [DesignStyle.EnglishGarden]: '🌸',
      [DesignStyle.DesertLandscape]: '🌵',
      [DesignStyle.Mediterranean]: '🌊',
      [DesignStyle.TropicalResort]: '🌴',
    };
    return iconMap[styleId] || '✨';
  };

  const getStyleGradient = (styleId: DesignStyle, selected: boolean) => {
    const gradients: Record<DesignStyle, string> = {
      [DesignStyle.ModernMinimalist]: selected
        ? 'bg-gradient-to-br from-slate-50 to-gray-100 border-slate-300'
        : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200',
      [DesignStyle.CaliforniaNative]: selected
        ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-300'
        : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200',
      [DesignStyle.JapaneseZen]: selected
        ? 'bg-gradient-to-br from-green-50 to-teal-100 border-teal-300'
        : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200',
      [DesignStyle.EnglishGarden]: selected
        ? 'bg-gradient-to-br from-pink-50 to-rose-100 border-pink-300'
        : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200',
      [DesignStyle.DesertLandscape]: selected
        ? 'bg-gradient-to-br from-orange-50 to-amber-100 border-orange-300'
        : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200',
      [DesignStyle.Mediterranean]: selected
        ? 'bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-300'
        : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200',
      [DesignStyle.TropicalResort]: selected
        ? 'bg-gradient-to-br from-lime-50 to-green-100 border-lime-300'
        : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200',
    };
    return gradients[styleId];
  };

  const getStyleName = (styleId: DesignStyle): string => {
    const names: Record<DesignStyle, string> = {
      [DesignStyle.ModernMinimalist]: 'Modern Minimalist',
      [DesignStyle.CaliforniaNative]: 'California Native',
      [DesignStyle.JapaneseZen]: 'Japanese Zen',
      [DesignStyle.EnglishGarden]: 'English Garden',
      [DesignStyle.DesertLandscape]: 'Desert Landscape',
      [DesignStyle.Mediterranean]: 'Mediterranean',
      [DesignStyle.TropicalResort]: 'Tropical Resort',
    };
    return names[styleId];
  };

  const getStyleDescription = (styleId: DesignStyle): string => {
    const descriptions: Record<DesignStyle, string> = {
      [DesignStyle.ModernMinimalist]: 'Clean lines and contemporary design',
      [DesignStyle.CaliforniaNative]: 'Drought-tolerant native plants',
      [DesignStyle.JapaneseZen]: 'Tranquil bamboo and stone features',
      [DesignStyle.EnglishGarden]: 'Lush flowers and cottage charm',
      [DesignStyle.DesertLandscape]: 'Cacti and xeriscaping beauty',
      [DesignStyle.Mediterranean]: 'Vibrant colors and terracotta accents',
      [DesignStyle.TropicalResort]: 'Palm trees and exotic foliage',
    };
    return descriptions[styleId];
  };

  // Only show 3 core styles in UI (backend/DB support all 7)
  const styles = [
    DesignStyle.ModernMinimalist,
    DesignStyle.CaliforniaNative,
    DesignStyle.EnglishGarden,
  ];

  const handleStyleToggle = (styleId: DesignStyle) => {
    if (disabled) return;

    if (mode === 'single') {
      onChange(styleId);
    } else if (mode === 'multi' && onStylesChange) {
      if (selectedStyles.includes(styleId)) {
        onStylesChange(selectedStyles.filter(id => id !== styleId));
      } else if (selectedStyles.length < 3) {
        onStylesChange([...selectedStyles, styleId]);
      }
    }
  };

  const isSelected = (styleId: DesignStyle): boolean => {
    if (mode === 'single') {
      return value === styleId;
    } else {
      return selectedStyles.includes(styleId);
    }
  };

  const getSelectionIndex = (styleId: DesignStyle): number => {
    if (mode === 'multi') {
      return selectedStyles.indexOf(styleId);
    }
    return -1;
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Design Style</h3>
        <p className="text-gray-600">
          {mode === 'multi' ? 'Select up to 3 styles that inspire you' : 'Select your preferred design style'}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      {/* Style grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {styles.map((styleId) => {
          const selected = isSelected(styleId);
          const selectionIndex = getSelectionIndex(styleId);

          return (
            <motion.div
              key={styleId}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative">
                <button
                  onClick={() => handleStyleToggle(styleId)}
                  disabled={disabled || (mode === 'multi' && !selected && selectedStyles.length >= 3)}
                  className={`
                    relative w-full p-3 sm:p-4 md:p-6 rounded-2xl sm:rounded-3xl border-2 transition-all duration-300 group
                    ${getStyleGradient(styleId, selected)}
                    hover:shadow-lg hover:scale-105 hover:-translate-y-1
                    ${selected ? 'shadow-xl ring-4 ring-opacity-20' : 'hover:border-gray-300'}
                    ${mode === 'multi' && !selected && selectedStyles.length >= 3 ? 'opacity-50 cursor-not-allowed' : ''}
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
                        className="absolute -top-2 -right-2 w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-green-500"
                      >
                        {mode === 'multi' && selectionIndex >= 0 ? (
                          <span className="text-xs sm:text-sm font-bold text-green-600">
                            {selectionIndex + 1}
                          </span>
                        ) : (
                          <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Content */}
                  <div className="flex flex-col items-center space-y-2 sm:space-y-3">
                    {/* Emoji icon */}
                    <div className={`
                      text-3xl sm:text-4xl transition-all duration-300
                      ${selected ? 'scale-110' : 'group-hover:scale-110'}
                    `}>
                      {getStyleIcon(styleId)}
                    </div>

                    <div className="text-center">
                      <h4 className={`
                        font-semibold text-sm sm:text-base transition-colors duration-300 mb-0.5 sm:mb-1
                        ${selected ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'}
                      `}>
                        {getStyleName(styleId)}
                      </h4>
                      <p className={`
                        text-[10px] sm:text-xs transition-colors duration-300 line-clamp-2
                        ${selected ? 'text-gray-600' : 'text-gray-500'}
                      `}>
                        {getStyleDescription(styleId)}
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Selection summary */}
      {mode === 'multi' && (
        <div className="flex items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full border border-blue-200"
          >
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-700">
                {selectedStyles.length}/3 styles selected
              </span>
              {selectedStyles.length > 0 && (
                <>
                  <span className="text-blue-400">•</span>
                  <span className="text-xs text-blue-600">
                    {selectedStyles
                      .map(s => getStyleName(s).split(' ')[0])
                      .join(', ')}
                  </span>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Custom prompt input (v2 enhancement: added suggested prompts & character counter) */}
      {onCustomPromptChange && (
        <div className="max-w-2xl mx-auto mt-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Instructions (Optional)
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => {
                const newValue = e.target.value;
                // Enforce 500 character limit
                if (newValue.length <= 500 && !disabled) {
                  onCustomPromptChange(newValue);
                }
              }}
              placeholder="Describe any specific features or preferences..."
              disabled={disabled}
              maxLength={500}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl
                       focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100
                       resize-none text-sm text-gray-700 placeholder-gray-400
                       transition-all duration-200 bg-white shadow-sm
                       disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={3}
            />
            {/* Character counter (v2 enhancement) */}
            <div className="flex justify-end mt-2">
              <span className={`text-xs ${
                customPrompt.length > 450
                  ? 'text-orange-600 font-semibold'
                  : customPrompt.length > 400
                    ? 'text-gray-600'
                    : 'text-gray-500'
              }`}>
                {customPrompt.length}/500 characters
              </span>
            </div>
          </div>

          {/* Suggested prompts (v2 enhancement) */}
          {selectedArea && (
            <SuggestedPrompts
              area={selectedArea}
              style={value}
              onSelect={(prompt) => {
                // Append to existing prompt with proper formatting
                const currentPrompt = customPrompt.trim();
                const newPrompt = currentPrompt
                  ? `${currentPrompt}, ${prompt.toLowerCase()}`
                  : prompt;

                // Only add if it won't exceed character limit
                if (newPrompt.length <= 500 && !disabled) {
                  onCustomPromptChange(newPrompt);
                }
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default StyleSelectorEnhanced;
