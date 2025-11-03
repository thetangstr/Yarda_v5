/**
 * Generation state management using Zustand
 *
 * Manages landscape design generation state, progress, and results.
 */

import { create } from 'zustand';

export type YardAreaType = 'front_yard' | 'backyard' | 'walkway' | 'side_yard';
export type LandscapeStyle =
  | 'modern_minimalist'
  | 'california_native'
  | 'japanese_zen'
  | 'english_garden'
  | 'desert_landscape';
export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PaymentType = 'trial' | 'token' | 'subscription';

export interface GenerationAreaResult {
  area_id: string;
  area_type: YardAreaType;
  style: LandscapeStyle;
  custom_prompt?: string;
  status: GenerationStatus;
  progress?: number; // 0-100
  image_urls?: string[];
  error_message?: string;
}

export interface Generation {
  generation_id: string;
  user_id: string;
  status: GenerationStatus;
  progress: number; // 0-100
  payment_type: PaymentType;
  tokens_deducted?: number;
  address?: string;
  areas: GenerationAreaResult[];
  created_at: string;
  completed_at?: string;
}

interface GenerationState {
  // Current generation in progress
  currentGeneration: Generation | null;

  // Generation history
  generationHistory: Generation[];

  // UI state
  isGenerating: boolean;

  // Actions
  setCurrentGeneration: (generation: Generation | null) => void;
  updateGenerationProgress: (generationId: string, progress: number) => void;
  updateAreaStatus: (
    generationId: string,
    areaId: string,
    status: GenerationStatus,
    progress?: number
  ) => void;
  addGenerationToHistory: (generation: Generation) => void;
  clearCurrentGeneration: () => void;
}

export const useGenerationStore = create<GenerationState>((set) => ({
  // Initial state
  currentGeneration: null,
  generationHistory: [],
  isGenerating: false,

  // Actions
  setCurrentGeneration: (generation) =>
    set({
      currentGeneration: generation,
      isGenerating: !!generation,
    }),

  updateGenerationProgress: (generationId, progress) =>
    set((state) => {
      if (state.currentGeneration?.generation_id === generationId) {
        return {
          currentGeneration: {
            ...state.currentGeneration,
            progress,
          },
        };
      }
      return state;
    }),

  updateAreaStatus: (generationId, areaId, status, progress) =>
    set((state) => {
      if (state.currentGeneration?.generation_id === generationId) {
        const updatedAreas = state.currentGeneration.areas.map((area) =>
          area.area_id === areaId
            ? { ...area, status, progress: progress ?? area.progress }
            : area
        );

        return {
          currentGeneration: {
            ...state.currentGeneration,
            areas: updatedAreas,
          },
        };
      }
      return state;
    }),

  addGenerationToHistory: (generation) =>
    set((state) => ({
      generationHistory: [generation, ...state.generationHistory],
    })),

  clearCurrentGeneration: () =>
    set({
      currentGeneration: null,
      isGenerating: false,
    }),
}));
