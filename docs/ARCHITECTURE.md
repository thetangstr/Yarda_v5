# Architecture

System design, patterns, and technical implementation for Yarda AI Landscape Studio.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Next.js    │  │   Zustand    │  │  React Context│          │
│  │  Frontend    │  │    Store     │  │  (i18n)      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                   │
└─────────┼─────────────────┼──────────────────┼───────────────────┘
          │                 │                  │
          ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Layer (FastAPI)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Routers    │  │  Middleware  │  │   Webhooks   │          │
│  │  /v1/*       │  │  (Auth/CORS) │  │   (Stripe)   │          │
│  └──────┬───────┘  └──────────────┘  └──────────────┘          │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────────────────────────────────────────┐           │
│  │            Service Layer (Business Logic)         │           │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │           │
│  │  │  Trial   │ │  Token   │ │   Generation     │ │           │
│  │  │ Service  │ │ Service  │ │    Service       │ │           │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────────────┘ │           │
│  └───────┼────────────┼────────────┼────────────────┘           │
└──────────┼────────────┼────────────┼──────────────────────────┘
           │            │            │
           ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Database Layer (PostgreSQL/Supabase)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    Users     │  │ Generations  │  │   Tokens     │          │
│  │  (RLS, Locks)│  │  (Status)    │  │  (Balances)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘

External Services:
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Supabase   │  │    Stripe    │  │ Google Maps  │
│    Auth      │  │   Payments   │  │     API      │
└──────────────┘  └──────────────┘  └──────────────┘
┌──────────────┐  ┌──────────────┐
│   Gemini AI  │  │ Vercel Blob  │
│ (Generation) │  │   (Storage)  │
└──────────────┘  └──────────────┘
```

## Backend Architecture

### Connection Pool Pattern

**Purpose:** Efficient database connection management with async operations.

**Implementation:**
- Single global `db_pool` instance (`backend/src/db/connection_pool.py`)
- Initialized at FastAPI app startup via lifespan context
- Reused across all requests for connection efficiency

**ADR:** See [adr/001-connection-pool.md](adr/001-connection-pool.md)

**Usage:**
```python
from src.db.connection_pool import db_pool

# In service layer
async with db_pool.transaction() as conn:
    result = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
```

**Key Files:**
- `backend/src/db/connection_pool.py` - Pool initialization
- `backend/src/main.py` - Lifespan context manager

---

### Service Layer Pattern

**Purpose:** Encapsulate business logic and database operations with dependency injection.

**Structure:**
```
backend/src/services/
├── trial_service.py          # Trial credit logic
├── token_service.py          # Token purchase/deduction
├── subscription_service.py   # Subscription management
├── generation_service.py     # Generation orchestration
├── maps_service.py           # Google Maps integration
└── gemini_client.py          # AI generation client
```

**Characteristics:**
- Services are stateless (no instance variables for state)
- Accept `db_pool` as dependency in `__init__`
- Use dependency injection via FastAPI `Depends()`
- Handle atomic operations with row-level locking

**Example:**
```python
# Service definition
class TrialService:
    def __init__(self, db_pool: DatabasePool):
        self.db_pool = db_pool

    async def use_trial_credit(self, user_id: str, cost: int = 1):
        async with self.db_pool.transaction() as conn:
            # Atomic operation with row lock
            user = await conn.fetchrow("""
                SELECT trial_remaining FROM users
                WHERE id = $1 FOR UPDATE NOWAIT
            """, user_id)
            # ... business logic

# Dependency injection
def get_trial_service() -> TrialService:
    return TrialService(db_pool)

# In endpoint
@router.post("/generate")
async def create_generation(
    trial_service: TrialService = Depends(get_trial_service)
):
    await trial_service.use_trial_credit(user_id)
```

---

### Atomic Operations with Row-Level Locking

**Purpose:** Prevent race conditions in credit deduction and balance updates.

**Critical Pattern:**
```python
async with db_pool.transaction() as conn:
    # CRITICAL: Use FOR UPDATE NOWAIT for atomic reads
    user = await conn.fetchrow("""
        SELECT trial_remaining, token_balance
        FROM users
        WHERE id = $1
        FOR UPDATE NOWAIT
    """, user_id)

    # Validate sufficient balance
    if user['trial_remaining'] < cost:
        raise InsufficientCreditsError()

    # Update balance atomically
    await conn.execute("""
        UPDATE users
        SET trial_remaining = trial_remaining - $1
        WHERE id = $2
    """, cost, user_id)
```

**Why `FOR UPDATE NOWAIT`:**
- Acquires exclusive row lock on `users` row
- Prevents concurrent requests from reading same balance
- `NOWAIT` fails immediately if lock held (prevents deadlocks)
- Transaction ensures all-or-nothing execution

**Used In:**
- `TrialService.use_trial_credit()`
- `TokenService.deduct_tokens()`
- `HolidayCreditService.use_credit()`

---

### API Router Pattern

**Purpose:** Organize endpoints by resource with consistent structure.

**Structure:**
```
backend/src/api/endpoints/
├── generations.py    # /v1/generations
├── tokens.py         # /v1/tokens
├── users.py          # /v1/users
├── holiday.py        # /v1/holiday
└── webhooks.py       # /v1/webhooks
```

**Router Template:**
```python
from fastapi import APIRouter, Depends, HTTPException
from src.models.{resource} import {Resource}Response, {Resource}Create
from src.services.{resource}_service import {Resource}Service

router = APIRouter(prefix="/v1/{resource}", tags=["{resource}"])

def get_{resource}_service() -> {Resource}Service:
    return {Resource}Service(db_pool)

@router.post("/", response_model={Resource}Response)
async def create_{resource}(
    data: {Resource}Create,
    service: {Resource}Service = Depends(get_{resource}_service),
    current_user: dict = Depends(get_current_user)
):
    return await service.create(current_user['id'], data)
```

**Registration in `main.py`:**
```python
from src.api.endpoints import generations, tokens, users

app.include_router(generations.router)
app.include_router(tokens.router)
app.include_router(users.router)
```

---

## Frontend Architecture

### State Management (Zustand)

**Purpose:** Global state with localStorage persistence.

**Primary Store:**
```typescript
// frontend/src/store/userStore.ts
interface UserStore {
  user: User | null;
  accessToken: string | null;
  tokenBalance: number;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
}

const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      tokenBalance: 0,
      setUser: (user) => set({ user }),
      setAccessToken: (token) => set({ accessToken: token }),
      logout: () => set({ user: null, accessToken: null })
    }),
    { name: 'user-storage' } // localStorage key
  )
);
```

**Other Stores:**
- `generationStore.ts` - Generation form state (with selective persistence)
- `holidayStore.ts` - Holiday decorator state

**Why Zustand:**
- Minimal boilerplate compared to Redux
- Built-in localStorage persistence
- TypeScript support out of the box
- No provider wrapper needed

---

### API Client Pattern

**Purpose:** Centralized HTTP client with authentication.

**Implementation:**
```typescript
// frontend/src/lib/api.ts
import axios from 'axios';
import { useUserStore } from '@/store/userStore';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Automatic token injection
apiClient.interceptors.request.use((config) => {
  const token = useUserStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Structured API namespaces
export const authAPI = {
  login: (credentials) => apiClient.post('/v1/auth/login', credentials),
  logout: () => apiClient.post('/v1/auth/logout')
};

export const generationsAPI = {
  create: (data) => apiClient.post('/v1/generations', data),
  getById: (id) => apiClient.get(`/v1/generations/${id}`),
  poll: (id) => pollGenerationStatus(id) // Polling helper
};
```

**Error Handling:**
```typescript
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useUserStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

### Authentication Flow

**Step-by-step:**

1. **User Clicks "Sign in with Google"**
   - Frontend redirects to Supabase OAuth URL
   - URL: `https://{project}.supabase.co/auth/v1/authorize?provider=google`

2. **Google Authenticates User**
   - Google login page
   - User authorizes app access
   - Google redirects to callback URL

3. **Callback Handler** (`frontend/src/pages/auth/callback.tsx`)
   ```typescript
   const { data: { session } } = await supabase.auth.getSession();
   const accessToken = session.access_token;
   ```

4. **Fetch User Profile**
   ```typescript
   const { data: user } = await apiClient.get('/v1/users/me', {
     headers: { Authorization: `Bearer ${accessToken}` }
   });
   ```

5. **Store Session in Zustand**
   ```typescript
   useUserStore.setState({ user, accessToken });
   ```

6. **Database Trigger Auto-Syncs**
   - Supabase trigger on `auth.users` insert
   - Copies user to `public.users` with trial credits
   - Migration: `supabase/migrations/001_create_users_trigger.sql`

7. **Redirect to App**
   ```typescript
   router.push('/generate');
   ```

**Key Files:**
- `frontend/src/pages/auth/callback.tsx` - Callback handler
- `backend/src/api/dependencies/auth.py` - JWT verification
- `supabase/migrations/001_create_users_trigger.sql` - User sync trigger

---

### Single-Page Generation Flow

**Purpose:** All interactions on one page without navigation.

**Pattern:**
```
┌─────────────────────────────────────────┐
│         /generate Page                  │
│  ┌────────────────────────────────┐    │
│  │  Form (Address, Prompt, Areas) │    │
│  └────────────┬───────────────────┘    │
│               │ Submit                  │
│               ▼                         │
│  ┌────────────────────────────────┐    │
│  │  Progress (Inline, Polling)    │    │
│  └────────────┬───────────────────┘    │
│               │ Complete                │
│               ▼                         │
│  ┌────────────────────────────────┐    │
│  │  Results (Inline, Gallery)     │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Implementation:**
```typescript
// frontend/src/pages/generate.tsx
const [generationState, setGenerationState] = useState<'form' | 'progress' | 'results'>('form');
const [generationId, setGenerationId] = useState<string | null>(null);

// Submit handler
const handleSubmit = async (formData) => {
  const { id } = await generationsAPI.create(formData);
  setGenerationId(id);
  setGenerationState('progress');

  // Start polling
  const result = await pollGenerationStatus(id);
  setGenerationState('results');
};

// Render based on state
return (
  <div>
    {generationState === 'form' && <GenerationForm onSubmit={handleSubmit} />}
    {generationState === 'progress' && <GenerationProgressInline id={generationId} />}
    {generationState === 'results' && <GenerationResultsInline id={generationId} />}
  </div>
);
```

**Polling Strategy:**
```typescript
// frontend/src/lib/api.ts
export async function pollGenerationStatus(id: string, maxAttempts = 150) {
  for (let i = 0; i < maxAttempts; i++) {
    const generation = await generationsAPI.getById(id);

    if (isGenerationComplete(generation.status)) {
      return generation;
    }

    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second interval
  }

  throw new Error('Generation timed out after 5 minutes');
}
```

**ADR:** See [adr/002-single-page-flow.md](adr/002-single-page-flow.md)

**Key Files:**
- `frontend/src/pages/generate.tsx` - Main page
- `frontend/src/components/GenerationProgressInline.tsx` - Progress UI
- `frontend/src/components/GenerationResultsInline.tsx` - Results gallery
- `frontend/src/lib/api.ts` - Polling utils

---

## Data Flow Examples

### Generation Request Flow

```
1. User submits form
   ↓
2. Frontend: POST /v1/generations
   ↓
3. Backend: Validate user has credits
   ↓
4. Backend: Deduct credits atomically (FOR UPDATE NOWAIT)
   ↓
5. Backend: Fetch Google Maps images
   ↓
6. Backend: Upload to Vercel Blob
   ↓
7. Backend: Create generation record (status: pending)
   ↓
8. Backend: Queue async Gemini task
   ↓
9. Backend: Return generation ID immediately
   ↓
10. Frontend: Start polling every 2 seconds
    ↓
11. Backend: Gemini completes, updates status: completed
    ↓
12. Frontend: Poll detects completion, shows results
```

### Authentication Flow

```
1. User clicks "Sign in with Google"
   ↓
2. Redirect to Supabase OAuth URL
   ↓
3. Google authentication
   ↓
4. Callback to /auth/callback with code
   ↓
5. Exchange code for session (Supabase)
   ↓
6. Extract JWT access token
   ↓
7. Call GET /v1/users/me with JWT
   ↓
8. Backend: Verify JWT, fetch user from database
   ↓
9. Store user + token in Zustand
   ↓
10. Redirect to /generate
```

### Language Preference Sync

```
1. User logs in
   ↓
2. LanguageContext detects authentication
   ↓
3. Call GET /v1/users/me/profile
   ↓
4. Backend: Return user.preferred_language
   ↓
5. Frontend: Load translations for that language
   ↓
6. User switches language in UI
   ↓
7. Call PUT /v1/users/preferences/language
   ↓
8. Backend: Update users.preferred_language
   ↓
9. Frontend: Update localStorage + React state
```

---

## Technology Decisions

### Why FastAPI (Backend)?
- **Async-first**: Native async/await support for database operations
- **Type safety**: Pydantic models with automatic validation
- **Auto docs**: Swagger/OpenAPI docs generated automatically
- **Performance**: One of the fastest Python frameworks (comparable to Node.js)

### Why Next.js (Frontend)?
- **React ecosystem**: Large community, component libraries
- **Server-side rendering**: Better SEO, faster initial load
- **File-based routing**: Intuitive page structure
- **Vercel integration**: Seamless deployment with backend API

### Why Zustand (State)?
- **Minimal**: ~1KB, no boilerplate
- **Persistence**: Built-in localStorage support
- **DevTools**: React DevTools integration
- **TypeScript**: First-class TS support

### Why Supabase (Auth & DB)?
- **PostgreSQL**: Full SQL with RLS (Row-Level Security)
- **Auth**: Built-in OAuth, magic links, JWT
- **Real-time**: WebSocket subscriptions (not used yet)
- **Hosting**: Managed infrastructure

### Why Stripe (Payments)?
- **Industry standard**: Most trusted payment processor
- **Developer experience**: Excellent docs, test mode
- **Webhooks**: Reliable event system
- **Customer Portal**: Self-service subscription management

---

## File Organization

```
backend/
├── src/
│   ├── api/
│   │   ├── endpoints/       # Route handlers
│   │   └── dependencies/    # FastAPI dependencies (auth, etc.)
│   ├── services/            # Business logic layer
│   ├── models/              # Pydantic models
│   ├── db/                  # Database utilities
│   └── main.py              # App entry point
├── tests/                   # Pytest unit tests
└── requirements.txt

frontend/
├── src/
│   ├── pages/               # Next.js pages (file-based routing)
│   ├── components/          # React components
│   ├── store/               # Zustand stores
│   ├── lib/                 # Utilities (API client, etc.)
│   ├── context/             # React contexts (i18n, etc.)
│   └── types/               # TypeScript types
├── public/
│   └── locales/             # Translation files (i18n)
├── tests/
│   └── e2e/                 # Playwright tests
└── package.json

docs/                        # Documentation (this file!)
supabase/
└── migrations/              # SQL migrations
```

---

## Next Steps

- **Scaling:** Consider Redis for caching, background job queue (Celery/RQ)
- **Monitoring:** Add Sentry for error tracking, DataDog for APM
- **Performance:** Implement CDN caching for static assets
- **Real-time:** Use Supabase real-time for live generation updates

For deployment details, see [DEPLOYMENT.md](DEPLOYMENT.md).
For API specifications, see [API.md](API.md).
