# Generation History Components - Visual Structure

## Component Hierarchy

```
History Page (/history)
├── Header
│   ├── Logo
│   └── Navigation (Dashboard, Generate, Account)
│
├── Page Title
│   ├── "Generation History"
│   └── "View all your landscape design generations"
│
├── GenerationHistory Component
│   │
│   ├── Filter Controls
│   │   ├── Status Filter Dropdown [data-testid="status-filter"]
│   │   │   ├── All
│   │   │   ├── Pending
│   │   │   ├── Processing
│   │   │   ├── Completed
│   │   │   └── Failed
│   │   └── Results Count Display
│   │
│   ├── Generations Grid
│   │   └── GenerationCard (multiple) [data-testid="generation-card"]
│   │       ├── Thumbnail Image [data-testid="generation-thumbnail"]
│   │       ├── Status Badge [data-testid="generation-status"]
│   │       ├── Credit Type Badge [data-testid="credit-type"]
│   │       ├── Style
│   │       ├── Input (Address or "Photo Upload")
│   │       ├── Custom Prompt (if present)
│   │       └── Processing Time [data-testid="processing-time"]
│   │
│   ├── Pagination Controls
│   │   ├── Previous Button [data-testid="pagination-prev"]
│   │   ├── Page X of Y
│   │   └── Next Button [data-testid="pagination-next"]
│   │
│   └── Empty State [data-testid="empty-history"]
│       ├── Emoji 🎨
│       ├── "No generations yet"
│       ├── "Create your first landscape design to get started!"
│       └── Generate Design Button [data-testid="create-first-generation"]
│
├── Footer
│   ├── Copyright
│   └── Links (Privacy, Terms, Support)
│
└── GenerationModal (conditional) [data-testid="generation-modal"]
    ├── Close Button [data-testid="close-modal"]
    ├── Large Output Image [data-testid="modal-output-image"]
    ├── Status Badge [data-testid="modal-status"]
    ├── Credit Type Badge [data-testid="modal-credit-type"]
    ├── Input Section [data-testid="modal-address"]
    ├── Style Section [data-testid="modal-style"]
    ├── Custom Prompt Section [data-testid="modal-prompt"] (conditional)
    ├── Processing Time [data-testid="modal-processing-time"]
    ├── Created Timestamp
    └── Error Message (if failed)
```

## State Flow

```
User navigates to /history
    ↓
History Page checks authentication
    ↓ (authenticated)
GenerationHistory component mounts
    ↓
useEffect triggers fetchGenerations()
    ↓
generationStore.fetchGenerations()
    ↓
apiClient.getGenerationHistory()
    ↓
Backend GET /api/generations?limit=10&offset=0
    ↓
Backend returns GenerationListResponse
    ↓
Store updates: generations, totalCount, isLoading=false
    ↓
Component re-renders with data
    ↓
Displays grid of GenerationCards

User interactions:
├── Click GenerationCard → setSelectedGeneration() → Modal opens
├── Click status filter → setStatusFilter() → Refetch with filter, reset to page 1
├── Click Next → nextPage() → Fetch next page with same filter
└── Click Previous → prevPage() → Fetch previous page with same filter
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Backend API                          │
│  GET /api/generations?limit=10&offset=0&status=completed    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ { items: [...], total: 25, limit: 10, offset: 0 }
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                  apiClient.getGenerationHistory()            │
│        Transforms: items → generations                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ { generations: [...], total: 25, limit: 10, offset: 0 }
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    generationStore                           │
│  State: { generations, totalCount, currentPage, ...}         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ generations array
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                 GenerationHistory Component                  │
│          Maps over generations array                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ For each generation
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   GenerationCard Component                   │
│          Displays single generation                          │
└─────────────────────────────────────────────────────────────┘
```

## User Flows

### Flow 1: First Time User (Empty State)
```
1. User navigates to /history
2. No generations exist
3. Sees empty state with 🎨 emoji
4. Clicks "Generate Design" button
5. Navigates to /generate page
```

### Flow 2: View Generation Details
```
1. User navigates to /history
2. Sees grid of generation cards
3. Clicks on a card
4. Modal opens with full details
5. Clicks X button or outside modal
6. Modal closes
```

### Flow 3: Filter by Status
```
1. User navigates to /history
2. Sees all generations
3. Selects "completed" from filter dropdown
4. Page resets to 1
5. Only completed generations shown
6. Pagination updates to show new total
```

### Flow 4: Paginate Through History
```
1. User navigates to /history
2. Has 25 generations
3. Sees page 1 of 3 (10 per page)
4. Clicks "Next" button
5. Fetches and displays page 2
6. "Previous" button becomes enabled
7. Can navigate back and forth
```

## Styling Reference

### Color Palette
```css
/* Primary Gradient */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Background Gradient */
background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);

/* Status Colors */
.completed {
  background: #c6f6d5; /* Green */
  color: #22543d;
}

.failed {
  background: #fed7d7; /* Red */
  color: #742a2a;
}

.processing, .pending {
  background: #feebc8; /* Orange */
  color: #744210;
}

/* Text Colors */
--text-primary: #2d3748;
--text-secondary: #4a5568;
--text-tertiary: #718096;
```

### Key Measurements
```css
/* Card */
.generation-card {
  border-radius: 12px;
  min-width: 350px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Hover Effect */
.generation-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

/* Grid */
.generations-grid {
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
}

/* Modal */
.generation-modal {
  max-width: 800px;
  max-height: 90vh;
  border-radius: 16px;
}
```

## Responsive Breakpoints

```css
/* Mobile (< 768px) */
@media (max-width: 768px) {
  - Single column grid
  - Stacked navigation
  - Reduced padding
  - Smaller text sizes
}

/* Tablet (768px - 1024px) */
- 2 column grid
- Full navigation

/* Desktop (> 1024px) */
- 3+ column grid (auto-fill)
- Maximum width 1200px container
```

## Accessibility Features

- ✅ Semantic HTML (header, main, footer, nav)
- ✅ Clear button labels
- ✅ Keyboard navigable (all buttons/links)
- ✅ ARIA labels on interactive elements
- ✅ Focus states on interactive elements
- ✅ High contrast text
- ✅ Disabled state indicators
- ✅ Loading state announcements

## Animation & Transitions

```css
/* Smooth transitions on hover */
transition: transform 0.2s, box-shadow 0.2s, color 0.2s;

/* Loading spinner */
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Modal entrance (could be added) */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

## Performance Considerations

1. **Pagination:** Only loads 10 items at a time
2. **Image Loading:** Browser native lazy loading on <img>
3. **Memoization:** Could add React.memo to GenerationCard
4. **Virtual Scrolling:** Could be added for 100+ items
5. **Debouncing:** Not needed for this implementation (filter on select, not input)

## Testing Checklist

### Unit Tests (Could be added)
- [ ] GenerationCard renders correctly
- [ ] GenerationModal displays all fields
- [ ] generationStore actions work correctly
- [ ] API client formats requests correctly

### Integration Tests ✅
- [x] Backend pagination works
- [x] Backend filtering works
- [x] Backend ordering works
- [x] User isolation works

### E2E Tests ✅
- [x] Display all generations
- [x] Show details in cards
- [x] Status badges display
- [x] Credit type displays
- [x] Reverse chronological order
- [x] Empty state shows
- [x] Pagination works
- [x] Status filtering works
- [x] Modal opens/closes
- [x] Processing time shows
- [x] Thumbnails display

### Manual Testing
- [ ] Mobile responsiveness
- [ ] Cross-browser (Chrome, Firefox, Safari)
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Performance with 100+ generations
- [ ] Error states
- [ ] Loading states
- [ ] Network failure handling
