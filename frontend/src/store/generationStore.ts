/**
 * Generation state management using Zustand with localStorage persistence
 *
 * Feature: 004-generation-flow + 005-port-v2-generation
 * Manages landscape design generation state, progress, and results.
 * Persists form state and current generation for recovery on page refresh.
 *
 * Requirements:
 * - FR-010: Progress persists across page refresh
 * - FR-014: Background processing continues during page refresh
 * - Feature 005: Add suggested prompts, form state, and selective persistence
 *
 * Persistence Strategy (from v2 research):
 * - PERSIST: address, placeId, selectedAreas, areaPrompts, selectedStyles (form state)
 * - TRANSIENT: requestId, isGenerating, progress, results (reset on reload)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  YardArea,
  DesignStyle,
  GenerationStatus as APIGenerationStatus,
  AreaGenerationStatus,
  PaymentMethod,
} from '@/types/generation';

export type YardAreaType = YardArea;
export type LandscapeStyle = DesignStyle;
export type GenerationStatus = APIGenerationStatus | AreaGenerationStatus;
export type PaymentType = PaymentMethod;

export interface GenerationAreaResult {
  area_id: string;
  area_type: YardAreaType;
  style: LandscapeStyle;
  custom_prompt?: string;
  preservation_strength?: number; // 0.0-1.0 (v2 enhancement)
  status: AreaGenerationStatus;
  progress?: number; // 0-100
  current_stage?: string; // Current processing stage
  status_message?: string; // User-facing progress message
  image_urls?: string[];
  error_message?: string;
}

export interface SourceImage {
  image_type: 'street_view' | 'satellite' | 'user_upload';
  image_url: string;
  pano_id?: string;
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
  source_images?: SourceImage[];
  created_at: string;
  completed_at?: string;
}

interface GenerationState {
  // ===== FORM STATE (Persisted) =====
  // Property information
  address: string;
  placeId: string;

  // Selected yard areas (array of IDs: 'front_yard', 'back_yard', 'walkway')
  selectedAreas: string[];

  // Custom prompts per area (can include suggested prompts)
  // Format: { front_yard: "flowers, patio, modern", back_yard: "entertainment, pergola" }
  areaPrompts: Record<string, string>;

  // Selected design styles (array of style IDs)
  selectedStyles: string[];

  // ===== GENERATION STATE (Transient - not persisted) =====
  // Current generation in progress
  currentGeneration: Generation | null;

  // Generation history
  generationHistory: Generation[];

  // UI state
  isGenerating: boolean;

  // ===== POLLING STATE (Feature 005 - V2 Port) =====
  // Active polling request ID
  pollingRequestId: string | null;

  // Polling progress per area
  pollingProgress: Record<string, { status: string; imageUrl?: string; progress?: number }>;

  // Error state for polling
  pollingError: string | null;

  // Timeout state
  pollingTimedOut: boolean;

  // ===== FORM ACTIONS =====
  setAddress: (address: string, placeId: string) => void;
  toggleArea: (areaId: string) => void;
  setAreaPrompt: (areaId: string, prompt: string) => void;
  toggleStyle: (styleId: string) => void;
  resetForm: () => void;

  // ===== GENERATION ACTIONS =====
  setCurrentGeneration: (generation: Generation | null) => void;
  updateGenerationProgress: (generationId: string, progress: number) => void;
  updateAreaStatus: (
    generationId: string,
    areaId: string,
    status: AreaGenerationStatus,
    progress?: number
  ) => void;
  addGenerationToHistory: (generation: Generation) => void;
  clearCurrentGeneration: () => void;

  // ===== POLLING ACTIONS (Feature 005 - V2 Port) =====
  startPolling: (requestId: string) => void;
  updatePollingProgress: (areaId: string, status: string, imageUrl?: string, progress?: number) => void;
  setPollingError: (error: string | null) => void;
  setPollingTimeout: (timedOut: boolean) => void;
  stopPolling: () => void;
  resetPolling: () => void;
}

export const useGenerationStore = create<GenerationState>()(
  persist(
    (set) => ({
      // ===== INITIAL STATE =====
      // Form state
      address: '',
      placeId: '',
      selectedAreas: [],
      areaPrompts: {},
      selectedStyles: [],

      // Generation state
      currentGeneration: null,
      generationHistory: [],
      isGenerating: false,

      // Polling state
      pollingRequestId: null,
      pollingProgress: {},
      pollingError: null,
      pollingTimedOut: false,

      // ===== FORM ACTIONS =====
      setAddress: (address, placeId) => {
        console.log('[GenerationStore] setAddress called:', { address, placeId });
        set({
          address,
          placeId,
        });
      },

      toggleArea: (areaId) =>
        set((state) => {
          const isSelected = state.selectedAreas.includes(areaId);
          return {
            selectedAreas: isSelected
              ? state.selectedAreas.filter((id) => id !== areaId)
              : [...state.selectedAreas, areaId],
          };
        }),

      setAreaPrompt: (areaId, prompt) =>
        set((state) => ({
          areaPrompts: {
            ...state.areaPrompts,
            [areaId]: prompt,
          },
        })),

      toggleStyle: (styleId) =>
        set((state) => {
          const isSelected = state.selectedStyles.includes(styleId);
          return {
            selectedStyles: isSelected
              ? state.selectedStyles.filter((id) => id !== styleId)
              : [...state.selectedStyles, styleId],
          };
        }),

      resetForm: () =>
        set({
          address: '',
          placeId: '',
          selectedAreas: [],
          areaPrompts: {},
          selectedStyles: [],
        }),

      // ===== GENERATION ACTIONS =====
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

      // ===== POLLING ACTIONS =====
      startPolling: (requestId) =>
        set({
          pollingRequestId: requestId,
          pollingProgress: {},
          pollingError: null,
          pollingTimedOut: false,
          isGenerating: true,
        }),

      updatePollingProgress: (areaId, status, imageUrl, progress) =>
        set((state) => ({
          pollingProgress: {
            ...state.pollingProgress,
            [areaId]: {
              status,
              imageUrl,
              progress: progress ?? state.pollingProgress[areaId]?.progress ?? 0,
            },
          },
        })),

      setPollingError: (error) =>
        set({
          pollingError: error,
        }),

      setPollingTimeout: (timedOut) =>
        set({
          pollingTimedOut: timedOut,
        }),

      stopPolling: () =>
        set({
          pollingRequestId: null,
          isGenerating: false,
        }),

      resetPolling: () =>
        set({
          pollingRequestId: null,
          pollingProgress: {},
          pollingError: null,
          pollingTimedOut: false,
          isGenerating: false,
        }),
    }),
    {
      name: 'yarda-generation-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Persist form state (survives reload)
        address: state.address,
        placeId: state.placeId,
        selectedAreas: state.selectedAreas,
        areaPrompts: state.areaPrompts,
        selectedStyles: state.selectedStyles,
        // Persist current generation for recovery
        currentGeneration: state.currentGeneration,
        isGenerating: state.isGenerating,
        // Do NOT persist polling state (transient)
        // Do NOT persist history (reset on reload)
      }),
    }
  )
);
