# Developer Quickstart: Generation Flow Interface

**Feature Branch**: `004-generation-flow`
**Created**: 2025-11-06
**Estimated Effort**: 3-5 days (1 backend, 2-3 frontend, 1 testing)

## Overview

This guide helps developers get started implementing the Generation Flow feature. Follow these steps sequentially to build the feature end-to-end.

---

## Prerequisites

**Required Knowledge**:
- TypeScript/React (frontend)
- Python/FastAPI (backend)
- PostgreSQL (database)
- Google Maps API (Street View)
- Google Gemini API (AI generation)

**Environment Setup**:
```bash
# Backend dependencies already installed
cd backend && pip install -r requirements.txt

# Frontend dependencies already installed
cd frontend && npm install

# Ensure environment variables configured (see CLAUDE.md)
```

**Documentation to Review**:
1. [specs/004-generation-flow/spec.md](./spec.md) - Feature specification
2. [specs/004-generation-flow/research.md](./research.md) - Technical decisions
3. [specs/004-generation-flow/data-model.md](./data-model.md) - Entity definitions
4. [specs/004-generation-flow/contracts/openapi.yaml](./contracts/openapi.yaml) - API specification

---

## Step 1: Database Schema (Backend) - 1 hour

### 1.1 Create Migration

Create migration file in `supabase/migrations/`:

```sql
-- supabase/migrations/20251106_generation_flow.sql

-- Add generation status enum (if not exists)
DO $$ BEGIN
    CREATE TYPE generation_status AS ENUM (
        'pending',
        'processing',
        'completed',
        'partial_failed',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add area generation status enum (if not exists)
DO $$ BEGIN
    CREATE TYPE area_status AS ENUM (
        'not_started',
        'pending',
        'processing',
        'completed',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add processing stage enum (if not exists)
DO $$ BEGIN
    CREATE TYPE processing_stage AS ENUM (
        'queued',
        'retrieving_imagery',
        'analyzing_property',
        'generating_design',
        'applying_style',
        'finalizing',
        'complete'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Extend generations table (if columns don't exist)
ALTER TABLE generations
    ADD COLUMN IF NOT EXISTS request_params JSONB,
    ADD COLUMN IF NOT EXISTS total_cost INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20),
    ADD COLUMN IF NOT EXISTS start_processing_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Create generation_areas table
CREATE TABLE IF NOT EXISTS generation_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
    area VARCHAR(50) NOT NULL,
    status area_status NOT NULL DEFAULT 'pending',
    progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    status_message TEXT,
    current_stage processing_stage,
    image_url TEXT,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_generation_areas_generation_id ON generation_areas(generation_id);
CREATE INDEX IF NOT EXISTS idx_generation_areas_status ON generation_areas(status);

-- Create generation_source_images table
CREATE TABLE IF NOT EXISTS generation_source_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
    image_type VARCHAR(20) NOT NULL,
    image_url TEXT NOT NULL,
    image_width INTEGER,
    image_height INTEGER,
    image_size_bytes BIGINT,
    pano_id VARCHAR(100),
    api_cost DECIMAL(10, 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_generation_source_images_generation_id ON generation_source_images(generation_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_generation_areas_updated_at ON generation_areas;
CREATE TRIGGER update_generation_areas_updated_at
    BEFORE UPDATE ON generation_areas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 1.2 Apply Migration

Use Supabase MCP or psql:

```bash
# Option 1: Supabase MCP (recommended)
# Use the mcp__supabase__apply_migration tool

# Option 2: psql
psql $DATABASE_URL -f supabase/migrations/20251106_generation_flow.sql
```

### 1.3 Verify Schema

```bash
psql $DATABASE_URL -c "\d generation_areas"
psql $DATABASE_URL -c "\d generation_source_images"
```

---

## Step 2: Backend API Implementation - 4-6 hours

### 2.1 Create Pydantic Models

Create `backend/src/models/generation.py`:

```python
from pydantic import BaseModel, Field, validator
from typing import List, Optional
from enum import Enum
from datetime import datetime

class YardArea(str, Enum):
    FRONT_YARD = "front_yard"
    BACKYARD = "backyard"
    WALKWAY = "walkway"
    SIDE_YARD = "side_yard"
    PATIO = "patio"
    POOL_AREA = "pool_area"

class DesignStyle(str, Enum):
    MODERN_MINIMALIST = "modern_minimalist"
    CALIFORNIA_NATIVE = "california_native"
    JAPANESE_ZEN = "japanese_zen"
    ENGLISH_GARDEN = "english_garden"
    DESERT_LANDSCAPE = "desert_landscape"
    MEDITERRANEAN = "mediterranean"
    TROPICAL = "tropical"
    COTTAGE_GARDEN = "cottage_garden"

class GenerationStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    PARTIAL_FAILED = "partial_failed"
    FAILED = "failed"

class CreateGenerationRequest(BaseModel):
    address: Optional[str] = Field(None, max_length=500)
    areas: List[YardArea] = Field(..., min_items=1, max_items=4)
    style: DesignStyle
    custom_prompt: Optional[str] = Field(None, max_length=500)

    @validator('address', 'image', pre=True, always=True)
    def check_address_or_image(cls, v, values):
        """Ensure either address or image is provided"""
        if not values.get('address') and not values.get('image'):
            raise ValueError('Either address or image must be provided')
        return v

class AreaStatusResponse(BaseModel):
    area: YardArea
    status: str
    progress_percentage: int = Field(ge=0, le=100)
    status_message: Optional[str] = None
    current_stage: Optional[str] = None
    image_url: Optional[str] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

class GenerationResponse(BaseModel):
    id: str
    status: GenerationStatus
    total_cost: int
    payment_method: str
    areas: List[AreaStatusResponse]
    created_at: datetime
    estimated_completion: Optional[datetime] = None
```

### 2.2 Create Generation Service

Create `backend/src/services/generation_service.py`:

```python
import asyncio
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime, timedelta
import asyncpg

from src.db.connection_pool import db_pool
from src.services.trial_service import TrialService
from src.services.token_service import TokenService
from src.services.maps_service import MapsService
from src.models.generation import YardArea, DesignStyle, GenerationStatus

class GenerationService:
    def __init__(self):
        self.trial_service = TrialService()
        self.token_service = TokenService()
        self.maps_service = MapsService()

    async def create_generation(
        self,
        user_id: UUID,
        address: Optional[str],
        areas: List[YardArea],
        style: DesignStyle,
        custom_prompt: Optional[str] = None
    ) -> dict:
        """
        Create a new generation request

        Steps:
        1. Authorize payment (subscription → trial → token)
        2. Deduct payment atomically
        3. Retrieve Street View imagery
        4. Create generation record
        5. Queue background tasks
        """
        async with db_pool.transaction() as conn:
            # Step 1: Check payment authorization
            payment_method = await self._check_payment_authorization(user_id, len(areas))

            # Step 2: Deduct payment atomically
            if payment_method == "trial":
                await self.trial_service.deduct_trial_atomic(conn, user_id, len(areas))
            elif payment_method == "token":
                await self.token_service.deduct_tokens_atomic(conn, user_id, len(areas))
            # Subscription: no deduction needed

            # Step 3: Retrieve imagery
            image_url, pano_id = await self.maps_service.get_street_view_image(address)

            # Step 4: Create generation record
            generation_id = await conn.fetchval("""
                INSERT INTO generations (
                    user_id, status, payment_type, tokens_deducted,
                    request_params, total_cost, payment_method
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            """, user_id, GenerationStatus.PENDING.value, payment_method,
                len(areas) if payment_method == "token" else 0,
                {"address": address, "style": style.value, "custom_prompt": custom_prompt},
                len(areas), payment_method)

            # Create source image record
            await conn.execute("""
                INSERT INTO generation_source_images (
                    generation_id, image_type, image_url, pano_id, api_cost
                )
                VALUES ($1, $2, $3, $4, $5)
            """, generation_id, "street_view", image_url, pano_id, 0.007)

            # Create area records
            for area in areas:
                await conn.execute("""
                    INSERT INTO generation_areas (
                        generation_id, area, status, progress_percentage
                    )
                    VALUES ($1, $2, $3, $4)
                """, generation_id, area.value, "pending", 0)

        # Step 5: Queue background tasks (outside transaction)
        # TODO: Implement background worker with FastAPI BackgroundTasks
        # await self._process_generation_async(generation_id, areas, style, custom_prompt)

        return {
            "id": str(generation_id),
            "status": GenerationStatus.PENDING.value,
            "total_cost": len(areas),
            "payment_method": payment_method,
            "created_at": datetime.utcnow().isoformat()
        }

    async def get_generation_status(self, generation_id: UUID, user_id: UUID) -> dict:
        """Get status and progress for a generation request"""
        async with db_pool.acquire() as conn:
            # Get generation
            generation = await conn.fetchrow("""
                SELECT * FROM generations
                WHERE id = $1 AND user_id = $2
            """, generation_id, user_id)

            if not generation:
                raise ValueError("Generation not found")

            # Get areas
            areas = await conn.fetch("""
                SELECT * FROM generation_areas
                WHERE generation_id = $1
                ORDER BY created_at
            """, generation_id)

            return {
                "id": str(generation["id"]),
                "status": generation["status"],
                "areas": [dict(area) for area in areas],
                "created_at": generation["created_at"].isoformat(),
                "updated_at": generation["updated_at"].isoformat()
            }
```

### 2.3 Create API Endpoints

Update `backend/src/api/endpoints/generations.py`:

```python
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from typing import List, Optional

from src.models.generation import (
    CreateGenerationRequest, GenerationResponse, YardArea, DesignStyle
)
from src.services.generation_service import GenerationService
from src.api.dependencies import get_current_user

router = APIRouter(prefix="/v1/generations", tags=["generations"])

@router.post("/", response_model=GenerationResponse, status_code=201)
async def create_generation(
    address: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    areas: List[YardArea] = Form(...),
    style: DesignStyle = Form(...),
    custom_prompt: Optional[str] = Form(None),
    user = Depends(get_current_user),
    service: GenerationService = Depends(GenerationService)
):
    """Create a new generation request"""
    try:
        result = await service.create_generation(
            user_id=user.id,
            address=address,
            areas=areas,
            style=style,
            custom_prompt=custom_prompt
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{generation_id}", response_model=GenerationResponse)
async def get_generation_status(
    generation_id: str,
    user = Depends(get_current_user),
    service: GenerationService = Depends(GenerationService)
):
    """Get generation status and progress"""
    try:
        result = await service.get_generation_status(generation_id, user.id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
```

---

## Step 3: Frontend Components - 6-8 hours

### 3.1 Create Generation Store

Create `frontend/src/store/generationStore.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GenerationProgressState } from '@/specs/004-generation-flow/contracts/types';

interface GenerationStore {
  activeRequest: GenerationProgressState | null;
  setActiveRequest: (request: GenerationProgressState) => void;
  clearActiveRequest: () => void;
}

export const useGenerationStore = create<GenerationStore>()(
  persist(
    (set) => ({
      activeRequest: null,
      setActiveRequest: (request) => set({ activeRequest: request }),
      clearActiveRequest: () => set({ activeRequest: null }),
    }),
    { name: 'generation-state' }
  )
);
```

### 3.2 Create API Client

Update `frontend/src/lib/api.ts`:

```typescript
import { CreateGenerationRequest, GenerationResponse, GenerationStatusResponse, PaymentStatusResponse } from '@/specs/004-generation-flow/contracts/types';

export const generationsAPI = {
  create: async (data: CreateGenerationRequest): Promise<GenerationResponse> => {
    const formData = new FormData();
    if (data.address) formData.append('address', data.address);
    if (data.image) formData.append('image', data.image);
    data.areas.forEach(area => formData.append('areas', area));
    formData.append('style', data.style);
    if (data.custom_prompt) formData.append('custom_prompt', data.custom_prompt);

    const response = await api.post('/generations', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getStatus: async (id: string): Promise<GenerationStatusResponse> => {
    const response = await api.get(`/generations/${id}`);
    return response.data;
  }
};

export const paymentAPI = {
  getStatus: async (): Promise<PaymentStatusResponse> => {
    const response = await api.get('/users/payment-status');
    return response.data;
  }
};
```

### 3.3 Create Form Components

**Directory Structure**:
```
frontend/src/components/generation/
├── AddressInput.tsx      # Address autocomplete
├── AreaSelector.tsx      # Multi-area selection
├── StyleSelector.tsx     # Style dropdown
├── PaymentIndicator.tsx  # Payment method display
├── GenerationProgress.tsx # Progress tracker
└── GenerationForm.tsx    # Main form
```

**Example: GenerationForm.tsx**:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generationsAPI } from '@/lib/api';
import { useGenerationStore } from '@/store/generationStore';
import { YardArea, DesignStyle, GenerationFormState } from '@/specs/004-generation-flow/contracts/types';

export default function GenerationForm() {
  const router = useRouter();
  const { setActiveRequest } = useGenerationStore();
  const [formState, setFormState] = useState<GenerationFormState>({
    address: '',
    selectedAreas: [],
    style: null,
    customPrompt: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await generationsAPI.create({
        address: formState.address,
        areas: formState.selectedAreas,
        style: formState.style!,
        custom_prompt: formState.customPrompt || undefined
      });

      // Store request ID for progress recovery
      setActiveRequest({
        requestId: response.id,
        timestamp: Date.now(),
        areas: formState.selectedAreas
      });

      // Navigate to progress page
      router.push(`/generate/progress/${response.id}`);
    } catch (error) {
      console.error('Generation failed:', error);
      // Handle error (show modal, etc.)
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = formState.address &&
                  formState.selectedAreas.length > 0 &&
                  formState.style;

  return (
    <form onSubmit={handleSubmit}>
      {/* Address input, area selector, style selector */}
      <button type="submit" disabled={!isValid || isSubmitting}>
        {isSubmitting ? 'Starting...' : `Generate Design (${formState.selectedAreas.length} ${formState.selectedAreas.length === 1 ? 'area' : 'areas'})`}
      </button>
    </form>
  );
}
```

---

## Step 4: Progress Polling - 1 hour

Create `frontend/src/hooks/useGenerationProgress.ts`:

```typescript
import { useEffect, useState } from 'react';
import { generationsAPI } from '@/lib/api';
import { GenerationStatusResponse, GenerationStatus } from '@/specs/004-generation-flow/contracts/types';

export const useGenerationProgress = (requestId: string) => {
  const [status, setStatus] = useState<GenerationStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    if (!requestId || !isPolling) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await generationsAPI.getStatus(requestId);
        setStatus(response);

        // Stop polling if completed or failed
        if (response.status === GenerationStatus.Completed ||
            response.status === GenerationStatus.Failed) {
          setIsPolling(false);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Polling error:', error);
        setIsPolling(false);
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [requestId, isPolling]);

  return { status, isPolling };
};
```

---

## Step 5: Testing - 2-3 hours

### 5.1 Backend Unit Tests

Create `backend/tests/test_generation_service.py`:

```python
import pytest
from src.services.generation_service import GenerationService
from src.models.generation import YardArea, DesignStyle

@pytest.mark.asyncio
async def test_create_generation_with_trial_credits():
    """Test generation creation with trial credits"""
    service = GenerationService()

    result = await service.create_generation(
        user_id=test_user_id,
        address="1600 Amphitheatre Parkway, Mountain View, CA",
        areas=[YardArea.FRONT_YARD],
        style=DesignStyle.MODERN_MINIMALIST
    )

    assert result["status"] == "pending"
    assert result["total_cost"] == 1
    assert result["payment_method"] == "trial"
```

### 5.2 Frontend E2E Tests

Create `frontend/tests/e2e/generation-trial-flow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('TC-E2E-1: Trial user can generate single area design', async ({ page }) => {
  // Login as trial user
  await page.goto('/login');
  // ... login steps ...

  // Navigate to generation page
  await page.goto('/generate');

  // Fill form
  await page.fill('[data-testid="address-input"]', '1600 Amphitheatre Parkway, Mountain View, CA');
  await page.click('[data-testid="area-front_yard"]');
  await page.selectOption('[data-testid="style-select"]', 'modern_minimalist');

  // Submit
  await page.click('[data-testid="generate-button"]');

  // Wait for progress page
  await expect(page).toHaveURL(/\/generate\/progress\/.+/);

  // Verify progress updates
  await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();

  // Wait for completion (max 2 minutes)
  await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible({ timeout: 120000 });
});
```

---

## Testing Checklist

- [ ] Backend: Trial credit deduction works atomically
- [ ] Backend: Token deduction works atomically
- [ ] Backend: Subscription users bypass payment deduction
- [ ] Backend: Street View imagery retrieval works
- [ ] Frontend: Form validation works correctly
- [ ] Frontend: Progress polling updates every 2 seconds
- [ ] Frontend: Page refresh recovers progress
- [ ] Frontend: Payment indicator displays correctly
- [ ] E2E: Single-area generation completes in <60 seconds
- [ ] E2E: Multi-area (3 areas) completes in <90 seconds
- [ ] E2E: Failed generation refunds payment automatically

---

## Deployment Checklist

- [ ] Database migration applied to production
- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured:
  - [ ] `GOOGLE_MAPS_API_KEY` (backend)
  - [ ] `GEMINI_API_KEY` (backend)
  - [ ] `NEXT_PUBLIC_API_URL` (frontend)
- [ ] Google Maps API quotas checked (500 req/day free)
- [ ] Monitoring enabled (Sentry, LogRocket)
- [ ] E2E tests passing in production

---

## Troubleshooting

### Issue: Generation stuck in "pending" status

**Cause**: Background worker not implemented
**Fix**: Implement FastAPI BackgroundTasks (see research.md)

### Issue: Race condition in payment deduction

**Cause**: Not using row-level locking
**Fix**: Ensure `FOR UPDATE NOWAIT` in SQL queries

### Issue: Page refresh loses progress

**Cause**: localStorage not persisted correctly
**Fix**: Check useGenerationStore persistence config

### Issue: 403 Insufficient Payment

**Cause**: User has no trial/token/subscription
**Fix**: Show upgrade modal, redirect to /pricing

---

## Success Metrics

Track these metrics after deployment:

- **SC-001**: Time to first generation (<3 minutes)
- **SC-003**: Multi-area completion time (<90 seconds)
- **SC-004**: Success rate (>95%)
- **SC-005**: Zero negative balances (CHECK constraints)
- **SC-008**: Trial-to-paid conversion (+25%)
- **SC-010**: Automatic refund time (<2 seconds)

---

## Next Steps After Implementation

1. **Implement Background Worker** (P0 - CRITICAL)
   - Use FastAPI BackgroundTasks
   - Integrate Gemini API
   - Update status from pending → processing → completed

2. **Add Status Polling UI** (P1)
   - Use `useGenerationProgress` hook
   - Show real-time progress bar
   - Display stage messages

3. **Complete E2E Tests** (P1)
   - TC-E2E-2: Token purchase flow
   - TC-E2E-3: Multi-area generation
   - TC-E2E-4: Subscription flow

4. **Optimize Performance** (P2)
   - Add Redis caching for Street View images
   - Implement image CDN
   - Add database query optimization

---

## Support

**Questions?** Review:
- [Feature Specification](./spec.md)
- [Technical Research](./research.md)
- [API Contracts](./contracts/openapi.yaml)
- [CLAUDE.md](/CLAUDE.md)

**Issues?** Check:
- [TC-E2E-1 Test Report](/TC-E2E-1_TRIAL_FLOW_CONTINUATION.md)
- Backend logs: Railway dashboard
- Frontend errors: Browser console + Vercel logs
