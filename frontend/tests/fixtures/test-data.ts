/**
 * Test Data Fixtures for E2E Tests
 *
 * Reusable test data for addresses, areas, styles, and generation parameters
 */

export interface TestAddress {
  full: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  description: string;
}

export interface TestArea {
  id: string;
  name: string;
  requiresStreetView: boolean;
  description: string;
}

export interface TestStyle {
  id: string;
  name: string;
  description: string;
}

/**
 * Test addresses with known Street View and Satellite availability
 */
export const TEST_ADDRESSES: Record<string, TestAddress> = {
  cupertino: {
    full: '22054 Clearwood Ct, Cupertino, CA 95014, USA',
    street: '22054 Clearwood Ct',
    city: 'Cupertino',
    state: 'CA',
    zip: '95014',
    description: 'Residential address in Cupertino (reliable Street View)',
  },
  mountainView: {
    full: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
    street: '1600 Amphitheatre Parkway',
    city: 'Mountain View',
    state: 'CA',
    zip: '94043',
    description: 'Googleplex (famous landmark with excellent imagery)',
  },
  sanJose: {
    full: '100 Paseo De San Antonio, San Jose, CA 95113, USA',
    street: '100 Paseo De San Antonio',
    city: 'San Jose',
    state: 'CA',
    zip: '95113',
    description: 'Downtown San Jose (urban setting)',
  },
  paloAlto: {
    full: '1 Stanford Way, Palo Alto, CA 94305, USA',
    street: '1 Stanford Way',
    city: 'Palo Alto',
    state: 'CA',
    zip: '94305',
    description: 'Stanford University area (suburban/campus)',
  },
};

/**
 * Yard areas available for generation
 */
export const TEST_AREAS: Record<string, TestArea> = {
  frontYard: {
    id: 'front_yard',
    name: 'Front Yard',
    requiresStreetView: true,
    description: 'Front-facing area, uses Street View',
  },
  backyard: {
    id: 'backyard',
    name: 'Backyard',
    requiresStreetView: false,
    description: 'Back area, uses Satellite',
  },
  patio: {
    id: 'patio',
    name: 'Patio',
    requiresStreetView: true,
    description: 'Front-facing patio, uses Street View',
  },
  walkway: {
    id: 'walkway',
    name: 'Walkway',
    requiresStreetView: false,
    description: 'Side/back walkway, uses Satellite',
  },
  sideYard: {
    id: 'side_yard',
    name: 'Side Yard',
    requiresStreetView: false,
    description: 'Side area, uses Satellite',
  },
  pool: {
    id: 'pool',
    name: 'Pool',
    requiresStreetView: true,
    description: 'Front pool area, uses Street View',
  },
};

/**
 * Design styles available
 */
export const TEST_STYLES: Record<string, TestStyle> = {
  modernMinimalist: {
    id: 'modern_minimalist',
    name: 'Modern Minimalist',
    description: 'Clean, contemporary design with minimalist aesthetic',
  },
  californiaNative: {
    id: 'california_native',
    name: 'California Native',
    description: 'Native plants and drought-resistant landscaping',
  },
  englishGarden: {
    id: 'english_garden',
    name: 'English Garden',
    description: 'Traditional English cottage garden style',
  },
  japaneseZen: {
    id: 'japanese_zen',
    name: 'Japanese Zen',
    description: 'Peaceful Zen garden with Japanese elements',
  },
  desertLandscape: {
    id: 'desert_landscape',
    name: 'Desert Landscape',
    description: 'Southwest desert landscaping with succulents',
  },
  mediterranean: {
    id: 'mediterranean',
    name: 'Mediterranean',
    description: 'Mediterranean-inspired design with terracotta and herbs',
  },
  tropicalResort: {
    id: 'tropical_resort',
    name: 'Tropical Resort',
    description: 'Lush tropical resort-style landscaping',
  },
};

/**
 * Preservation strength presets
 */
export const PRESERVATION_STRENGTH = {
  dramatic: 0.2,
  moderate: 0.5,
  subtle: 0.8,
};

/**
 * Custom prompts for testing
 */
export const TEST_PROMPTS = {
  simple: 'Add modern landscaping with clean lines',
  detailed:
    'Transform with contemporary design featuring native drought-resistant plants, decorative stones, and ambient LED lighting',
  shortform: 'Modern look',
  maxLength: 'A'.repeat(500), // Test 500-character limit
  withEmoji: 'Add beautiful 🌸 flowers and 🌳 trees',
};

/**
 * Stripe test cards
 */
export const STRIPE_TEST_CARDS = {
  success: '4242 4242 4242 4242',
  decline: '4000 0000 0000 0002',
  requiresAuth: '4000 0025 0000 3155',
  insufficientFunds: '4000 0000 0000 9995',
};

/**
 * Expected generation timings (for timeout verification)
 */
export const GENERATION_TIMINGS = {
  minDuration: 10000, // 10 seconds minimum
  maxDuration: 120000, // 2 minutes maximum
  pollingInterval: 2000, // 2 seconds between polls
  timeout: 300000, // 5 minutes total timeout
};

/**
 * Helper to create a multi-area generation request
 */
export function createMultiAreaRequest(
  address: string,
  areas: string[],
  style: string,
  customPrompt?: string,
  preservationStrength = 0.5
) {
  return {
    address,
    areas: areas.map((area) => ({
      area,
      style,
      customPrompt: customPrompt || '',
      preservationStrength,
    })),
  };
}

/**
 * Helper to create single-area generation request
 */
export function createSingleAreaRequest(
  address: string,
  area: string,
  style: string,
  customPrompt?: string,
  preservationStrength = 0.5
) {
  return createMultiAreaRequest(address, [area], style, customPrompt, preservationStrength);
}
