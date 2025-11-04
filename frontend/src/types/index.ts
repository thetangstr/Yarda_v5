/**
 * Core TypeScript Types
 * Feature: 003-google-maps-integration
 * Purpose: Shared type definitions for landscape generation
 */

/**
 * Source of property image used for generation
 */
export type ImageSource = 'user_upload' | 'google_street_view' | 'google_satellite';

/**
 * Status of landscape generation
 */
export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Payment method for generation
 */
export type PaymentType = 'trial' | 'token' | 'subscription';

/**
 * Landscape area type
 */
export type LandscapeArea = 'front_yard' | 'back_yard' | 'side_yard' | 'full_property';

/**
 * Generation record
 */
export interface Generation {
  id: string;
  userId: string;
  status: GenerationStatus;
  paymentType: PaymentType;
  tokensDeducted: number;
  address?: string;
  imageUrl?: string;
  requestParams: {
    area: LandscapeArea;
    style: string;
    customPrompt?: string;
  };
  imageSource: ImageSource;
  resultUrl?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * Request for creating a new generation
 */
export interface GenerationCreateRequest {
  address: string;
  area: LandscapeArea;
  style: string;
  customPrompt?: string;
  paymentType: PaymentType;
  image?: File; // Optional: user-uploaded image
}

/**
 * Response from generation endpoint
 */
export interface GenerationResponse {
  id: string;
  status: GenerationStatus;
  imageUrl?: string;
  imageSource: ImageSource;
  resultUrl?: string;
  errorMessage?: string;
  createdAt: string;
}
