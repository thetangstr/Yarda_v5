# Data Model: Port V2 Generation Flow to V5

**Feature**: 005-port-v2-generation
**Date**: 2025-11-07
**Purpose**: Define data structures for single-page generation flow with suggested prompts

---

## Overview

This data model defines the frontend state structures and backend response formats for the v2-style generation flow. Key focus: suggested prompts system, yard area selection, and polling state management.

---

## 1. Yard Area Entity

Represents a selectable property area (front yard, back yard, walkway) with custom prompts and suggested prompt selections.

### Fields

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `id` | string | Required, enum: `'front_yard' \| 'back_yard' \| 'walkway'` | Unique identifier for the yard area |
| `name` | string | Required, display name | Human-readable name (e.g., "Front Yard") |
| `emoji` | string | Required, single emoji char | Visual identifier (🏠, 🌲, 🚶) |
| `selected` | boolean | Required, default: false | Whether user has selected this area |
| `customPrompt` | string | Optional, max 500 chars | User's custom prompt text (comma-separated if from suggested) |
| `suggestedPrompts` | SuggestedPrompt[] | Required, length: 5 | Available prompt options for this area |

### Relationships

- **Has many**: SuggestedPrompt (5 per area)
- **Belongs to**: Generation Request (when submitted)

### State Transitions

```
Initial → Selected (user clicks area card)
Selected → Unselected (user clicks again)
Selected + Custom Prompt → Ready for submission
```

### Example

```typescript
const frontYardArea: YardArea = {
  id: 'front_yard',
  name: 'Front Yard',
  emoji: '🏠',
  selected: true,
  customPrompt: 'colorful flower beds, modern minimalist landscaping',
  suggestedPrompts: [
    {
      id: 'front_yard_1',
      text: 'colorful flower beds with seasonal blooms',
      emoji: '🌸',
      selected: true
    },
    {
      id: 'front_yard_2',
      text: 'modern minimalist landscaping with clean lines',
      emoji: '✨',
      selected: true
    },
    // ... 3 more
  ]
};
```

---

## 2. Suggested Prompt Entity

Represents a pre-defined prompt option that users can click to quickly populate their custom prompt.

### Fields

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `id` | string | Required, unique | Identifier: `{area_id}_{index}` |
| `text` | string | Required, 20-80 chars | Prompt suggestion text |
| `emoji` | string | Required, single emoji | Visual indicator based on keywords |
| `selected` | boolean | Required, default: false | Whether this prompt is currently selected |
| `areaId` | string | Required, foreign key | Parent yard area ID |

### Validation Rules

- **Max selections**: 3 per yard area
- **Auto-sync**: `selected` state syncs with `customPrompt` content
- **Comma-separated**: Multiple selected prompts joined with ", "

### Emoji Mapping Logic

```typescript
const getPromptEmoji = (prompt: string): string => {
  const lower = prompt.toLowerCase();

  // Flower-related
  if (lower.includes('flower')) return '🌸';
  if (lower.includes('rose')) return '🌹';

  // Plant-related
  if (lower.includes('native plants') || lower.includes('drought')) return '🌵';
  if (lower.includes('grass')) return '🌿';
  if (lower.includes('tree')) return '🌳';

  // Features
  if (lower.includes('pathway')) return '🚶';
  if (lower.includes('water')) return '⛲';
  if (lower.includes('patio')) return '🪑';
  if (lower.includes('zen')) return '🧘';

  // Default
  return '🌱';
};
```

### Example

```typescript
const suggestedPrompt: SuggestedPrompt = {
  id: 'front_yard_1',
  text: 'colorful flower beds with seasonal blooms',
  emoji: '🌸',
  selected: true,
  areaId: 'front_yard'
};
```

---

## 3. Style Entity

Represents a landscape design style with numbered selection order (1-3).

### Fields

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `id` | string | Required, snake_case | Unique identifier (e.g., "modern_minimalist") |
| `name` | string | Required, display name | Human-readable name |
| `description` | string | Required, 50-150 chars | Brief style description |
| `emoji` | string | Required, single emoji | Visual identifier |
| `selected` | boolean | Required, default: false | Whether user has selected this style |
| `selectionOrder` | number \| null | Optional, 1-3 | Order of selection (1st, 2nd, 3rd) |

### Validation Rules

- **Max selections**: 3 styles
- **Numbered indicators**: Show selection order in UI
- **Order assignment**: First click → 1, second → 2, third → 3

### Example

```typescript
const modernStyle: Style = {
  id: 'modern_minimalist',
  name: 'Modern Minimalist',
  description: 'Clean lines, simple plantings, architectural focus',
  emoji: '🏠',
  selected: true,
  selectionOrder: 1
};
```

---

## 4. Generation Request Entity

Represents an active or completed landscape generation with polling state.

### Fields

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `id` | string (UUID) | Required, backend-generated | Unique request identifier |
| `address` | string | Required, min 10 chars | Property address |
| `placeId` | string | Required, Google Places ID | Location identifier |
| `selectedAreas` | string[] | Required, min 1 area | Array of area IDs |
| `areaPrompts` | Record<string, string> | Required | Map of area_id → custom prompt |
| `selectedStyles` | string[] | Optional, max 3 | Array of style IDs |
| `transformationIntensity` | number | Required, 0.0-1.0 | v5-specific parameter |
| `status` | GenerationStatus | Required | Overall generation status |
| `results` | AreaResult[] | Required | Per-area generation results |
| `createdAt` | Date | Required, ISO 8601 | Request creation timestamp |
| `updatedAt` | Date | Required, ISO 8601 | Last update timestamp |

### Generation Status Enum

```typescript
type GenerationStatus =
  | 'pending'      // Request accepted, not started
  | 'processing'   // AI generation in progress
  | 'completed'    // All areas completed or failed
  | 'failed';      // System-level failure
```

### Validation Rules

- **At least 1 area**: Must select minimum 1 yard area
- **Prompt required**: Each selected area must have non-empty prompt
- **Completion check**: Status is 'completed' when all area results are 'completed' or 'failed'

### Example

```typescript
const generationRequest: GenerationRequest = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  address: '123 Main Street, San Francisco, CA',
  placeId: 'ChIJIQBpAG2ahYAR_6128GcTUEo',
  selectedAreas: ['front_yard', 'back_yard'],
  areaPrompts: {
    front_yard: 'colorful flower beds, modern minimalist landscaping',
    back_yard: 'entertainment area with patio'
  },
  selectedStyles: ['modern_minimalist', 'california_native'],
  transformationIntensity: 0.5,
  status: 'processing',
  results: [
    {
      areaId: 'front_yard',
      status: 'completed',
      imageUrl: 'https://vercel-blob.com/abc123.jpg',
      error: null
    },
    {
      areaId: 'back_yard',
      status: 'processing',
      imageUrl: null,
      error: null
    }
  ],
  createdAt: '2025-11-07T12:00:00Z',
  updatedAt: '2025-11-07T12:02:30Z'
};
```

---

## 5. Area Result Entity

Represents the generation output for a single yard area.

### Fields

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `areaId` | string | Required, foreign key | Reference to yard area |
| `status` | AreaStatus | Required | Individual area status |
| `imageUrl` | string \| null | Optional, HTTPS URL | Generated image URL (null until completed) |
| `error` | string \| null | Optional, error message | Failure reason (null if successful) |
| `progress` | number | Required, 0-100 | Percentage complete (for UI progress bar) |

### Area Status Enum

```typescript
type AreaStatus =
  | 'pending'      // Queued for generation
  | 'processing'   // AI actively generating
  | 'completed'    // Successfully generated
  | 'failed';      // Generation failed
```

### State Transitions

```
pending → processing → completed (success path)
pending → processing → failed (error path)
```

### Example

```typescript
const areaResult: AreaResult = {
  areaId: 'front_yard',
  status: 'completed',
  imageUrl: 'https://vercel-blob.com/abc123.jpg',
  error: null,
  progress: 100
};
```

---

## 6. Frontend State Structure (Zustand Store)

### Store Interface

```typescript
interface GenerationStore {
  // Form State (Persisted to localStorage)
  address: string;
  placeId: string;
  selectedAreas: string[];
  areaPrompts: Record<string, string>;  // { front_yard: "flowers, patio", ... }
  selectedStyles: string[];
  transformationIntensity: number;

  // Generation State (Transient - NOT persisted)
  requestId: string | null;
  isGenerating: boolean;
  generationStatus: GenerationStatus | null;
  areaResults: Record<string, AreaResult>;  // { front_yard: {...}, ... }
  error: string | null;

  // Actions
  setAddress: (address: string, placeId: string) => void;
  toggleArea: (areaId: string) => void;
  setAreaPrompt: (areaId: string, prompt: string) => void;
  toggleStyle: (styleId: string) => void;
  setTransformationIntensity: (value: number) => void;

  startGeneration: (requestId: string) => void;
  updateAreaResult: (areaId: string, result: AreaResult) => void;
  completeGeneration: (status: GenerationStatus) => void;
  resetGeneration: () => void;
  reset: () => void;
}
```

### Persistence Strategy

**Persisted Keys** (survives page reload):
```typescript
{
  address,
  placeId,
  selectedAreas,
  areaPrompts,
  selectedStyles,
  transformationIntensity
}
```

**Transient Keys** (reset on reload):
```typescript
{
  requestId,      // Recovered from localStorage separately
  isGenerating,
  generationStatus,
  areaResults,
  error
}
```

---

## 7. localStorage Recovery Data

Separate from Zustand store, used for session recovery after browser close.

### Storage Keys

```typescript
const STORAGE_KEYS = {
  ACTIVE_REQUEST_ID: 'yarda_active_request_id',
  ACTIVE_REQUEST_AREAS: 'yarda_active_request_areas',
  ACTIVE_REQUEST_ADDRESS: 'yarda_active_request_address'
};
```

### Stored Data

```typescript
interface LocalStorageRecovery {
  requestId: string;              // UUID of active generation
  areas: string[];                // ['front_yard', 'back_yard']
  address: string;                // "123 Main St"
  savedAt: string;                // ISO timestamp
}
```

### Validation Rules

- **Size limit**: < 500 bytes total
- **Expiration**: Clear if > 24 hours old
- **Clear on completion**: Remove all keys when generation completes

---

## 8. API Request/Response Formats

### POST /v1/generations Request

```typescript
interface CreateGenerationRequest {
  address: string;                    // "123 Main St, SF, CA"
  place_id: string;                   // Google Places ID
  areas: Array<{
    type: 'front_yard' | 'back_yard' | 'walkway';
    prompt: string;                   // Custom prompt text
  }>;
  transformation_intensity: number;   // 0.0 - 1.0
}
```

### POST /v1/generations Response

```typescript
interface CreateGenerationResponse {
  id: string;                         // UUID
  status: GenerationStatus;
  results: AreaResult[];
  created_at: string;                 // ISO 8601
}
```

### GET /v1/generations/{id} Response (Polling)

```typescript
interface GetGenerationResponse {
  id: string;
  status: GenerationStatus;
  results: AreaResult[];
  updated_at: string;                 // ISO 8601
}
```

---

## 9. Data Validation Summary

### Client-Side Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `address` | Min 10 chars, contains "," or street number | "Please enter a complete address" |
| `selectedAreas` | Min 1 area selected | "Please select at least one yard area" |
| `areaPrompt` | Non-empty for each selected area | "Please add a prompt for {area name}" |
| `customPrompt` | Max 500 chars | "Prompt too long (max 500 characters)" |
| `selectedStyles` | Max 3 styles | "Maximum 3 styles allowed" |
| `suggestedPrompts` | Max 3 per area | "Maximum 3 prompts per area" |

### Backend Validation

Handled by existing v5 backend - no changes needed for this feature.

---

## 10. Data Flow Diagram

```
User Actions → Zustand Store → API Request → Backend
     ↓              ↓               ↓           ↓
  UI Updates    localStorage    Validation   Processing
                                     ↓           ↓
                              Response ←  Database + AI
                                     ↓
                              Polling Loop
                                     ↓
                              Store Update
                                     ↓
                              UI Refresh
```

---

## Conclusion

This data model supports the v2 generation flow's key features:
- **Suggested prompts** with emoji indicators and max 3 selections
- **Yard area selection** with expanding prompt sections
- **Style selection** with numbered indicators
- **Polling state** with per-area progress tracking
- **Session recovery** via minimal localStorage storage

All entities are designed for TypeScript type safety and efficient state management with Zustand.
