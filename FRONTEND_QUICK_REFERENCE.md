# Frontend Generation Flow - Quick Reference

## File Locations (Copy-Paste Ready)

### Main Page
- `/frontend/src/pages/generate.tsx` - Single-page coordinator (446 lines)

### Components  
- `/frontend/src/components/generation/GenerationFormEnhanced.tsx` - Input form
- `/frontend/src/components/generation/GenerationProgressInline.tsx` - Progress display (251 lines)
- `/frontend/src/components/generation/GenerationResultsInline.tsx` - Results display (294 lines)
- `/frontend/src/components/generation/shared/constants.ts` - Animation timing & colors
- `/frontend/src/components/generation/shared/utils.ts` - Utility functions

### State Management
- `/frontend/src/store/generationStore.ts` - Zustand store (318 lines, localStorage persisted)

### Utilities
- `/frontend/src/lib/api.ts` - API client + `pollGenerationStatus()` (lines 490-577)
- `/frontend/src/lib/localStorage-keys.ts` - Storage helpers
- `/frontend/src/lib/suggested-prompts.ts` - 30+ emoji mappings

### Types
- `/frontend/src/types/generation.ts` - All TypeScript interfaces

---

## Current Architecture at a Glance

### Phases
1. **FORM** - User inputs address, areas, style (always visible)
2. **PROGRESS** - Real-time polling, per-area cards with spinners/progress bars (2-second updates)
3. **RESULTS** - Grid of completed designs, download buttons, modal viewer

### State Management
```
Zustand generationStore
├── Form state (persisted) → address, areas, styles
├── Generation state → currentGeneration, isGenerating
└── Polling state (transient) → requestId, progress, error, timeout
```

### Polling
```
pollGenerationStatus(id, callbacks) {
  1. Check immediately
  2. Poll every 2 seconds
  3. Stop when all areas = 'completed' OR 'failed'
  4. Timeout after 5 minutes
  5. Return cleanup function
}
```

### Animations (Framer Motion)
- Form: fade-in (0.3s)
- Progress cards: staggered entrance (0.1s delay per card)
- Progress bars: animated fill
- Spinner: continuous 360° rotation
- Results: scale+fade with staggered delays
- Scrolling: smooth auto-scroll to sections

---

## Data Types (Key Types Only)

### AreaResultWithProgress (Current UI state per area)
```typescript
{
  areaId: 'front_yard'              // Area identifier
  status: 'processing'               // Current status
  imageUrl: 'https://...' | null     // Generated image URL
  error: string | null               // Failure reason
  progress: 50                        // 0-100%
}
```

### GenerationStatusResponse (From API every 2s)
```typescript
{
  id: 'uuid'                         // Generation ID
  status: 'processing'               // Overall status
  areas: [{                          // Per-area details
    area: 'front_yard'
    status: 'processing'
    image_url: '...'                 // Available when completed
    progress: 50
    current_stage: 'generating_design'  // 6 stages total
  }]
  source_images?: [{                 // Optional Street View/Satellite
    image_type: 'street_view'
    image_url: '...'
    pano_id?: '...'
  }]
}
```

---

## What's Built In

24+ Animations, Real-time polling, Error recovery, localStorage persistence, Responsive grid, Download buttons, Image modal, Emoji system, Zustand state, TypeScript safety

## What's Missing (For Enhancement)

Source image carousel (API has data, not displayed), Processing stage visualization (API has data, not shown), Before/after comparison, Advanced download options

---

## Key Methods to Know

### In generationStore
- `startPolling(requestId)` - Initialize polling state
- `updatePollingProgress(areaId, status, imageUrl, progress)` - Update per-area
- `resetPolling()` - Clear polling state
- `resetForm()` - Clear form state

### In api.ts
- `pollGenerationStatus(id, callbacks)` - Main polling function
- `generationsAPI.create(request)` - Submit form
- `generationsAPI.getStatus(id)` - Get latest status

### In generate.tsx
- `handleGenerationStart(generationId)` - Called on form submit
- `handleStartNew()` - Reset to form phase

---

## UI Flow

```
1. User fills form + clicks Submit
   ↓
2. generationsAPI.create() → Gets generation ID
   ↓
3. handleGenerationStart(id) → Scrolls to progress, starts polling
   ↓
4. Every 2 seconds: Poll /generations/{id}
   ├── Update progress bars
   ├── Update status icons
   ├── Display thumbnails when ready
   ↓
5. All areas done → Scroll to results, show grid
   ↓
6. User clicks "Create New Design" → Back to form
```

---

## Common Development Tasks

### To modify animation timing
Edit `/frontend/src/components/generation/shared/constants.ts`
- `ANIMATION_DURATION` - How long animations take
- `ANIMATION_DELAY` - Stagger delays

### To change polling interval
Edit `/frontend/src/lib/api.ts` (lines 493-494)
- `POLLING_INTERVAL` - Currently 2000ms
- `POLLING_TIMEOUT` - Currently 300000ms (5 min)

### To add a new progress card section
Edit `/frontend/src/components/generation/GenerationProgressInline.tsx` (lines 168-200)
- Add new `<motion.div>` with Framer Motion props

### To modify result grid layout
Edit `/frontend/src/components/generation/GenerationResultsInline.tsx` (line 96)
- Change `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` for different responsiveness

---

## Form State Recovery

If user refreshes page during generation:
1. `useEffect` checks localStorage via `getGenerationFromLocalStorage()`
2. If active generation found, auto-calls `handleGenerationStart(id)`
3. Resumes polling from current state
4. On completion, clears localStorage via `clearGenerationFromLocalStorage()`

---

## Suggested Prompts System

30+ emoji mappings in `/frontend/src/lib/suggested-prompts.ts`:
- Automatic emoji detection from prompt text
- 5 pre-written prompts per area
- Keywords: flower→🌸, tree→🌳, patio→🪑, water→⛲, etc.

---

## Type Safety Notes

All API responses typed against `/frontend/src/types/generation.ts`
- `GenerationStatusResponse` - What polling endpoint returns
- `AreaResultWithProgress` - What UI displays
- `AreaStatus` - Individual area from API
- `PaymentStatusResponse` - Payment check before submission

Everything is TypeScript, no implicit any.

---

## Next Steps for Enhancement (If Needed)

1. **Source Image Carousel**
   - New component: `GenerationSourceImagesCarousel.tsx`
   - Consume: `response.source_images` from API
   - Display: Street View + Satellite with navigation dots

2. **Processing Stages**
   - Display: `response.areas[].current_stage` enum
   - Show: "Step 2/6: Analyzing property..."
   - Animate: Progress through 6 stages

3. **Before/After Slider**
   - New component: `BeforeAfterSlider.tsx`
   - Compare: Source image vs final result
   - Swipe-to-reveal animation

4. **Advanced Download**
   - Add menu: Print, Zip, Email options
   - Consider: Image optimization for print
