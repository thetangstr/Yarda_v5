# Data Model: Google Maps Property Image Integration

**Feature**: 003-google-maps-integration
**Date**: 2025-11-04
**Status**: Complete

## Overview

This document defines the data model changes required to support automatic property image retrieval from Google Maps Platform APIs. The primary change is adding image source tracking to the generations table to record whether imagery was user-uploaded or fetched from Google Maps (Street View or Satellite).

---

## Entity: Generation (MODIFIED)

**Purpose**: Represents a user's landscape design generation request, including the source of the property image used.

**Table**: `generations` (existing table, adding new field)

**Schema Changes**:

### New Field: `image_source`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `image_source` | `VARCHAR(50)` | NOT NULL, CHECK constraint | Source of property image used for generation |

**Valid Values** (CHECK constraint):
```sql
CHECK (image_source IN ('user_upload', 'google_street_view', 'google_satellite'))
```

**Field Description**:
- `user_upload`: User manually uploaded their own property image
- `google_street_view`: Image automatically fetched from Google Maps Street View Static API
- `google_satellite`: Image automatically fetched from Google Maps Static API (satellite view)

**Purpose of Tracking**:
1. **Analytics**: Understand usage patterns (how often users upload vs use auto-fetch)
2. **Quality Monitoring**: Track generation success rates by image source
3. **Cost Attribution**: Associate Google Maps API costs with specific generations
4. **User Insights**: Identify which image sources produce best design outcomes
5. **Support**: Troubleshoot issues related to image quality or availability

### Migration Script

**File**: `backend/alembic/versions/003_add_image_source_to_generations.py`

```sql
-- Migration: Add image_source field to generations table
-- Date: 2025-11-04
-- Feature: 003-google-maps-integration

-- Step 1: Add column with temporary nullable constraint
ALTER TABLE generations
ADD COLUMN image_source VARCHAR(50);

-- Step 2: Backfill existing records (assume all current generations used user uploads)
UPDATE generations
SET image_source = 'user_upload'
WHERE image_source IS NULL;

-- Step 3: Make column NOT NULL after backfill
ALTER TABLE generations
ALTER COLUMN image_source SET NOT NULL;

-- Step 4: Add CHECK constraint for valid values
ALTER TABLE generations
ADD CONSTRAINT check_image_source_valid
CHECK (image_source IN ('user_upload', 'google_street_view', 'google_satellite'));

-- Step 5: Add index for analytics queries
CREATE INDEX idx_generations_image_source ON generations(image_source);

-- Rollback instructions:
-- ALTER TABLE generations DROP CONSTRAINT check_image_source_valid;
-- DROP INDEX idx_generations_image_source;
-- ALTER TABLE generations DROP COLUMN image_source;
```

### Updated Schema (Full Table)

```sql
CREATE TABLE generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('trial', 'token', 'subscription')),
    tokens_deducted INTEGER NOT NULL DEFAULT 0,
    address TEXT NOT NULL,
    request_params JSONB NOT NULL,  -- Contains: area, style, custom_prompt
    image_source VARCHAR(50) NOT NULL CHECK (image_source IN ('user_upload', 'google_street_view', 'google_satellite')),  -- NEW FIELD
    result_url TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Indexes
    INDEX idx_generations_user_id (user_id),
    INDEX idx_generations_status (status),
    INDEX idx_generations_created_at (created_at),
    INDEX idx_generations_image_source (image_source)  -- NEW INDEX
);
```

---

## Analytics Queries

### Query 1: Image Source Usage Statistics

```sql
SELECT
    image_source,
    COUNT(*) as total_generations,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
    ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*), 2) as success_rate
FROM generations
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY image_source
ORDER BY total_generations DESC;
```

**Expected Output**:
```
 image_source        | total_generations | percentage | successful | success_rate
--------------------+-------------------+------------+------------+-------------
 user_upload         |              1500 |      60.00 |       1425 |        95.00
 google_street_view  |               800 |      32.00 |        720 |        90.00
 google_satellite    |               200 |       8.00 |        175 |        87.50
```

### Query 2: Google Maps API Cost Estimation

```sql
SELECT
    DATE_TRUNC('day', created_at) as day,
    COUNT(CASE WHEN image_source = 'google_street_view' THEN 1 END) as street_view_count,
    COUNT(CASE WHEN image_source = 'google_satellite' THEN 1 END) as satellite_count,
    -- Cost calculation (Street View: $0.007/image, Satellite: $0.002/image)
    ROUND(
        (COUNT(CASE WHEN image_source = 'google_street_view' THEN 1 END) * 0.007) +
        (COUNT(CASE WHEN image_source = 'google_satellite' THEN 1 END) * 0.002),
        2
    ) as estimated_daily_cost
FROM generations
WHERE created_at >= NOW() - INTERVAL '30 days'
    AND image_source IN ('google_street_view', 'google_satellite')
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;
```

### Query 3: User Preferences by Area

```sql
SELECT
    request_params->>'area' as landscape_area,
    image_source,
    COUNT(*) as generation_count,
    AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100 as success_rate
FROM generations
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY landscape_area, image_source
ORDER BY landscape_area, generation_count DESC;
```

**Expected Insight**: Front yards should have higher `google_street_view` usage, while back/side yards use more `google_satellite`.

---

## Python Model Updates

**File**: `backend/src/models/generation.py`

```python
from enum import Enum
from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

class ImageSource(str, Enum):
    """Source of property image used for generation"""
    USER_UPLOAD = "user_upload"
    GOOGLE_STREET_VIEW = "google_street_view"
    GOOGLE_SATELLITE = "google_satellite"

class GenerationStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class PaymentType(str, Enum):
    TRIAL = "trial"
    TOKEN = "token"
    SUBSCRIPTION = "subscription"

class Generation(BaseModel):
    """
    Landscape generation record

    Tracks user requests for landscape designs, including payment method,
    image source, and generation status.
    """
    id: UUID
    user_id: UUID
    status: GenerationStatus
    payment_type: PaymentType
    tokens_deducted: int = Field(ge=0)
    address: str = Field(min_length=1)
    request_params: dict  # Contains: area, style, custom_prompt
    image_source: ImageSource  # NEW FIELD
    result_url: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        orm_mode = True
```

---

## Validation Rules

### Frontend Validation (TypeScript)

**File**: `frontend/src/types/index.ts`

```typescript
export type ImageSource = 'user_upload' | 'google_street_view' | 'google_satellite';

export interface Generation {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentType: 'trial' | 'token' | 'subscription';
  tokensDeducted: number;
  address: string;
  requestParams: {
    area: 'front_yard' | 'back_yard' | 'side_yard' | 'full_property';
    style: string;
    customPrompt?: string;
  };
  imageSource: ImageSource;  // NEW FIELD
  resultUrl?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}
```

### Backend Validation

**Rules**:
1. `image_source` MUST be set for all new generation records (NOT NULL constraint)
2. `image_source` MUST be one of three valid values (CHECK constraint enforced by database)
3. When user uploads image: Set `image_source = 'user_upload'`
4. When Google Maps Street View used: Set `image_source = 'google_street_view'`
5. When Google Maps Satellite used: Set `image_source = 'google_satellite'`

**Enforcement Location**:
- Database: CHECK constraint ensures valid values
- Application: Pydantic enum validation in Python models
- API: FastAPI validates request/response using Pydantic models

---

## State Transitions

### Image Source Determination Flow

```
┌─────────────────────────────────────┐
│ User submits generation request     │
└───────────────┬─────────────────────┘
                │
                ▼
        ┌───────────────┐
        │ Image uploaded? │
        └───────┬─────────┘
                │
        ┌───────┴──────────┐
        │ YES              │ NO
        ▼                  ▼
┌───────────────┐  ┌──────────────────────┐
│ image_source  │  │ Check area selection │
│ = user_upload │  └─────────┬────────────┘
└───────────────┘            │
                     ┌───────┴──────────┐
                     │ front_yard?      │
                     └───────┬──────────┘
                             │
                     ┌───────┴──────────┐
                     │ YES             │ NO
                     ▼                 ▼
            ┌────────────────┐  ┌──────────────────┐
            │ Try Street View │  │ Try Satellite    │
            └───────┬─────────┘  └────────┬─────────┘
                    │                     │
            ┌───────┴─────────┐   ┌───────┴─────────┐
            │ Available?      │   │ Available?      │
            └───────┬─────────┘   └────────┬────────┘
                    │                      │
            ┌───────┴──────┐       ┌───────┴──────┐
            │ YES          │ NO    │ YES          │ NO
            ▼              ▼       ▼              ▼
    ┌───────────────┐  ┌──────┐  ┌──────────────┐  ┌─────────┐
    │ image_source  │  │ Sat? │  │ image_source │  │ REFUND  │
    │ = google_     │  │      │  │ = google_    │  │ Error   │
    │   street_view │  │      │  │   satellite  │  │ Message │
    └───────────────┘  └──┬───┘  └──────────────┘  └─────────┘
                          │
                          ▼
                    ┌──────────────┐
                    │ image_source │
                    │ = google_    │
                    │   satellite  │
                    └──────────────┘
```

---

## Relationships

### Generation → User
- **Type**: Many-to-One
- **Foreign Key**: `generations.user_id` → `users.id`
- **Cascade**: ON DELETE CASCADE (if user deleted, generations deleted)

### Generation → Image Source
- **Type**: Enumerated attribute (not a separate table)
- **Constraint**: CHECK constraint enforces valid values
- **No foreign key**: This is a field, not a relationship

---

## Testing Data Model

### Test Case 1: Insert Generation with User Upload

```sql
INSERT INTO generations (
    user_id,
    status,
    payment_type,
    tokens_deducted,
    address,
    request_params,
    image_source
) VALUES (
    '4c6a7032-598d-4f80-bf85-c5535ed90970',
    'pending',
    'trial',
    1,
    '1600 Amphitheatre Parkway, Mountain View, CA',
    '{"area": "front_yard", "style": "modern_minimalist"}',
    'user_upload'
);
```

**Expected**: Success, generation record created

### Test Case 2: Insert Generation with Street View

```sql
INSERT INTO generations (
    user_id,
    status,
    payment_type,
    tokens_deducted,
    address,
    request_params,
    image_source
) VALUES (
    '4c6a7032-598d-4f80-bf85-c5535ed90970',
    'pending',
    'trial',
    1,
    '1600 Amphitheatre Parkway, Mountain View, CA',
    '{"area": "front_yard", "style": "tropical_paradise"}',
    'google_street_view'
);
```

**Expected**: Success, generation record created

### Test Case 3: Insert Generation with Invalid Image Source

```sql
INSERT INTO generations (
    user_id,
    status,
    payment_type,
    tokens_deducted,
    address,
    request_params,
    image_source
) VALUES (
    '4c6a7032-598d-4f80-bf85-c5535ed90970',
    'pending',
    'trial',
    1,
    '1600 Amphitheatre Parkway, Mountain View, CA',
    '{"area": "front_yard", "style": "modern_minimalist"}',
    'invalid_source'
);
```

**Expected**: ERROR - CHECK constraint violation

### Test Case 4: Insert Generation without Image Source

```sql
INSERT INTO generations (
    user_id,
    status,
    payment_type,
    tokens_deducted,
    address,
    request_params
) VALUES (
    '4c6a7032-598d-4f80-bf85-c5535ed90970',
    'pending',
    'trial',
    1,
    '1600 Amphitheatre Parkway, Mountain View, CA',
    '{"area": "front_yard", "style": "modern_minimalist"}'
);
```

**Expected**: ERROR - NOT NULL constraint violation

---

## Performance Considerations

### Index Strategy

**Index on `image_source`**:
```sql
CREATE INDEX idx_generations_image_source ON generations(image_source);
```

**Rationale**:
- Frequent analytics queries filter by `image_source`
- Small cardinality (3 values) but high selectivity for reports
- Compound index opportunity with `created_at` for date-range queries

**Composite Index for Analytics**:
```sql
CREATE INDEX idx_generations_image_source_created_at
ON generations(image_source, created_at DESC);
```

**Use Case**: Monthly/weekly reports on image source usage trends

### Query Performance

**Expected Performance**:
- Single generation insert: < 5ms
- Image source usage query (30 days): < 100ms (with index)
- Cost estimation query: < 200ms
- User preferences query: < 150ms

**Optimization**: Consider materialized view for monthly reports if query volume becomes high.

---

## Data Integrity

### Constraints

1. **NOT NULL**: `image_source` cannot be NULL (all generations must have known image source)
2. **CHECK**: `image_source` must be one of three valid enum values
3. **Foreign Key**: `user_id` must reference valid user (CASCADE delete)
4. **Business Logic**: Image source set based on actual retrieval method used

### Audit Trail

**Recommendation**: Consider adding audit fields if needed:
- `image_source_determined_at`: Timestamp when image source was set
- `google_maps_api_call_duration_ms`: Performance tracking for API calls

---

**Document Status**: ✅ Complete | Data model design finalized
**Next Phase**: API Contracts (contracts/)
