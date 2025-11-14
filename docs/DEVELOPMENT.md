# Development Guide

Setup, commands, and troubleshooting for local development.

## Initial Setup

### Prerequisites

- **Node.js:** 18+ (for frontend)
- **Python:** 3.11+ (for backend)
- **PostgreSQL:** Not needed locally (using Supabase hosted)
- **Git:** For version control

### Clone Repository

```bash
git clone https://github.com/your-org/yarda-v5.git
cd yarda-v5
```

---

## Backend Setup

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
```

### 2. Activate Virtual Environment

**⚠️ CRITICAL:** ALWAYS activate venv before running backend!

```bash
# macOS/Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

**Symptoms of NOT activating venv:**
- `ModuleNotFoundError: No module named 'stripe'`
- CORS errors from frontend
- API endpoints returning 500 errors
- Health check may return 200 (misleading!) but endpoints fail

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
DATABASE_URL=postgresql://postgres:{password}@db.gxlmnjnjvlslijiowamn.supabase.co/postgres
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
GEMINI_API_KEY=...
GOOGLE_MAPS_API_KEY=...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

**⚠️ IMPORTANT:** URL-encode special characters in `DATABASE_URL`:
- `$` → `%24`
- `%` → `%25`
- `^` → `%5E`

### 5. Start Development Server

```bash
uvicorn src.main:app --reload --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

**Health Check:**
```bash
curl http://localhost:8000/health
# Expected: {"status": "healthy"}
```

---

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment Variables

Create `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# CRITICAL for local development
NEXT_PUBLIC_API_URL=http://localhost:8000

NEXT_PUBLIC_SUPABASE_URL=https://gxlmnjnjvlslijiowamn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**⚠️ CRITICAL:** `NEXT_PUBLIC_API_URL` MUST be `http://localhost:8000` for local development!
- If set to production URL, API calls will be blocked by CORS

### 3. Start Development Server

```bash
npm run dev
```

**Expected Output:**
```
ready - started server on 0.0.0.0:3000
```

**Test in Browser:**
```
http://localhost:3000
```

---

## Development Commands

### Backend Commands

```bash
cd backend

# Start server with auto-reload
uvicorn src.main:app --reload --port 8000

# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/unit/test_trial_service.py -v

# Run tests matching pattern
pytest -k "test_trial_deduction" -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html

# Type check
mypy src/

# Format code
black src/
isort src/  # Import sorting

# Check for security issues
bandit -r src/
```

### Frontend Commands

```bash
cd frontend

# Start development server
npm run dev

# Build for production
npm run build

# Start production server (after build)
npm start

# Type check
npm run type-check

# Lint
npm run lint

# Fix linting issues
npm run lint:fix

# Run unit tests (Vitest)
npm run test

# Run E2E tests (Playwright)
npm run test:e2e

# Run specific E2E test
npx playwright test tests/e2e/generation-flow.spec.ts

# With UI mode (interactive debugging)
npx playwright test --ui

# Generate test report
npx playwright show-report
```

### Database Commands

```bash
# Apply migration manually
psql $DATABASE_URL -f supabase/migrations/XXX_migration.sql

# View database logs (via Supabase dashboard)
# https://supabase.com/dashboard/project/gxlmnjnjvlslijiowamn/logs

# Reset local Supabase (if using local instance)
supabase db reset
```

---

## Common Development Tasks

### Adding New API Endpoint

**1. Define Pydantic Models**

```python
# backend/src/models/resource.py
from pydantic import BaseModel, Field

class ResourceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str

class ResourceResponse(BaseModel):
    id: str
    name: str
    description: str
    created_at: datetime
```

**2. Create Service**

```python
# backend/src/services/resource_service.py
from src.db.connection_pool import DatabasePool

class ResourceService:
    def __init__(self, db_pool: DatabasePool):
        self.db_pool = db_pool

    async def create(self, user_id: str, data: ResourceCreate):
        async with self.db_pool.transaction() as conn:
            resource = await conn.fetchrow("""
                INSERT INTO resources (user_id, name, description)
                VALUES ($1, $2, $3)
                RETURNING *
            """, user_id, data.name, data.description)
            return resource
```

**3. Create Endpoint**

```python
# backend/src/api/endpoints/resources.py
from fastapi import APIRouter, Depends
from src.services.resource_service import ResourceService
from src.db.connection_pool import db_pool

router = APIRouter(prefix="/v1/resources", tags=["resources"])

def get_resource_service() -> ResourceService:
    return ResourceService(db_pool)

@router.post("/", response_model=ResourceResponse)
async def create_resource(
    data: ResourceCreate,
    service: ResourceService = Depends(get_resource_service),
    current_user: dict = Depends(get_current_user)
):
    resource = await service.create(current_user['id'], data)
    return ResourceResponse(**resource)
```

**4. Register Router**

```python
# backend/src/main.py
from src.api.endpoints import resources

app.include_router(resources.router)
```

---

### Adding New Frontend Page

**1. Create Page File**

```typescript
// frontend/src/pages/my-page.tsx
import { useUserStore } from '@/store/userStore';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function MyPage() {
  const { user } = useUserStore();
  const router = useRouter();

  // Auth guard
  useEffect(() => {
    if (!user || !user.isAuthenticated) {
      router.push('/login');
    }
  }, [user, router]);

  return (
    <div>
      <h1>My Page</h1>
    </div>
  );
}
```

**2. Add API Method**

```typescript
// frontend/src/lib/api.ts
export const resourcesAPI = {
  create: (data: ResourceCreate) =>
    apiClient.post('/v1/resources', data),

  getById: (id: string) =>
    apiClient.get(`/v1/resources/${id}`),

  list: () =>
    apiClient.get('/v1/resources')
};
```

**3. Use Zustand Store (if needed)**

```typescript
// frontend/src/store/resourceStore.ts
import create from 'zustand';
import { persist } from 'zustand/middleware';

interface ResourceStore {
  resources: Resource[];
  setResources: (resources: Resource[]) => void;
}

export const useResourceStore = create<ResourceStore>()(
  persist(
    (set) => ({
      resources: [],
      setResources: (resources) => set({ resources })
    }),
    { name: 'resource-storage' }
  )
);
```

**4. Add E2E Test**

```typescript
// frontend/tests/e2e/my-page.spec.ts
import { test, expect } from '@playwright/test';

test.describe('My Page', () => {
  test('displays correctly', async ({ page }) => {
    await page.goto('/my-page');
    await expect(page.locator('h1')).toHaveText('My Page');
  });
});
```

---

### Database Schema Changes

**1. Create Migration File**

```bash
# Naming convention: NNN_description.sql
touch supabase/migrations/017_add_resources_table.sql
```

**2. Write Migration SQL**

```sql
-- Migration 017: Add resources table
-- Purpose: Store user-created resources
-- Author: Your Name
-- Date: 2025-11-13

CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster user queries
CREATE INDEX idx_resources_user_id ON resources(user_id);

-- RLS policies
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own resources"
    ON resources FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resources"
    ON resources FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Comment for documentation
COMMENT ON TABLE resources IS 'User-created resources for feature XYZ';
```

**3. Apply Migration**

```bash
# Via psql
psql $DATABASE_URL -f supabase/migrations/017_add_resources_table.sql

# Or via Supabase dashboard SQL editor
# Copy/paste migration SQL and execute
```

**4. Update TypeScript Types**

```typescript
// frontend/src/types/resource.ts
export interface Resource {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}
```

**5. Update Pydantic Models**

```python
# backend/src/models/resource.py
from datetime import datetime
from pydantic import BaseModel

class ResourceDB(BaseModel):
    id: str
    user_id: str
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime
```

**6. Create Test Data (if needed)**

```sql
-- For development/testing only
INSERT INTO resources (user_id, name, description)
VALUES
    ('test-user-id', 'Test Resource 1', 'Description 1'),
    ('test-user-id', 'Test Resource 2', 'Description 2');
```

---

## Troubleshooting

### Backend Issues

#### `ModuleNotFoundError: No module named 'stripe'`

**Cause:** Virtual environment not activated

**Solution:**
```bash
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows
```

#### CORS Errors from Frontend

**Cause 1:** Virtual environment not activated (CORS middleware fails to load)

**Solution:** Activate venv

**Cause 2:** Frontend `.env.local` has production API URL

**Solution:**
```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000  # NOT production URL!
```

#### `Tenant or user not found` Database Error

**Cause:** Special characters in `DATABASE_URL` not URL-encoded

**Solution:**
```bash
# URL-encode special characters
# $ → %24, % → %25, ^ → %5E, & → %26

# WRONG
DATABASE_URL=postgresql://postgres:pa$$word@...

# CORRECT
DATABASE_URL=postgresql://postgres:pa%24%24word@...
```

#### Health Check Returns 200 But Endpoints Fail

**Cause:** Virtual environment not activated (health check is simple, doesn't load all dependencies)

**Solution:** Activate venv and restart server

---

### Frontend Issues

#### `Module not found: Can't resolve '@/components/...'`

**Cause:** Path alias not configured or import path incorrect

**Solution:**
```typescript
// Use correct import path
import MyComponent from '@/components/MyComponent';  // ✅ Correct
import MyComponent from '../components/MyComponent'; // ❌ Avoid relative paths
```

#### API Calls Return CORS Errors

**Cause:** `NEXT_PUBLIC_API_URL` pointing to production

**Solution:**
```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### React Key Prop Warnings

**Cause:** Conditional siblings without keys

**Solution:**
```tsx
// When ANY sibling is conditional, ALL siblings need keys
{networkError && <div key="error-banner">Error!</div>}
{timedOut && <div key="timeout-banner">Timeout!</div>}
<Component key="always-rendered" />  {/* This also needs a key! */}
```

---

### Database Issues

#### Cannot Connect to Supabase

**Cause:** Invalid `DATABASE_URL` or network issue

**Solution:**
```bash
# Test connection manually
psql $DATABASE_URL -c "SELECT 1"

# If fails, check:
# 1. DATABASE_URL has correct credentials
# 2. Special characters are URL-encoded
# 3. Network allows outbound connections to Supabase
```

#### Migration Already Applied

**Cause:** Migration was run before

**Solution:**
```sql
-- Check migration history
SELECT * FROM migrations ORDER BY created_at DESC;

-- If migration should be re-run, drop tables first
DROP TABLE IF EXISTS resources CASCADE;
```

---

### Stripe Issues

#### Webhook Signature Mismatch

**Cause:** `STRIPE_WEBHOOK_SECRET` doesn't match webhook signing secret

**Solution:**
```bash
# Get signing secret from Stripe dashboard:
# Webhooks → Select endpoint → Signing secret

# Update backend/.env
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Webhook Not Receiving Events

**Cause:** Webhook endpoint not accessible or Stripe CLI not running

**Solution (Local Testing):**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to local backend
stripe listen --forward-to localhost:8000/v1/webhooks/stripe

# In another terminal, trigger test event
stripe trigger payment_intent.succeeded
```

---

## Code Quality

### Type Checking

```bash
# Backend
cd backend && mypy src/

# Frontend
cd frontend && npm run type-check
```

### Linting

```bash
# Backend (flake8)
cd backend && flake8 src/

# Frontend (ESLint)
cd frontend && npm run lint
```

### Formatting

```bash
# Backend (Black + isort)
cd backend
black src/
isort src/

# Frontend (Prettier via ESLint)
cd frontend && npm run lint:fix
```

### Security Scanning

```bash
# Backend (Bandit)
cd backend && bandit -r src/

# Frontend (npm audit)
cd frontend && npm audit
```

---

## Performance Profiling

### Backend Profiling

```python
# Add to endpoint for profiling
import cProfile
import pstats

profiler = cProfile.Profile()
profiler.enable()

# Your code here

profiler.disable()
stats = pstats.Stats(profiler)
stats.sort_stats('cumulative')
stats.print_stats(10)  # Top 10 slowest functions
```

### Frontend Profiling

```typescript
// Use React DevTools Profiler
// Or add performance marks
performance.mark('start-operation');
// ... your code
performance.mark('end-operation');
performance.measure('operation', 'start-operation', 'end-operation');
console.log(performance.getEntriesByName('operation'));
```

---

For architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md).
For testing strategies, see [TESTING.md](TESTING.md).
For deployment guide, see [DEPLOYMENT.md](DEPLOYMENT.md).
For API reference, see [API.md](API.md).
