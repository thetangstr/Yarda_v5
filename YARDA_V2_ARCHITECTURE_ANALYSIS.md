# Yarda v2 Architecture Analysis

**Purpose**: Document proven v2 patterns to inform v5 implementation
**Date**: 2025-11-07
**Source**: `/Volumes/home/Projects_Hosted/Yarda_v2/yard-web-app/frontend/src/`

---

## 1. Component Architecture Patterns

### SuperMinimal Component Family

The v2 implementation uses a "SuperMinimal" design system with three core components that follow a consistent pattern:

#### **Pattern Overview**
- **Minimalist aesthetics**: Emoji icons, subtle gradients, smooth animations
- **Framer Motion**: All components use `motion.div` and `AnimatePresence` for transitions
- **Visual feedback**: Border colors, shadows, and icons change based on state
- **Mobile-first**: Responsive grid layouts with `grid-cols-2` for mobile, expanding to `lg:grid-cols-3`

---

### SuperMinimalAddressInput

**Location**: `src/components/SuperMinimalAddressInput.tsx`

#### Props Interface
```typescript
interface SuperMinimalAddressInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  'data-testid'?: string;
}
```

#### Key Features
1. **Real-time validation indicator**
   - Simple check: `value.length > 5 && (value.includes(',') || value.includes(' '))`
   - Visual states: MapPin (idle) → Search (focused) → CheckCircle (valid)

2. **Visual state management**
   ```typescript
   const [isFocused, setIsFocused] = useState(false);
   const isValid = value.length > 5 && (value.includes(',') || value.includes(' '));
   ```

3. **Dynamic border colors**
   - Focused: `border-blue-400 shadow-xl shadow-blue-100`
   - Valid: `border-green-300 bg-green-50`
   - Default: `border-gray-200 bg-gray-50`

4. **Animated background gradient** (only when focused)
   ```tsx
   <div className={`
     absolute inset-0 -z-10 transition-opacity duration-300
     ${isFocused ? 'opacity-100' : 'opacity-0'}
     bg-gradient-to-r from-blue-50 via-transparent to-blue-50
   `} />
   ```

5. **Status indicator below input**
   ```tsx
   {value && (
     <div className="flex items-center space-x-2 px-2">
       <div className={`w-1.5 h-1.5 rounded-full ${isValid ? 'bg-green-500' : 'bg-amber-500'}`} />
       <span>{isValid ? 'Address looks good' : 'Keep typing for suggestions...'}</span>
     </div>
   )}
   ```

#### **v5 Adaptation Notes**
- Keep the emoji icon pattern (MapPin → Search → CheckCircle)
- Maintain the subtle gradient animation on focus
- Status indicator is great UX - preserve this pattern
- Consider integrating Google Places Autocomplete for actual validation

---

### SuperMinimalYardSelector

**Location**: `src/components/SuperMinimalYardSelector.tsx`

#### Props Interface
```typescript
interface YardArea {
  id: string;
  name: string;
  icon: React.ReactNode;
  selected: boolean;
  customPrompt: string;
}

interface SuperMinimalYardSelectorProps {
  areas: YardArea[];
  onToggle: (areaId: string) => void;
  onPromptChange: (areaId: string, prompt: string) => void;
  translations: {
    selectAreas: string;
    promptPlaceholder: string;
  };
  suggestedPrompts?: Record<string, string[]>;
}
```

#### Key Features

1. **Icon Mapping Function**
   ```typescript
   const getIcon = (id: string) => {
     switch (id) {
       case 'front_yard': return <Home className="w-5 h-5 sm:w-6 sm:h-6" />;
       case 'back_yard': return <Trees className="w-5 h-5 sm:w-6 sm:h-6" />;
       case 'walkway': return <Footprints className="w-5 h-5 sm:w-6 sm:h-6" />;
       default: return <Home className="w-5 h-5 sm:w-6 sm:h-6" />;
     }
   };
   ```

2. **Per-area color gradients**
   ```typescript
   const getGradient = (id: string, selected: boolean) => {
     const gradients = {
       front_yard: selected
         ? 'bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-300'
         : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200',
       back_yard: selected
         ? 'bg-gradient-to-br from-emerald-50 to-teal-100 border-emerald-300'
         : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200',
       walkway: selected
         ? 'bg-gradient-to-br from-amber-50 to-orange-100 border-amber-300'
         : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
     };
     return gradients[id];
   };
   ```

3. **Suggested Prompts System** (Critical Pattern!)
   - **Emoji mapping function** (`getPromptEmoji`)
   - **Max 3 prompts** per area
   - **Click to toggle** selection
   - **Comma-separated** in customPrompt field

   ```typescript
   const getPromptEmoji = (prompt: string): string => {
     const lowerPrompt = prompt.toLowerCase();
     if (lowerPrompt.includes('flower') || lowerPrompt.includes('blooms')) return '🌸';
     if (lowerPrompt.includes('native plants') || lowerPrompt.includes('drought')) return '🌵';
     if (lowerPrompt.includes('patio') || lowerPrompt.includes('seating')) return '🪑';
     // ... 30+ keyword mappings
     return '🌱'; // default
   };
   ```

4. **Suggested Prompt Selection Logic**
   ```typescript
   const isSelected = area.customPrompt.toLowerCase().includes(prompt.toLowerCase());
   const selectedCount = area.customPrompt.trim()
     ? area.customPrompt.split(',').filter(p => p.trim()).length
     : 0;
   const canAdd = selectedCount < 3;

   onClick={(e) => {
     e.stopPropagation();
     if (isSelected) {
       // Remove this prompt
       const prompts = area.customPrompt.split(',')
         .map(p => p.trim())
         .filter(p => p.toLowerCase() !== prompt.toLowerCase());
       onPromptChange(area.id, prompts.join(', '));
     } else if (canAdd) {
       // Add this prompt (max 3)
       const current = area.customPrompt.trim();
       const newPrompt = current ? `${current}, ${prompt}` : prompt;
       onPromptChange(area.id, newPrompt);
     }
   }}
   ```

5. **Custom Prompt Input**
   - Expands only when area is selected (`AnimatePresence`)
   - Textarea with max 3 rows
   - Sparkles icon in top-right corner
   - Blue focus ring with `focus:ring-4 focus:ring-blue-100`

6. **Selection Counter Badge**
   ```tsx
   <motion.div className="px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full border border-blue-200">
     <div className="flex items-center space-x-2">
       <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
       <span className="text-sm font-medium text-blue-700">
         {areas.filter(a => a.selected).length} area(s) selected
       </span>
     </div>
   </motion.div>
   ```

#### **v5 Adaptation Notes**
- **MUST PRESERVE**: Emoji-based suggested prompts system
- **MUST PRESERVE**: Max 3 prompts per area, comma-separated storage
- **MUST PRESERVE**: Click-to-toggle selection/deselection
- Keep the animated expansion of custom prompt input
- Use same color scheme for different yard areas
- Maintain the selection counter at bottom

---

### SuperMinimalStyleSelector

**Location**: `src/components/SuperMinimalStyleSelector.tsx`

#### Props Interface
```typescript
interface SuperMinimalStyleSelectorProps {
  styles: LandscapeStyle[];
  selectedStyles: string[];
  onStylesChange: (styles: string[]) => void;
}
```

#### Key Features

1. **Emoji-based style icons**
   ```typescript
   const getStyleIcon = (styleId: string) => {
     const iconMap: Record<string, string> = {
       'modern_minimalist': '🏠',
       'california_native': '🌲',
       'japanese_zen': '🌸',
       'mediterranean': '🌊',
       'cottage_garden': '🏡',
       'desert_modern': '🌵',
       'tropical_oasis': '🌴',
       // ...
     };
     return iconMap[styleId] || '✨';
   };
   ```

2. **Per-style gradients** (same pattern as YardSelector)
   ```typescript
   const getStyleGradient = (styleId: string, selected: boolean) => {
     const gradients: Record<string, string> = {
       'modern_minimalist': selected
         ? 'bg-gradient-to-br from-slate-50 to-gray-100 border-slate-300'
         : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200',
       // ... per-style colors
     };
     return gradients[styleId];
   };
   ```

3. **Max 3 styles selection**
   ```typescript
   const handleStyleToggle = (styleId: string) => {
     if (selectedStyles.includes(styleId)) {
       onStylesChange(selectedStyles.filter(id => id !== styleId));
     } else if (selectedStyles.length < 3) {
       onStylesChange([...selectedStyles, styleId]);
     }
   };
   ```

4. **Selection number badge** (shows order: 1, 2, 3)
   ```tsx
   {isSelected && (
     <motion.div className="absolute -top-2 -right-2 w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full shadow-lg">
       <span className="text-xs sm:text-sm font-bold text-green-600">
         {selectionIndex + 1}
       </span>
     </motion.div>
   )}
   ```

5. **Selection summary at bottom**
   ```tsx
   <div className="px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full">
     <span>{selectedStyles.length}/3 styles selected</span>
     {selectedStyles.length > 0 && (
       <span className="text-xs text-blue-600">
         {styles.filter(s => selectedStyles.includes(s.id))
                .map(s => s.name.split(' ')[0])
                .join(', ')}
       </span>
     )}
   </div>
   ```

#### **v5 Adaptation Notes**
- Use emoji icons instead of Lucide icons for styles
- Maintain max 3 selection limit
- Show numbered badges (1, 2, 3) to indicate selection order
- Keep the bottom summary with short style names

---

## 2. State Management Patterns

### Zustand Store Structure

**Location**: `src/store/useStore.ts`

#### Store Schema
```typescript
interface AppState {
  currentAddress: string;
  selectedStyle: string;
  renderStatus: RenderStatus; // 'idle' | 'loading' | 'success' | 'error'
  currentRender: RenderResult | null;
  gallery: GalleryItem[];
  progress: RenderProgress | null;
  error: string | null;
  multiResults: Array<{style: string; result: any}>;
}
```

#### Persistence Strategy (Zustand Persist Middleware)
```typescript
persist(
  (set, get) => ({ /* store */ }),
  {
    name: 'landscape-app-storage',
    partialize: (state) => ({
      currentAddress: state.currentAddress,
      selectedStyle: state.selectedStyle,
      gallery: state.gallery,
      multiResults: state.multiResults,
      // NOTE: Does NOT persist renderStatus, error, or progress
    }),
  }
)
```

#### Gallery Management
```typescript
addToGallery: (item: GalleryItem) => {
  const { gallery } = get();
  const safeGallery = gallery || []; // Defensive programming

  // Check if item already exists (by address and timestamp)
  const exists = safeGallery.some(
    existing =>
      existing.address === item.address &&
      existing.timestamp === item.timestamp
  );

  if (!exists) {
    set({ gallery: [item, ...safeGallery].slice(0, 20) }); // Keep max 20 items
  }
}
```

#### **v5 Adaptation Notes**
- v5 uses `userStore` for global state - consider adding similar fields:
  - `currentAddress`
  - `multiResults` (for recovery)
- Use Zustand persist middleware to survive page refreshes
- Limit gallery to 20 items max (performance consideration)
- **Critical**: Don't persist `renderStatus` or `error` (causes stale state)

---

## 3. Suggested Prompts Implementation

### Data Structure

**Location**: `src/pages/LandscapeStudioEnhanced.tsx` (lines 89-112)

```typescript
const suggestedPrompts = {
  front_yard: [
    "colorful flower beds with seasonal blooms",
    "drought-tolerant native plants with decorative rocks",
    "modern minimalist design with ornamental grasses",
    "welcoming pathway with symmetrical plantings",
    "vibrant perennial garden with butterfly-friendly flowers"
  ],
  back_yard: [
    "entertainment area with patio and outdoor seating",
    "vegetable garden with raised beds",
    "zen meditation garden with water feature",
    "privacy screening with tall shrubs and trees",
    "outdoor dining space with pergola and ambient lighting"
  ],
  walkway: [
    "curved pathway with colorful border plants",
    "straight walkway with symmetrical hedges",
    "stepping stone path through ground cover",
    "illuminated pathway with solar lights",
    "rustic gravel path with native wildflowers"
  ]
};
```

### Emoji Mapping Logic

**Critical Function**: `getPromptEmoji()` in `SuperMinimalYardSelector.tsx` (lines 46-87)

```typescript
const getPromptEmoji = (prompt: string): string => {
  const lowerPrompt = prompt.toLowerCase();

  // Flower-related
  if (lowerPrompt.includes('flower') || lowerPrompt.includes('blooms')) return '🌸';
  if (lowerPrompt.includes('rose')) return '🌹';

  // Plant-related
  if (lowerPrompt.includes('native plants') || lowerPrompt.includes('drought')) return '🌵';
  if (lowerPrompt.includes('grass') || lowerPrompt.includes('lawn')) return '🌿';
  if (lowerPrompt.includes('tree')) return '🌳';

  // Garden features
  if (lowerPrompt.includes('pathway') || lowerPrompt.includes('walkway')) return '🚶';
  if (lowerPrompt.includes('water') || lowerPrompt.includes('fountain')) return '⛲';
  if (lowerPrompt.includes('rock') || lowerPrompt.includes('stone')) return '🪨';
  if (lowerPrompt.includes('patio') || lowerPrompt.includes('seating')) return '🪑';
  if (lowerPrompt.includes('dining')) return '🍽️';

  // Entertainment features
  if (lowerPrompt.includes('entertainment') || lowerPrompt.includes('outdoor living')) return '🎭';
  if (lowerPrompt.includes('vegetable') || lowerPrompt.includes('garden')) return '🥬';
  if (lowerPrompt.includes('zen') || lowerPrompt.includes('meditation')) return '🧘';

  // Lighting and ambiance
  if (lowerPrompt.includes('light') || lowerPrompt.includes('solar')) return '💡';
  if (lowerPrompt.includes('pergola') || lowerPrompt.includes('shade')) return '⛱️';

  // Privacy and screening
  if (lowerPrompt.includes('privacy') || lowerPrompt.includes('screening')) return '🌲';

  // Design styles
  if (lowerPrompt.includes('modern') || lowerPrompt.includes('minimalist')) return '✨';
  if (lowerPrompt.includes('rustic') || lowerPrompt.includes('gravel')) return '🏞️';

  // Default
  return '🌱';
};
```

### Selection/Deselection Logic

**Key Pattern**: Max 3 prompts, stored as comma-separated string

```typescript
// In SuperMinimalYardSelector.tsx
{suggestedPrompts[area.id].map((prompt, idx) => {
  const isSelected = area.customPrompt.toLowerCase().includes(prompt.toLowerCase());
  const selectedCount = area.customPrompt.trim()
    ? area.customPrompt.split(',').filter(p => p.trim()).length
    : 0;
  const canAdd = selectedCount < 3;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (isSelected) {
          // Remove this prompt
          const prompts = area.customPrompt.split(',')
            .map(p => p.trim())
            .filter(p => p.toLowerCase() !== prompt.toLowerCase());
          onPromptChange(area.id, prompts.join(', '));
        } else if (canAdd) {
          // Add this prompt (max 3)
          const current = area.customPrompt.trim();
          const newPrompt = current ? `${current}, ${prompt}` : prompt;
          onPromptChange(area.id, newPrompt);
        }
      }}
      disabled={!isSelected && !canAdd}
      className={`${isSelected ? 'bg-blue-500 text-white' : 'bg-white'}`}
    >
      <span>{getPromptEmoji(prompt)}</span>
      {prompt}
      {isSelected && <span className="ml-1">✓</span>}
    </button>
  );
})}
```

### **v5 Implementation Checklist**
- [ ] Create `suggestedPrompts` object with 5 prompts per area
- [ ] Implement `getPromptEmoji()` function with 30+ keyword mappings
- [ ] Max 3 prompts per area, stored as comma-separated string
- [ ] Clickable chips with emoji prefix
- [ ] Visual states: default (white bg) → selected (blue bg + checkmark)
- [ ] Disable chips when 3 prompts are already selected
- [ ] Store in `area.customPrompt` field as: `"prompt 1, prompt 2, prompt 3"`

---

## 4. Polling Strategy

### Implementation Pattern

**Location**: `src/pages/LandscapeStudioEnhanced.tsx` (lines 403-538)

#### Key Characteristics

1. **Polling Interval**: 2 seconds
   ```typescript
   const pollInterval = setInterval(async () => {
     // ... polling logic
   }, 2000);
   ```

2. **Timeout**: 5 minutes (300,000ms)
   ```typescript
   setTimeout(() => {
     clearInterval(pollInterval);
     setCurrentJobId(null);
     if (renderStatus === 'loading') {
       setRenderStatus('error');
       toast.error('Generation timed out');
     }
   }, 300000);
   ```

3. **Progress Endpoint**
   ```typescript
   const progressData = await api.getGenerationProgress(response.request_id);
   ```

4. **Response Structure**
   ```typescript
   interface ProgressData {
     status: 'pending' | 'processing' | 'completed' | 'failed';
     front_yard?: AreaStatus;
     backyard?: AreaStatus;
     side_yard?: AreaStatus;
     walkway?: AreaStatus;
   }

   interface AreaStatus {
     status: 'pending' | 'processing' | 'completed' | 'failed';
     image?: string;  // Single image (front_yard)
     images?: Array<{image: string; angle: string}>;  // Multiple images (backyard)
   }
   ```

5. **Completion Check**
   ```typescript
   selectedAreas.forEach(area => {
     const areaKey = area.id === 'back_yard' ? 'backyard' : area.id;
     const areaData = progressData[areaKey];

     if (areaData?.status === 'completed') {
       completedCount++;
       // Check images[] first (backyard), then image (front_yard)
       if (areaData.images?.length > 0) {
         areaData.images.forEach((img: any) => {
           results.push({
             style: `${area.id} ${img.angle}`,
             result: { render: img.image }
           });
         });
       } else if (areaData.image) {
         results.push({
           style: area.id,
           result: { render: areaData.image }
         });
       }
     } else if (areaData?.status === 'failed') {
       failedCount++;
     }
   });

   const allDone = (completedCount + failedCount) === selectedAreas.length;
   ```

6. **Error Handling**
   - Continue polling even if progress fetch fails
   - Show partial results if some areas succeed
   - Clear interval on timeout or completion

### **v5 Adaptation Notes**
- Keep 2-second polling interval (good balance)
- Keep 5-minute timeout (reasonable for AI generation)
- Handle both single image (`image`) and multi-image (`images[]`) responses
- **Critical**: Check `images[]` first, then `image` (backyard uses array format)
- Count completed vs failed to show partial success messages
- Clear interval when `(completedCount + failedCount) === totalAreas`

---

## 5. localStorage Usage

### What's Stored

**Location**: `src/pages/LandscapeStudioEnhanced.tsx` (lines 398-399, 623-624)

```typescript
// Store request_id for recovery
localStorage.setItem('active_request_id', response.request_id);
localStorage.setItem('active_request_areas', JSON.stringify(selectedAreas.map(a => a.id)));
```

### When It's Saved
- **On generation start**: After successful API response with `request_id`

### When It's Cleared
- **On completion**: When all areas are done
  ```typescript
  localStorage.removeItem('active_request_id');
  localStorage.removeItem('active_request_areas');
  ```
- **On error**: When recovery fails
- **On timeout**: When 5-minute timeout is reached

### Recovery Logic

**Location**: `src/pages/LandscapeStudioEnhanced.tsx` (lines 197-259)

```typescript
const activeRequestId = localStorage.getItem('active_request_id');
if (activeRequestId && user) {
  console.log('Found active request_id, attempting recovery:', activeRequestId);
  try {
    const progressData = await api.getGenerationProgress(activeRequestId);

    if (progressData.status === 'completed') {
      // Recover completed results
      const results: any[] = [];
      const areaIds = JSON.parse(localStorage.getItem('active_request_areas') || '[]');

      areaIds.forEach((areaId: string) => {
        const areaKey = areaId === 'back_yard' ? 'backyard' : areaId;
        const areaData = progressData[areaKey];

        if (areaData?.status === 'completed') {
          if (areaData.image) {
            results.push({
              style: areaId.replace('_', ' '),
              result: { render: areaData.image }
            });
          } else if (areaData.images?.length > 0) {
            areaData.images.forEach((img: any) => {
              results.push({
                style: `${areaId} ${img.angle}`,
                result: { render: img.image }
              });
            });
          }
        }
      });

      if (results.length > 0) {
        setRenderStatus('success');
        setMultiResults(results);
        results.forEach(result => {
          addToGallery({
            address: currentAddress || 'Recovered',
            style: 'multi-area',
            render: result.result.render,
            timestamp: Date.now(),
          });
        });
        toast.success('Recovered completed generation results!');
      }

      // Clear the active request
      localStorage.removeItem('active_request_id');
      localStorage.removeItem('active_request_areas');
    }
  } catch (error) {
    console.error('Failed to recover results:', error);
    localStorage.removeItem('active_request_id');
    localStorage.removeItem('active_request_areas');
  }
}
```

### **v5 Implementation Checklist**
- [ ] Store `request_id` and `selectedAreas` in localStorage on generation start
- [ ] Check localStorage on app init (in `useEffect`)
- [ ] Attempt recovery only if user is authenticated
- [ ] Show toast notification on successful recovery
- [ ] Clear localStorage on completion, error, or timeout
- [ ] Handle both single and multi-image responses during recovery

---

## 6. API Integration Patterns

### Axios Instance Configuration

**Location**: `src/services/api.ts` (lines 11-17)

```typescript
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes for rendering
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Request Interceptor (Auth Token)

```typescript
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getAccessToken(); // Supabase
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to get auth token:', error);
    }
    return config;
  },
  (error) => {
    showErrorToast(error, 'Failed to send request');
    return Promise.reject(error);
  }
);
```

### Response Interceptor (Global Error Handling)

```typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    showErrorToast(error, 'An unexpected error occurred');
    return Promise.reject(error);
  }
);
```

### Error Handling Helper

**Critical**: CORS-aware error detection

```typescript
function isCorsError(error: any): boolean {
  return (
    error.message === 'Network Error' ||
    error.code === 'ERR_NETWORK' ||
    (error.response === undefined && error.request)
  );
}

function showErrorToast(error: any, defaultMessage: string): void {
  if (isCorsError(error)) {
    toast.error('Unable to connect to server. Please try again.');
    return;
  }

  if (error.response) {
    const status = error.response.status;
    switch (status) {
      case 401:
        toast.error('Please sign in to continue.');
        break;
      case 402:
        // Subscription quota errors - let component handle it
        break;
      case 429:
        toast.error('Too many requests. Please wait.');
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        toast.error('Server error. Please try again later.');
        break;
      default:
        toast.error(error.response.data?.error || defaultMessage);
    }
  }
}
```

### Complete Landscape Generation Endpoint

**Location**: `src/services/api.ts` (lines 474-517)

```typescript
async generateCompleteLandscape(params: FormData | {
  address: string;
  style: string;
  custom_prompt?: string;
  generate_360?: boolean;
}): Promise<ApiResponse<any>> {
  try {
    let formData: FormData;

    if (params instanceof FormData) {
      formData = params;
    } else {
      formData = new FormData();
      formData.append('address', params.address);
      formData.append('style', params.style);
      formData.append('custom_prompt', params.custom_prompt || '');
      formData.append('generate_360', params.generate_360 ? 'true' : 'false');
    }

    const response = await api.post('/api/design/complete-landscape', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      return {
        success: false,
        error: 'Please sign in to generate landscape designs',
        requiresAuth: true
      };
    }

    return {
      success: false,
      error: error.response?.data?.detail || 'Complete landscape generation failed',
    };
  }
}
```

### Progress Endpoint

```typescript
async getGenerationProgress(requestId: string): Promise<any> {
  try {
    const response = await api.get(`/api/design/progress/${requestId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to get progress');
  }
}
```

### **v5 Adaptation Notes**
- v5 backend endpoints:
  - Generation: `POST /v1/generations`
  - Progress: `GET /v1/generations/{id}`
- v5 uses `asyncpg` connection pool, not Firestore
- v5 request payload:
  ```typescript
  {
    location: string;
    areas: Array<{
      type: 'front_yard' | 'back_yard' | 'side_yard' | 'walkway';
      prompt: string;
    }>;
    transformation_intensity: number; // 0.0 to 1.0
  }
  ```
- v5 response:
  ```typescript
  {
    id: string; // generation_id
    status: 'pending' | 'processing' | 'completed' | 'failed';
    results?: Array<{
      area: string;
      image_url: string;
      prompt: string;
    }>;
  }
  ```

---

## 7. Animation Patterns

### Framer Motion Usage

**Common Patterns**:

1. **Page section entrance**
   ```tsx
   <motion.div
     initial={{ opacity: 0, y: 30 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ duration: 0.6, delay: 0.1 }}
   >
     {/* content */}
   </motion.div>
   ```

2. **Staggered sections**
   ```tsx
   {/* Section 1 */}
   <motion.div transition={{ delay: 0.1 }} />

   {/* Section 2 */}
   <motion.div transition={{ delay: 0.2 }} />

   {/* Section 3 */}
   <motion.div transition={{ delay: 0.3 }} />
   ```

3. **Selection badges**
   ```tsx
   <AnimatePresence>
     {isSelected && (
       <motion.div
         initial={{ scale: 0, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         exit={{ scale: 0, opacity: 0 }}
       >
         <Check className="w-4 h-4" />
       </motion.div>
     )}
   </AnimatePresence>
   ```

4. **Expanding panels** (custom prompts)
   ```tsx
   <AnimatePresence>
     {area.selected && (
       <motion.div
         initial={{ opacity: 0, height: 0, y: -10 }}
         animate={{ opacity: 1, height: 'auto', y: 0 }}
         exit={{ opacity: 0, height: 0, y: -10 }}
         transition={{ duration: 0.3, ease: "easeOut" }}
       >
         {/* custom prompt textarea */}
       </motion.div>
     )}
   </AnimatePresence>
   ```

5. **Progress bar fill**
   ```tsx
   <motion.div
     className="h-full bg-gradient-to-r from-sage-500 to-moss-600"
     initial={{ width: 0 }}
     animate={{ width: `${progress.progress}%` }}
     transition={{ duration: 0.5, ease: "easeOut" }}
   />
   ```

### **v5 Adaptation Notes**
- Maintain the staggered entrance pattern (delay: 0.1, 0.2, 0.3)
- Use `AnimatePresence` for conditional renders (badges, panels)
- Keep the `ease: "easeOut"` timing function for smooth animations
- Progress bar animation is critical for perceived performance

---

## 8. Results Display Component

### MultiResultsDisplay Component

**Location**: `src/components/MultiResultsDisplay.tsx`

#### Props Interface
```typescript
interface MultiResultsDisplayProps {
  results: Array<{
    style: string;
    result: RenderResult;
  }>;
  originalImage?: string;
  onDownload: (imageUrl: string, styleName: string) => void;
  isTrial?: boolean;
  canDownload?: boolean;
}
```

#### Key Features

1. **Tab-based navigation**
   - Style tabs at top showing all generated areas
   - Active tab highlighted with gradient
   - Shows favorites with Star icon

2. **Main image display**
   - Large centered image
   - Style badge overlay (top-left)
   - Watermark for trial users (bottom-right)
   - Fullscreen button

3. **Thumbnail gallery** (if multiple results)
   - Horizontal scroll
   - Click to switch
   - Shows favorite star badge

4. **Download controls**
   - Single download button
   - "Download All" button for multiple results
   - Disabled state for trial users
   - Social share dropdown (Twitter, Facebook, Instagram)

5. **Navigation arrows**
   - Previous/Next buttons
   - Dot indicators (active dot is wider)

6. **Style color mapping**
   ```typescript
   const getStyleColor = (styleName: string) => {
     const name = styleName.toLowerCase();
     if (name.includes('modern')) return 'from-slate-400 to-slate-600';
     if (name.includes('native')) return 'from-amber-400 to-orange-600';
     if (name.includes('zen')) return 'from-emerald-400 to-green-600';
     return 'from-sage-400 to-sage-600';
   };
   ```

### **v5 Adaptation Notes**
- Keep the tab-based navigation for multiple areas
- Maintain the thumbnail gallery pattern
- Use style-specific gradient colors
- Show trial watermark if user has trial credits
- Disable downloads for trial users (show upgrade CTA)

---

## 9. Critical Differences: v2 vs v5

| Feature | v2 | v5 |
|---------|----|----|
| **Backend** | Firebase Functions + Firestore | FastAPI + PostgreSQL (Supabase) |
| **Generation Endpoint** | `/api/design/complete-landscape` | `/v1/generations` |
| **Progress Endpoint** | `/api/design/progress/:id` | `/v1/generations/:id` |
| **Request Payload** | FormData with `generate_front_yard: 'true'` | JSON with `areas: [{ type, prompt }]` |
| **Response Structure** | `{ front_yard: { image }, backyard: { images: [] } }` | `{ id, status, results: [{ area, image_url }] }` |
| **Auth** | Firebase Auth → Supabase Auth | Supabase Auth (already migrated) |
| **State Management** | Zustand + localStorage | Zustand (userStore) |
| **Image Storage** | Firebase Storage | Vercel Blob |
| **Payment System** | Stripe webhooks → Firestore | Stripe webhooks → PostgreSQL |

---

## 10. Implementation Roadmap for v5

### Phase 1: Component Porting
- [ ] Create `SuperMinimalAddressInput` component
  - [ ] Emoji icons (MapPin → Search → CheckCircle)
  - [ ] Focus states and gradient animation
  - [ ] Validation indicator
- [ ] Create `SuperMinimalYardSelector` component
  - [ ] Yard area cards with color gradients
  - [ ] Suggested prompts system (emoji mapping)
  - [ ] Max 3 prompts per area
  - [ ] Expandable custom prompt input
- [ ] Create `SuperMinimalStyleSelector` component
  - [ ] Emoji-based style icons
  - [ ] Max 3 styles selection
  - [ ] Numbered badges (1, 2, 3)

### Phase 2: Suggested Prompts
- [ ] Define `suggestedPrompts` object (5 per area)
- [ ] Implement `getPromptEmoji()` function (30+ keywords)
- [ ] Clickable chips with toggle logic
- [ ] Store as comma-separated string in `area.customPrompt`

### Phase 3: API Integration
- [ ] Adapt generation endpoint to v5 backend
  - [ ] Map v2 FormData to v5 JSON payload
  - [ ] Transform `generate_front_yard: 'true'` → `areas: [{ type: 'front_yard' }]`
- [ ] Implement 2-second polling with 5-minute timeout
- [ ] Handle both single and multi-image responses

### Phase 4: State & localStorage
- [ ] Add `multiResults` to userStore
- [ ] Persist with Zustand middleware
- [ ] Store `request_id` in localStorage
- [ ] Implement recovery logic on app init

### Phase 5: Results Display
- [ ] Port `MultiResultsDisplay` component
- [ ] Tab navigation for multiple areas
- [ ] Thumbnail gallery
- [ ] Download controls (disabled for trial)
- [ ] Social share integration

### Phase 6: Animations
- [ ] Framer Motion for all SuperMinimal components
- [ ] Staggered entrance animations (0.1s, 0.2s, 0.3s delays)
- [ ] Expandable panels with `AnimatePresence`
- [ ] Progress bar animation

---

## 11. Quick Reference: Code Snippets

### Suggested Prompts Data (Copy-Paste Ready)

```typescript
const suggestedPrompts = {
  front_yard: [
    "colorful flower beds with seasonal blooms",
    "drought-tolerant native plants with decorative rocks",
    "modern minimalist design with ornamental grasses",
    "welcoming pathway with symmetrical plantings",
    "vibrant perennial garden with butterfly-friendly flowers"
  ],
  back_yard: [
    "entertainment area with patio and outdoor seating",
    "vegetable garden with raised beds",
    "zen meditation garden with water feature",
    "privacy screening with tall shrubs and trees",
    "outdoor dining space with pergola and ambient lighting"
  ],
  side_yard: [
    "narrow pathway with shade-loving plants",
    "vertical garden with climbing vines",
    "decorative screening with bamboo",
    "utility area with storage and compost",
    "hidden reading nook with seating"
  ],
  walkway: [
    "curved pathway with colorful border plants",
    "straight walkway with symmetrical hedges",
    "stepping stone path through ground cover",
    "illuminated pathway with solar lights",
    "rustic gravel path with native wildflowers"
  ]
};
```

### Emoji Mapping Function (Copy-Paste Ready)

```typescript
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

  // Entertainment
  if (lowerPrompt.includes('entertainment') || lowerPrompt.includes('outdoor living')) return '🎭';
  if (lowerPrompt.includes('vegetable') || lowerPrompt.includes('garden')) return '🥬';
  if (lowerPrompt.includes('zen') || lowerPrompt.includes('meditation')) return '🧘';

  // Lighting
  if (lowerPrompt.includes('light') || lowerPrompt.includes('solar')) return '💡';
  if (lowerPrompt.includes('pergola') || lowerPrompt.includes('shade')) return '⛱️';

  // Privacy
  if (lowerPrompt.includes('privacy') || lowerPrompt.includes('screening')) return '🌲';
  if (lowerPrompt.includes('hedge')) return '🌳';

  // Design styles
  if (lowerPrompt.includes('modern') || lowerPrompt.includes('minimalist')) return '✨';
  if (lowerPrompt.includes('rustic') || lowerPrompt.includes('gravel')) return '🏞️';
  if (lowerPrompt.includes('curved') || lowerPrompt.includes('symmetrical')) return '〰️';

  // Default
  return '🌱';
};
```

### Polling Logic (Copy-Paste Ready)

```typescript
const pollInterval = setInterval(async () => {
  try {
    const progressData = await api.getGenerationProgress(requestId);

    let completedCount = 0;
    let failedCount = 0;
    const results: any[] = [];

    selectedAreas.forEach(area => {
      const areaKey = area.id === 'back_yard' ? 'backyard' : area.id;
      const areaData = progressData[areaKey];

      if (areaData?.status === 'completed') {
        completedCount++;

        // Check images[] first (backyard), then image (front_yard)
        if (areaData.images?.length > 0) {
          areaData.images.forEach((img: any) => {
            results.push({
              style: `${area.id} ${img.angle}`,
              result: { render: img.image }
            });
          });
        } else if (areaData.image) {
          results.push({
            style: area.id,
            result: { render: areaData.image }
          });
        }
      } else if (areaData?.status === 'failed') {
        failedCount++;
      }
    });

    const allDone = (completedCount + failedCount) === selectedAreas.length;

    if (allDone) {
      clearInterval(pollInterval);
      localStorage.removeItem('active_request_id');
      localStorage.removeItem('active_request_areas');

      if (completedCount > 0) {
        setRenderStatus('success');
        setMultiResults(results);
        toast.success('Generation complete!');
      } else {
        setRenderStatus('error');
        toast.error('Generation failed');
      }
    }
  } catch (error) {
    console.error('Progress polling error:', error);
  }
}, 2000); // Poll every 2 seconds

// Timeout after 5 minutes
setTimeout(() => {
  clearInterval(pollInterval);
  if (renderStatus === 'loading') {
    setRenderStatus('error');
    toast.error('Generation timed out');
  }
}, 300000);
```

---

## Summary

**Key Takeaways for v5 Implementation**:

1. **SuperMinimal components** use emoji icons, subtle gradients, and smooth Framer Motion animations
2. **Suggested prompts** are the killer feature - max 3 per area, emoji-prefixed chips, comma-separated storage
3. **Polling** is 2-second intervals with 5-minute timeout, checking `(completed + failed) === total`
4. **localStorage** stores `request_id` and `selectedAreas` for recovery on page reload
5. **Response handling** checks `images[]` first (backyard), then `image` (front_yard)
6. **State persistence** uses Zustand middleware, but DON'T persist `renderStatus` or `error`
7. **Animations** use staggered delays (0.1s, 0.2s, 0.3s) with `AnimatePresence` for conditional renders

**Most Critical Patterns to Port**:
- ✅ Suggested prompts system with emoji mapping
- ✅ Max 3 prompts per area, comma-separated
- ✅ Polling logic with completion check
- ✅ localStorage recovery on app init
- ✅ Multi-image vs single-image response handling
- ✅ Framer Motion animations throughout

---

**End of Analysis**
