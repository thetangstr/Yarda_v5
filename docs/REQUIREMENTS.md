# Product Requirements & Features

Complete feature specifications and business logic for Yarda AI Landscape Studio.

## Table of Contents

- [Active Features](#active-features)
- [Feature 004: Generation Flow](#feature-004-generation-flow)
- [Feature 005: Single-Page Generation](#feature-005-single-page-generation)
- [Feature 006: Internationalization](#feature-006-internationalization-i18n)
- [Feature 007: Holiday Decorator](#feature-007-holiday-decorator)
- [Business Logic Systems](#business-logic-systems)
- [Changelog](#changelog)

---

## Active Features

| Feature | Status | Description |
|---------|--------|-------------|
| Authentication | ✅ Production | Google OAuth + Magic Link (passwordless) |
| Trial System | ✅ Production | 3 free credits on registration |
| Token System | ✅ Production | Pay-per-use packages via Stripe |
| Subscriptions | ✅ Production | Monthly Pro plan ($99/month, unlimited) |
| Generation Flow (004) | ✅ Production | AI landscape design generation |
| Single-Page Flow (005) | ✅ Production | Inline progress and results |
| Internationalization (006) | ✅ Production | Multi-language support (en, es, zh) |
| Holiday Decorator (007) | ✅ Production | Viral marketing with social credits |

---

## Feature 004: Generation Flow

### Overview
AI-powered landscape design generation with Google Maps integration and perspective-based rendering.

### User Stories

**As a user, I want to:**
- Generate landscape designs for my property address
- See transformations for different yard areas (front, back, walkway)
- Provide a custom design prompt for personalization
- Track generation progress in real-time
- Download my generated designs

### Acceptance Criteria

**Functional Requirements:**
- [x] User can enter a valid address (geocoded via Google Maps)
- [x] User can select multiple yard areas (front_yard, backyard, walkway)
- [x] User can provide a custom transformation prompt
- [x] System fetches Google Maps imagery (Street View + Satellite)
- [x] AI generates designs within 2 minutes per area
- [x] User sees progress updates every 2 seconds
- [x] User can download generated images

**Technical Requirements:**
- [x] Credit validation before generation (trial/token/subscription)
- [x] Atomic credit deduction with row-level locking
- [x] Async generation processing (non-blocking API)
- [x] Polling-based status tracking
- [x] Image storage in Vercel Blob with signed URLs

### Business Logic

#### Generation Endpoint: `POST /v1/generations`

**Request:**
```json
{
  "address": "123 Main St, San Francisco, CA",
  "areas": ["front_yard", "backyard"],
  "prompt": "Modern minimalist patio with drought-resistant plants"
}
```

**Process:**
1. Validate user has credits (trial, tokens, or active subscription)
2. Geocode address via Google Maps Geocoding API
3. Fetch imagery for each area:
   - **Front Yard:** Street View (matches house perspective)
   - **Backyard:** Satellite (overhead view)
   - **Walkway:** Satellite (overhead view)
4. Upload images to Vercel Blob storage
5. Create generation record with `status: pending`
6. Deduct credits atomically (`FOR UPDATE NOWAIT`)
7. Queue async Gemini image generation task
8. Return generation ID immediately

**Response:**
```json
{
  "id": "gen_123",
  "status": "pending",
  "user_id": "user_456",
  "credits_remaining": 2,
  "estimated_completion_seconds": 120
}
```

#### Status Tracking: `GET /v1/generations/{id}`

**Statuses:**
- `pending` - Generation queued, not started
- `processing` - AI generation in progress
- `completed` - Success, images ready
- `failed` - Error occurred

**Polling Strategy:**
- Frontend polls every 2 seconds
- Max timeout: 5 minutes (150 attempts)
- Server returns updated status each poll

### Perspective-Based Generation (Critical Concept)

**IMPORTANT:** Satellite imagery is used as **REFERENCE ONLY**, not transformed directly.

**Area-Specific Perspectives:**

| Area | Input Image | AI Output | Perspective Change |
|------|-------------|-----------|-------------------|
| Front Yard | Street View (ground-level) | Transformed landscape (same angle) | ❌ No change |
| Backyard | Satellite (overhead) | **NEW** 45-degree architectural rendering | ✅ Yes - overhead → angled |
| Walkway | Satellite (overhead) | **NEW** ground-level photo | ✅ Yes - overhead → ground |

**Prompt Engineering:**
The prompt builder (`backend/src/services/prompt_builder.py`) explicitly instructs Gemini to:
- **Front Yard:** "Transform this street-level photo..."
- **Backyard:** "CREATE A NEW IMAGE showing a 45-degree architectural perspective view (NOT a modified satellite view)"
- **Walkway:** "CREATE A NEW IMAGE from ground-level perspective (NOT a modified satellite view)"

**Why This Matters:**
- Gemini needs crystal-clear instructions to change perspective vs. transform
- Wrong: "Transform this overhead view" → Returns unchanged satellite image
- Correct: "Use as reference, create 45-degree rendering" → Professional visualization

**See also:** `PERSPECTIVE_GENERATION_APPROACH.md` for detailed explanation

### Key Files

- **Backend API:** `backend/src/api/endpoints/generations.py`
- **Generation Service:** `backend/src/services/generation_service.py`
- **Maps Service:** `backend/src/services/maps_service.py`
- **Gemini Client:** `backend/src/services/gemini_client.py`
- **Prompt Builder:** `backend/src/services/prompt_builder.py` (lines 97-231)
- **Frontend Page:** `frontend/src/pages/generate.tsx`

---

## Feature 005: Single-Page Generation

### Overview
All generation interactions on one page without navigation for seamless UX.

### User Stories

**As a user, I want to:**
- Stay on the same page throughout the generation process
- See inline progress updates without page refresh
- View results inline when generation completes
- Create a new generation without page reload

### Acceptance Criteria

**Functional Requirements:**
- [x] Form, progress, and results all render on `/generate` page
- [x] No page navigation during generation flow
- [x] Progress updates appear inline below form
- [x] Results display inline below progress when complete
- [x] "Create New Design" button resets to form view
- [x] LocalStorage recovery if user refreshes during generation

**Technical Requirements:**
- [x] Polling every 2 seconds with 5-minute timeout
- [x] State management with Zustand (selective persistence)
- [x] LocalStorage saves `request_id` for recovery
- [x] Network error handling with auto-retry
- [x] Graceful timeout messaging

### Business Logic

#### State Management Pattern

```typescript
// frontend/src/store/generationStore.ts
interface GenerationStore {
  // Form state (persisted to localStorage)
  formData: {
    address: string;
    areas: string[];
    prompt: string;
  };

  // Polling state (transient, NOT persisted)
  currentGenerationId: string | null;
  isPolling: boolean;
  pollAttempts: number;
}
```

**Why Selective Persistence:**
- Form data persisted: User can refresh and continue typing
- Polling state NOT persisted: Prevents stale polling on page reload
- Separate `request_id` in localStorage for recovery

#### LocalStorage Recovery Flow

```typescript
// On component mount
useEffect(() => {
  const savedRequestId = localStorage.getItem('current_generation_request');

  if (savedRequestId) {
    // Resume polling
    pollGenerationStatus(savedRequestId);
  }
}, []);

// On submit
const handleSubmit = async () => {
  const { id } = await generationsAPI.create(formData);
  localStorage.setItem('current_generation_request', id); // Save for recovery
  startPolling(id);
};

// On completion
const handleComplete = () => {
  localStorage.removeItem('current_generation_request'); // Clear
  setGenerationState('results');
};
```

### Components

**GenerationProgressInline:**
- Per-area progress cards with emojis
- Status: `pending`, `processing`, `completed`, `failed`
- Animated loading states
- Estimated time remaining

**GenerationResultsInline:**
- Image gallery with before/after comparisons
- Download buttons for each image
- Modal viewer for fullscreen
- "Create New Design" CTA button

### Key Files

- **Page:** `frontend/src/pages/generate.tsx`
- **Progress Component:** `frontend/src/components/GenerationProgressInline.tsx`
- **Results Component:** `frontend/src/components/GenerationResultsInline.tsx`
- **Polling Utils:** `frontend/src/lib/api.ts` (`pollGenerationStatus()`)
- **Store:** `frontend/src/store/generationStore.ts`
- **LocalStorage Keys:** `frontend/src/lib/localStorage-keys.ts`

---

## Feature 006: Internationalization (i18n)

### Overview
Multi-language UI support with persistent user preferences. Supports English, Spanish (Español), and Chinese Simplified (中文).

### User Stories

**As a user, I want to:**
- Switch the UI language between English, Spanish, and Chinese
- Have my language preference persist across sessions
- See the app in my preferred language immediately on login

### Acceptance Criteria

**Functional Requirements:**
- [x] Language switcher visible in navigation
- [x] Supports English (en), Spanish (es), Chinese Simplified (zh)
- [x] Translations for all UI strings
- [x] Language preference persists to database for authenticated users
- [x] Language preference persists to localStorage for non-authenticated users
- [x] Automatic language sync on user login

**Technical Requirements:**
- [x] Backend API endpoints for language preferences
- [x] React Context for language state management
- [x] Dynamic translation file loading
- [x] Silent error handling for auth failures (non-critical feature)
- [x] ARIA accessibility attributes on switcher

### Architecture

**Three-Layer Approach:**
1. **Static translations:** JSON files per language (`public/locales/{lang}/common.json`)
2. **Client-side state:** React Context with Zustand integration
3. **Server persistence:** Database column `users.preferred_language`

### Data Flow (Authenticated User)

```
1. User logs in via Supabase → JWT stored in Zustand
   ↓
2. LanguageContext detects authentication → calls usersAPI.getProfile()
   ↓
3. Backend returns user's preferred_language from database
   ↓
4. LanguageContext loads translations for that language
   ↓
5. User switches language → usersAPI.updateLanguagePreference()
   ↓
6. Backend updates users.preferred_language
   ↓
7. On page reload, LanguageContext refetches profile and restores preference
```

### Data Flow (Non-Authenticated User)

```
1. App loads → LanguageContext loads English (default) translations
   ↓
2. User selects language → stored in localStorage (key: preferred-locale)
   ↓
3. On page reload, LanguageContext reads localStorage and loads translations
   ↓
4. Translations do NOT sync to backend until user authenticates
```

### API Endpoints

**GET /v1/users/me/profile**
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "preferred_language": "es"
}
```

**PUT /v1/users/preferences/language**
```json
Request: { "language": "zh" }
Response: { "success": true, "language": "zh" }
```

### Translation Function Usage

```typescript
import { useLanguage } from '@/context/LanguageContext';

const MyComponent = () => {
  const { t, locale } = useLanguage();

  return (
    <div>
      <h1>{t('common.welcome', 'Welcome')}</h1>
      <p>{t('common.description', 'AI landscape design')}</p>
      <span>Current: {locale}</span>
    </div>
  );
};
```

### Adding New Languages

1. Create translation file: `frontend/public/locales/{lang-code}/common.json`
2. Translate all keys from English version
3. Update `isValidLocale()` in `frontend/src/i18n.config.ts`
4. Add option to LanguageSwitcher dropdown
5. Update backend validation (no migration needed)

### Key Files

- **Translation Files:** `frontend/public/locales/{en,es,zh}/common.json`
- **Config:** `frontend/src/i18n.config.ts`
- **Loader:** `frontend/src/lib/i18n/loader.ts`
- **Context:** `frontend/src/context/LanguageContext.tsx`
- **Switcher Component:** `frontend/src/components/LanguageSwitcher.tsx`
- **API:** `frontend/src/lib/api.ts` (usersAPI methods)
- **Backend:** `backend/src/api/endpoints/users.py`
- **Migration:** `supabase/migrations/016_add_language_preference.sql`

---

## Feature 007: Holiday Decorator

### Overview
Viral marketing feature with separate credit system for holiday season. Users get free holiday-specific generations and earn credits through social sharing.

### User Stories

**As a user, I want to:**
- Decorate my house for holidays using AI
- Get 1 free holiday credit on signup
- Earn credits by sharing my designs on social media
- See different holiday styles (Christmas, Halloween, etc.)

### Acceptance Criteria

**Functional Requirements:**
- [x] 1 free holiday credit on signup during season
- [x] Earn 1 credit per social share (max 3/day)
- [x] Select holiday style (Christmas, Halloween, etc.)
- [x] Rotate Street View to find best house angle
- [x] Generate before/after comparison images
- [x] Social sharing buttons (Facebook, Twitter, Instagram)

**Technical Requirements:**
- [x] Separate credit system from main credits
- [x] Atomic credit deduction (`FOR UPDATE NOWAIT`)
- [x] Credit deduction BEFORE generation (prevents free gens on failure)
- [x] Social share tracking (prevent duplicate credit awards)
- [x] Daily limit enforcement (max 3 shares/day)

### Credit System

**Credit Rules:**
- 1 free credit on first visit (during holiday season)
- Earn 1 credit per unique social share
- Max 3 credits per day from sharing
- Credits expire at end of holiday season

**Atomic Deduction (CRITICAL):**
```python
# backend/src/services/holiday_credit_service.py
async def use_credit(self, user_id: str):
    async with self.db_pool.transaction() as conn:
        # Lock row to prevent race conditions
        user = await conn.fetchrow("""
            SELECT holiday_credits FROM users
            WHERE id = $1 FOR UPDATE NOWAIT
        """, user_id)

        if user['holiday_credits'] < 1:
            raise InsufficientCreditsError()

        # Deduct credit atomically
        await conn.execute("""
            UPDATE users
            SET holiday_credits = holiday_credits - 1
            WHERE id = $1
        """, user_id)
```

### API Endpoints

**POST /v1/holiday/generations**
```json
Request:
{
  "address": "123 Main St",
  "heading": 90,  // Street View heading (0-360)
  "pitch": 0,     // Street View pitch
  "style": "christmas"
}

Response:
{
  "id": "holiday_gen_123",
  "status": "pending",
  "credits_remaining": 0,
  "original_image_url": "https://...",
  "decorated_image_url": null,  // Populated when complete
  "estimated_completion_seconds": 10
}
```

**GET /v1/holiday/credits**
```json
{
  "credits": 2,
  "shares_today": 1,
  "max_shares_per_day": 3
}
```

### Response Model Pattern (CRITICAL)

All endpoints MUST return complete `HolidayGenerationResponse` with ALL required fields:

```python
# ✅ CORRECT - Fetch complete record and return all fields
generation = await generation_service.get_generation(generation_id)
user_credits = await db_pool.fetchval(
    "SELECT holiday_credits FROM users WHERE id = $1",
    user_id
)

return HolidayGenerationResponse(
    id=str(generation['id']),
    user_id=str(generation['user_id']),
    address=generation['address'],
    location={
        "lat": float(generation['geocoded_lat']),
        "lng": float(generation['geocoded_lng'])
    },
    street_view_heading=generation['heading'],
    street_view_pitch=generation['pitch'],
    style=generation['style'],
    status=generation['status'],
    original_image_url=generation['original_image_url'],
    decorated_image_url=generation.get('decorated_image_url'),
    before_after_image_url=generation.get('before_after_image_url'),
    credits_remaining=user_credits or 0,
    created_at=generation['created_at'],
    estimated_completion_seconds=10,
    error_message=generation.get('error_message')
)
```

**Field Conventions:**
- LocationCoordinates uses `lat`/`lng` (NOT `latitude`/`longitude`)
- Always convert UUIDs to strings: `str(generation['id'])`
- Always cast floats: `float(generation['geocoded_lat'])`

### Frontend Components

- **HolidayHero:** Landing section with CTA
- **StreetViewRotator:** Interactive Street View with heading control
- **StyleSelector:** Holiday style picker (Christmas, Halloween, etc.)
- **SocialShareButtons:** Facebook, Twitter, Instagram sharing

### Key Files

- **Backend API:** `backend/src/api/endpoints/holiday.py`
- **Credit Service:** `backend/src/services/holiday_credit_service.py`
- **Generation Service:** `backend/src/services/holiday_generation_service.py`
- **Models:** `backend/src/models/holiday.py`
- **Frontend Page:** `frontend/src/pages/holiday.tsx`
- **Migration:** `supabase/migrations/012_add_holiday_decorator.sql`

---

## Business Logic Systems

### Trial System

**Rules:**
- 3 free credits on registration
- Atomic deduction with `FOR UPDATE NOWAIT`
- Shows "trial exhausted" modal when `trial_remaining = 0`
- Cannot go negative (validation before deduction)

**Service:** `backend/src/services/trial_service.py`

**Method:**
```python
async def use_trial_credit(self, user_id: str, cost: int = 1):
    async with self.db_pool.transaction() as conn:
        user = await conn.fetchrow("""
            SELECT trial_remaining FROM users
            WHERE id = $1 FOR UPDATE NOWAIT
        """, user_id)

        if user['trial_remaining'] < cost:
            raise InsufficientTrialCreditsError()

        await conn.execute("""
            UPDATE users
            SET trial_remaining = trial_remaining - $1,
                trial_used = trial_used + $1
            WHERE id = $2
        """, cost, user_id)
```

### Token System

**Rules:**
- Pay-per-use packages via Stripe Checkout
- Webhook handler processes payments: `/v1/webhooks/stripe`
- Atomic operations prevent negative balances
- Idempotency keys for webhook deduplication

**Packages:**
- Starter: 10 tokens, $9.99
- Pro: 50 tokens, $39.99
- Enterprise: 200 tokens, $129.99

**Service:** `backend/src/services/token_service.py`

**Webhook Handler:**
```python
# backend/src/api/endpoints/webhooks.py
@router.post("/stripe")
async def stripe_webhook(request: Request):
    # Verify signature
    signature = request.headers.get("stripe-signature")
    event = stripe.Webhook.construct_event(
        await request.body(),
        signature,
        STRIPE_WEBHOOK_SECRET
    )

    # Check idempotency
    if await is_event_processed(event.id):
        return {"status": "duplicate"}

    # Process payment
    if event.type == "checkout.session.completed":
        await token_service.add_tokens(
            user_id=event.data.object.metadata.user_id,
            amount=event.data.object.metadata.token_amount
        )

    # Store event to prevent duplicates
    await mark_event_processed(event.id)
```

### Subscription System

**Rules:**
- Monthly Pro: $99/month, unlimited generations
- Active subscription bypasses token/trial checks
- Stripe Customer Portal for self-service management
- Graceful fallback to tokens when subscription expires

**Plans:**
- Free: 3 trial credits only
- Pro: $99/month, unlimited generations
- Enterprise: Custom pricing

**Service:** `backend/src/services/subscription_service.py`

**Credit Check Logic:**
```python
async def has_sufficient_credits(user_id: str):
    user = await get_user(user_id)

    # Check subscription first (highest priority)
    if user['subscription_status'] == 'active':
        return True

    # Check tokens
    if user['token_balance'] > 0:
        return True

    # Check trials
    if user['trial_remaining'] > 0:
        return True

    return False
```

---

## Changelog

### 2025-11-13: Internationalization (i18n) System ✅

**Complete Feature Implementation:**
- Backend API endpoints for language management
- Frontend React Context with Zustand integration
- Language persistence to database
- Three-language support: English, Spanish, Chinese
- E2E tests (27/40 passing)

**Critical Bug Fixes:**
- Fixed `/v1/users` endpoint routing (was missing `/v1` prefix)
- Fixed E2E test localStorage access pattern
- Added silent error handling for auth errors in LanguageContext

**Features:**
- Automatic language sync on user login
- Persistent language preference in database
- Fallback to localStorage for non-authenticated users
- Dynamic translation file loading
- Full ARIA accessibility support

### 2025-11-08: Integration Success ✅

- End-to-end generation flow verified working (~15 seconds)
- Google Maps API integration operational (geocoding, Street View)

### 2025-11-07: Feature 005 Single-Page Generation ✅

- Inline progress and results components
- Polling-based status tracking
- LocalStorage recovery mechanism
- Zustand store with selective persistence

### 2025-11-06: Feature 004 Generation Flow ✅

- Perspective-based generation for different yard areas
- Google Maps + Gemini AI integration
- Atomic credit deduction
- Async generation processing

---

For architectural details, see [ARCHITECTURE.md](ARCHITECTURE.md).
For testing requirements, see [TESTING.md](TESTING.md).
For API specifications, see [API.md](API.md).
