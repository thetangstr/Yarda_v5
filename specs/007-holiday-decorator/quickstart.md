# Quickstart Guide: Holiday Decorator Implementation

**Feature**: Holiday Decorator - Viral Marketing Feature
**Branch**: `007-holiday-decorator`
**Date**: 2025-11-10

## Overview

This guide provides a step-by-step implementation roadmap for the Holiday Decorator feature. Follow this sequence to build the feature incrementally, with testing at each stage.

---

## Prerequisites

Before starting implementation, ensure you have:

✅ Read all planning documents:
- [x] [spec.md](spec.md) - Feature specification
- [x] [plan.md](plan.md) - Implementation plan
- [x] [research.md](research.md) - Technology decisions
- [x] [data-model.md](data-model.md) - Database schema
- [x] [contracts/](contracts/) - API contracts

✅ Development environment ready:
- [x] Backend running: `cd backend && source venv/bin/activate && uvicorn src.main:app --reload --port 8000`
- [x] Frontend running: `cd frontend && npm run dev`
- [x] Database access: Supabase connection configured

✅ API keys configured:
- [x] `GOOGLE_MAPS_API_KEY` - For Street View and Geocoding
- [x] `GEMINI_API_KEY` - For AI image generation
- [x] `BLOB_READ_WRITE_TOKEN` - For Vercel Blob storage

---

## Implementation Phases

### Phase 0: Database Setup ✅ START HERE

**Objective**: Set up database schema for holiday feature.

**Steps**:

1. **Create migration file**: `supabase/migrations/014_holiday_decorator.sql`
   ```bash
   touch supabase/migrations/014_holiday_decorator.sql
   ```

2. **Copy schema from data-model.md**:
   - Add columns to `users` table (holiday_credits, holiday_credits_earned, whats_new_modal_shown)
   - Create `holiday_generations` table
   - Create `social_shares` table
   - Create `email_nurture_list` table
   - Create database functions (deduct_holiday_credit, grant_holiday_credit, check_daily_share_limit)
   - Create triggers

3. **Apply migration**:
   ```bash
   # Test locally (if using local Supabase)
   supabase db reset

   # Or apply directly to production (via dashboard)
   # Copy/paste migration SQL into Supabase SQL Editor
   ```

4. **Verify schema**:
   ```sql
   -- Check users table has new columns
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'users'
     AND column_name IN ('holiday_credits', 'holiday_credits_earned', 'whats_new_modal_shown');

   -- Check new tables exist
   SELECT table_name
   FROM information_schema.tables
   WHERE table_name IN ('holiday_generations', 'social_shares', 'email_nurture_list');

   -- Check functions exist
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_name IN ('deduct_holiday_credit', 'grant_holiday_credit', 'check_daily_share_limit');
   ```

**Test**: Query database to ensure all schema changes are applied correctly.

**Checkpoint**: ✅ Database schema ready

---

### Phase 1: Backend - Holiday Credit Service

**Objective**: Implement atomic holiday credit management (prevents negative balances).

**Files to Create/Modify**:
- `backend/src/services/holiday_credit_service.py` (NEW)
- `backend/tests/unit/test_holiday_credit_service.py` (NEW)

**Implementation**:

1. **Create service** (`holiday_credit_service.py`):
   ```python
   # Copy pattern from trial_service.py (migration 013)
   class HolidayCreditService:
       async def deduct_credit(user_id: UUID) -> Tuple[bool, int]:
           """Atomically deduct 1 holiday credit."""
           result = await self.db.fetchrow(
               "SELECT * FROM deduct_holiday_credit($1)",
               user_id
           )
           return result['success'], result['credits_remaining']

       async def grant_credit(user_id: UUID, reason: str) -> int:
           """Grant 1 holiday credit."""
           new_balance = await self.db.fetchval(
               "SELECT grant_holiday_credit($1, 1)",
               user_id
           )
           return new_balance

       async def get_balance(user_id: UUID) -> Dict[str, Any]:
           """Get credit balance with earnings breakdown."""
           # Implementation in contracts/credits-api.md
   ```

2. **Write tests** (`test_holiday_credit_service.py`):
   ```python
   async def test_deduct_credit_success():
       # User has 1 credit → deduct → 0 remaining

   async def test_deduct_credit_insufficient():
       # User has 0 credits → deduct fails

   async def test_grant_credit():
       # Grant 1 credit → balance increases
   ```

3. **Run tests**:
   ```bash
   cd backend
   pytest tests/unit/test_holiday_credit_service.py -v
   ```

**Checkpoint**: ✅ Holiday credit service tested and working

---

### Phase 2: Backend - Holiday Generation Service

**Objective**: Orchestrate generation flow (geocoding, Street View, Gemini AI).

**Files to Create/Modify**:
- `backend/src/services/holiday_generation_service.py` (NEW)
- `backend/src/services/maps_service.py` (EXTEND - add Street View heading support)
- `backend/src/services/gemini_client.py` (REUSE - use existing img-to-img)
- `backend/tests/unit/test_holiday_generation_service.py` (NEW)

**Implementation**:

1. **Create service** (`holiday_generation_service.py`):
   ```python
   class HolidayGenerationService:
       async def create_generation(
           user_id: UUID, address: str, heading: int, style: str
       ) -> Dict[str, Any]:
           # 1. Deduct credit atomically
           success, credits_remaining = await credit_service.deduct_credit(user_id)
           if not success:
               raise InsufficientCreditsError()

           # 2. Geocode address
           location = await maps_service.geocode(address)

           # 3. Fetch Street View image
           street_view_url = await maps_service.get_street_view_image(
               location.lat, location.lng, heading
           )

           # 4. Upload to Vercel Blob
           original_image_url = await blob_service.upload(street_view_url)

           # 5. Create generation record (status='pending')
           generation = await db.execute("""
               INSERT INTO holiday_generations (...)
               VALUES (...)
               RETURNING *
           """)

           # 6. Queue async Gemini task (background task)
           background_tasks.add_task(
               self._generate_decorated_image,
               generation_id, style
           )

           return {
               **generation,
               "credits_remaining": credits_remaining
           }

       async def _generate_decorated_image(generation_id: UUID, style: str):
           # Update status='processing'
           # Call Gemini with style-specific prompt (from research.md)
           # Upload decorated image to Vercel Blob
           # Compose before/after image (client-side or server-side)
           # Update status='completed'
   ```

2. **Extend MapsService**:
   - Already supports `heading` parameter (see research.md)
   - No changes needed! ✅

3. **Write tests**:
   ```bash
   cd backend
   pytest tests/unit/test_holiday_generation_service.py -v
   ```

**Checkpoint**: ✅ Generation service creates records and queues AI tasks

---

### Phase 3: Backend - API Endpoints

**Objective**: Expose holiday feature via REST API.

**Files to Create/Modify**:
- `backend/src/api/endpoints/holiday.py` (NEW)
- `backend/src/models/holiday.py` (NEW - Pydantic models)
- `backend/src/main.py` (EXTEND - register router)

**Implementation**:

1. **Create Pydantic models** (`models/holiday.py`):
   ```python
   class HolidayGenerationRequest(BaseModel):
       address: str = Field(..., min_length=1)
       heading: int = Field(..., ge=0, lt=360)
       pitch: int = Field(default=0, ge=-90, le=90)
       style: Literal['classic', 'modern', 'over_the_top']

   class HolidayGenerationResponse(BaseModel):
       id: UUID
       user_id: UUID
       # ... (see contracts/generation-api.md)
   ```

2. **Create endpoints** (`api/endpoints/holiday.py`):
   ```python
   @router.post("/v1/holiday/generations")
   async def create_generation(
       request: HolidayGenerationRequest,
       user_id: UUID = Depends(get_current_user),
       service: HolidayGenerationService = Depends(get_holiday_generation_service)
   ):
       # Implementation in contracts/generation-api.md

   @router.get("/v1/holiday/generations/{id}")
   async def get_generation(
       id: UUID,
       user_id: UUID = Depends(get_current_user),
       service: HolidayGenerationService = Depends(get_holiday_generation_service)
   ):
       # Implementation in contracts/generation-api.md
   ```

3. **Register router** (`main.py`):
   ```python
   from api.endpoints import holiday
   app.include_router(holiday.router, tags=["holiday"])
   ```

4. **Test with curl**:
   ```bash
   # Create generation
   curl -X POST http://localhost:8000/v1/holiday/generations \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "address": "1600 Amphitheatre Parkway, Mountain View, CA",
       "heading": 180,
       "style": "classic"
     }'

   # Get generation status
   curl http://localhost:8000/v1/holiday/generations/{id} \
     -H "Authorization: Bearer $TOKEN"
   ```

**Checkpoint**: ✅ API endpoints working, generation flow tested end-to-end

---

### Phase 4: Frontend - Seasonal Activation Utility

**Objective**: Detect holiday season and toggle feature visibility.

**Files to Create**:
- `frontend/src/lib/seasonalFeatures.ts` (NEW)

**Implementation**:

```typescript
// src/lib/seasonalFeatures.ts

export function isHolidaySeasonActive(): boolean {
  // Override for testing
  if (process.env.NEXT_PUBLIC_HOLIDAY_OVERRIDE === 'true') return true;
  if (process.env.NEXT_PUBLIC_HOLIDAY_OVERRIDE === 'false') return false;

  // Date-based logic (Thanksgiving - January 1st)
  const now = new Date();
  const year = now.getFullYear();

  // Thanksgiving: 4th Thursday of November
  const thanksgiving = getNthDayOfMonth(year, 10, 4, 4);

  // New Year's Day (next year)
  const newYear = new Date(year + 1, 0, 1);

  return now >= thanksgiving && now < newYear;
}

function getNthDayOfMonth(
  year: number,
  month: number,
  dayOfWeek: number,
  nth: number
): Date {
  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay();
  const offset = (dayOfWeek - firstDayOfWeek + 7) % 7;
  const date = 1 + offset + (nth - 1) * 7;
  return new Date(year, month, date);
}
```

**Test**:
```typescript
// Set override in .env.local
NEXT_PUBLIC_HOLIDAY_OVERRIDE=true

// Verify function returns true
console.log(isHolidaySeasonActive()); // true
```

**Checkpoint**: ✅ Seasonal activation logic working

---

### Phase 5: Frontend - Holiday Page (P1 - Discovery & First Generation)

**Objective**: Implement single-page holiday decorator flow.

**Files to Create/Modify**:
- `frontend/src/pages/holiday.tsx` (NEW)
- `frontend/src/components/StreetViewRotator.tsx` (NEW)
- `frontend/src/components/StyleSelector.tsx` (NEW)
- `frontend/src/components/GenerationProgressInline.tsx` (REUSE from /generate)
- `frontend/src/components/GenerationResultsInline.tsx` (NEW)
- `frontend/src/lib/api.ts` (EXTEND - add holidayAPI namespace)
- `frontend/src/store/userStore.ts` (EXTEND - add holiday_credits field)
- `frontend/src/types/holiday.ts` (NEW)

**Implementation Steps**:

1. **Add API methods** (`lib/api.ts`):
   ```typescript
   export const holidayAPI = {
     createGeneration: (data: HolidayGenerationRequest) =>
       api.post('/v1/holiday/generations', data),

     getGeneration: (id: string) =>
       api.get(`/v1/holiday/generations/${id}`),

     pollGenerationStatus: async (id: string) => {
       // Copy polling pattern from generationStore.ts
       const maxAttempts = 150; // 5 minutes
       for (let i = 0; i < maxAttempts; i++) {
         const gen = await holidayAPI.getGeneration(id);
         if (gen.status === 'completed' || gen.status === 'failed') {
           return gen;
         }
         await sleep(2000);
       }
       throw new Error('Generation timeout');
     }
   };
   ```

2. **Create holiday page** (`pages/holiday.tsx`):
   - Address search field
   - StreetViewRotator component (rotate left/right, show heading)
   - StyleSelector component (Classic/Modern/Over-the-Top cards)
   - Generate button (with credit confirmation modal)
   - Inline progress (reuse GenerationProgressInline)
   - Inline results (before/after toggle, share buttons)

3. **Extend userStore** (`store/userStore.ts`):
   ```typescript
   interface UserState {
     // ... existing fields
     holiday_credits: number;
   }

   // Update setUser to include holiday_credits
   ```

4. **Create TypeScript types** (`types/holiday.ts`):
   - Copy interfaces from contracts/generation-api.md

**Checkpoint**: ✅ Users can generate holiday decorations (P1 user story working)

---

### Phase 6: Frontend - Social Sharing (P2 - Viral Loop)

**Objective**: Implement share buttons with tracking links.

**Files to Create/Modify**:
- `frontend/src/components/ShareButtons.tsx` (NEW)
- `frontend/src/lib/imageComposition.ts` (NEW - before/after canvas)
- `backend/src/api/endpoints/holiday_share.py` (NEW)
- `backend/src/services/social_share_service.py` (NEW)

**Implementation**:

1. **Backend - Share Service & Endpoints**:
   - Implement contracts/share-api.md
   - `POST /v1/holiday/shares` - Create tracking link
   - `GET /v1/holiday/shares/track/:code` - Track click, grant credit

2. **Frontend - Share Buttons**:
   - Create before/after image using canvas (see contracts/share-api.md)
   - Native share dialogs for Instagram/Facebook/TikTok
   - Copy tracking link to clipboard
   - Show success message when credit granted

**Checkpoint**: ✅ Users can share and earn credits (P2 user story working)

---

### Phase 7: Frontend - Homepage Hero (P1 - Discovery)

**Objective**: Add holiday-themed hero section to homepage.

**Files to Create/Modify**:
- `frontend/src/components/HolidayHero.tsx` (NEW)
- `frontend/src/pages/index.tsx` (EXTEND)

**Implementation**:

```typescript
// pages/index.tsx

import { isHolidaySeasonActive } from '@/lib/seasonalFeatures';
import HolidayHero from '@/components/HolidayHero';
import DefaultHero from '@/components/DefaultHero';

export default function HomePage() {
  return (
    <div>
      {isHolidaySeasonActive() ? (
        <HolidayHero />
      ) : (
        <DefaultHero />
      )}
      {/* Rest of homepage */}
    </div>
  );
}
```

**HolidayHero Component**:
- Auto-playing before/after decoration video
- Headline: "From Landscape to Winter Wonderland"
- Dual CTAs: "Get Your Free Landscape Plan" (primary), "Try the AI Holiday Decorator 🎄" (secondary)

**Checkpoint**: ✅ Holiday hero visible during season

---

### Phase 8: Remaining User Stories (P3-P5)

**P3 - "What's New?" Modal (Existing Users)**:
- Show one-time modal on login for existing users
- Grant 1 holiday credit
- Redirect to /holiday page

**P4 - Email Lead Capture (HD Download)**:
- Implement contracts/email-api.md
- Email service integration
- Add to nurture list

**P5 - Pivot CTA (Upsell to Landscaping)**:
- Success page at `/holiday/success`
- Side-by-side comparison (holiday vs. spring)
- Discount code link

**Checkpoint**: ✅ All 5 user stories working

---

### Phase 9: E2E Testing (Playwright)

**Objective**: Automated testing for all user flows.

**Files to Create**:
- `frontend/tests/e2e/holiday-discovery.spec.ts` (P1)
- `frontend/tests/e2e/holiday-sharing.spec.ts` (P2)
- `frontend/tests/e2e/holiday-existing-user.spec.ts` (P3)
- `frontend/tests/e2e/holiday-lead-capture.spec.ts` (P4)
- `frontend/tests/e2e/holiday-pivot.spec.ts` (P5)

**Run tests**:
```bash
cd frontend

# Local testing
npm run test:e2e

# Staging testing (before deployment)
npx playwright test --config=playwright.config.staging.ts

# All tests must pass before requesting manual review
```

**Checkpoint**: ✅ All E2E tests passing (100%)

---

### Phase 10: Deployment

**Objective**: Deploy to staging, test, deploy to production.

**Use the fully automated workflow**:

```bash
# ONE COMMAND: Fully automated CI/CD
/test-smart

# This will:
# 1. Run local tests & auto-fix
# 2. Deploy to staging/preview
# 3. Run full test suite on staging & auto-fix
# 4. Ask for approval
# 5. Deploy to production after approval
# 6. Run smoke tests
```

**Manual deployment alternative** (if `/test-smart` not available):

1. **Push to feature branch**:
   ```bash
   git add .
   git commit -m "feat: Implement Holiday Decorator viral marketing feature"
   git push origin 007-holiday-decorator
   ```

2. **Auto-deploy to staging**:
   - Vercel: Preview deployment (auto)
   - Railway: Staging deployment (auto)

3. **Run E2E tests on staging**:
   ```bash
   npx playwright test --config=playwright.config.staging.ts
   ```

4. **Merge to main** (production):
   ```bash
   git checkout main
   git merge 007-holiday-decorator
   git push origin main
   ```

**Checkpoint**: ✅ Feature deployed to production

---

## Testing Checklist

Before requesting manual (human) testing, verify ALL automated tests pass:

**Backend Unit Tests**:
- [ ] `test_holiday_credit_service.py` (100% pass)
- [ ] `test_holiday_generation_service.py` (100% pass)
- [ ] `test_social_share_service.py` (100% pass)

**Frontend E2E Tests** (Playwright):
- [ ] `holiday-discovery.spec.ts` (P1 - New user first generation)
- [ ] `holiday-sharing.spec.ts` (P2 - Share and earn credit)
- [ ] `holiday-existing-user.spec.ts` (P3 - "What's New?" modal)
- [ ] `holiday-lead-capture.spec.ts` (P4 - HD email download)
- [ ] `holiday-pivot.spec.ts` (P5 - Pivot to landscaping)

**Manual Testing** (ONLY after all automated tests pass):
- [ ] Holiday hero displays correctly during season
- [ ] Street View rotation is smooth
- [ ] Before/after toggle works
- [ ] Share buttons open correct platforms
- [ ] Email delivery works
- [ ] Pivot CTA is compelling

---

## Common Issues & Solutions

**Issue**: Generation fails with "Street View not available"
**Solution**: Use test addresses with known Street View coverage (e.g., Google HQ)

**Issue**: Gemini AI returns unchanged satellite image
**Solution**: Review prompt engineering (see research.md, ensure "CREATE A NEW IMAGE" instruction)

**Issue**: Negative holiday credits appear
**Solution**: Verify migration 014 applied correctly, check `FOR UPDATE NOWAIT` locks

**Issue**: Social share doesn't grant credit
**Solution**: Check tracking link redirect works, verify `social_shares.credit_granted` updates

**Issue**: Email not delivered
**Solution**: Check email service configuration, verify Vercel Blob download works

---

## Performance Targets

Monitor these metrics in production:

- **Generation Time**: <10 seconds (p95) - Monitor `holiday_generations.generation_duration_seconds`
- **Page Load**: <3 seconds (initial load) - Lighthouse metrics
- **Street View Rotation**: <1 second (UX smoothness)
- **Credit Operations**: <100ms (atomic operations with `FOR UPDATE NOWAIT`)

---

## Next Steps After MVP

**v2 Features** (Post-Holiday Season):
1. OAuth-based share verification (replace tracking links)
2. Spring landscape preview generation (for pivot CTA)
3. Holiday credit transaction table (detailed audit trail)
4. Analytics dashboard (track conversion funnel)
5. Email nurture campaign automation (Mailchimp/SendGrid integration)

**Post-Mortem** (After January 1st):
- Measure against success criteria (spec.md)
- Calculate ROI (cost per acquisition, conversion rate to landscaping)
- Document lessons learned
- Archive feature or adapt for next holiday season

---

## Support & Resources

**Documentation**:
- [Feature Spec](spec.md)
- [Implementation Plan](plan.md)
- [Research & Technology Decisions](research.md)
- [Data Model](data-model.md)
- [API Contracts](contracts/)

**Codebase References**:
- Trial Credit System: `backend/src/services/trial_service.py` (migration 013)
- Token Credit System: `backend/src/services/token_service.py`
- Generation Flow: `backend/src/services/generation_service.py` (Feature 004)
- Maps Integration: `backend/src/services/maps_service.py`
- Gemini AI: `backend/src/services/gemini_client.py`

**Need Help?**
- Slack: `#yarda-dev`
- PM: [Product Manager Name]
- Tech Lead: [Tech Lead Name]

---

**Good luck building the Holiday Decorator! 🎄**
