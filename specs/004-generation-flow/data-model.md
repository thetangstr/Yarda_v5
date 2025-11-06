# Data Model: Generation Flow Interface

**Feature Branch**: `004-generation-flow`
**Created**: 2025-11-06
**Status**: Draft

## Overview

This document defines the data entities, relationships, and state transitions for the Generation Flow feature. All entities are described in a technology-agnostic manner, focusing on business logic rather than implementation details.

---

## Core Entities

### 1. Property Address

**Purpose**: Represents a user-provided property location for landscape generation

**Attributes**:
- Address text (user-entered, free-form string)
- Geocoded coordinates (latitude, longitude in decimal degrees)
- Street View availability status (available, unavailable, checking)
- Street View imagery reference (pano ID or image identifier)
- Satellite imagery reference (map tile or image identifier)
- Validation status (valid, invalid, pending_validation)
- Validation timestamp (when address was last validated)
- Error message (if validation failed, human-readable description)

**Validation Rules** (from FR-001, FR-016):
- Address text must not be empty
- Must be geocodable to valid coordinates
- Coordinates must be within valid range (-90 to 90 lat, -180 to 180 lng)
- Street View imagery must exist at coordinates OR user must provide manual upload

**State Transitions**:
```
pending_validation → valid (geocoding successful + imagery available)
pending_validation → invalid (geocoding failed OR imagery unavailable)
invalid → valid (user provides manual image upload)
```

**Relationships**:
- One Property Address belongs to one Generation Request
- Property Address may have multiple associated imagery sources (street view, satellite)

---

### 2. Yard Area

**Purpose**: Represents a specific section of a property to be redesigned

**Attributes**:
- Area type (enum: front_yard, backyard, walkway, side_yard, patio, pool_area)
- Selection state (boolean: selected, unselected)
- Token cost (integer, always 1 per area in current pricing)
- Custom prompt text (optional string, additional user instructions)
- Generation status (enum: not_started, pending, processing, completed, failed)
- Progress percentage (integer 0-100, for UI progress bar)
- Status message (string, e.g., "Analyzing property", "Generating design")
- Completion timestamp (when area generation finished)
- Error message (if failed, human-readable description)
- Generated image URL (storage location of final design)
- Generation duration (seconds, for performance tracking)

**Validation Rules** (from FR-003, FR-004):
- Area type must be from predefined enum
- Custom prompt must be ≤ 500 characters if provided
- Progress percentage must be 0-100
- Status message must be ≤ 200 characters

**State Transitions**:
```
not_started → pending (user submits generation request)
pending → processing (background worker picks up task)
processing → completed (AI generation successful, image stored)
processing → failed (AI generation error, timeout, or API failure)
failed → pending (user retries generation)
```

**Relationships**:
- Multiple Yard Areas belong to one Generation Request
- Each Yard Area has one generated result (image)
- Yard Area references Property Address imagery as input

---

### 3. Generation Request

**Purpose**: Represents a user's request to generate landscape designs for one or more areas

**Attributes**:
- Unique request identifier (UUID or similar)
- User identifier (links to user account)
- Property address (nested Property Address entity)
- Selected areas list (array of Yard Area entities)
- Design style (enum: modern_minimalist, california_native, japanese_zen, english_garden, desert_landscape, mediterranean, tropical, cottage_garden)
- Total cost (integer, number of tokens/credits deducted)
- Payment method used (enum: trial, token, subscription)
- Overall status (enum: pending, processing, completed, partial_failed, failed)
- Creation timestamp (when request initiated)
- Start processing timestamp (when background worker started)
- Completion timestamp (when all areas finished)
- Total duration (seconds, for SC-003 performance tracking)
- Request metadata (JSON, stores UI state for recovery)

**Validation Rules** (from FR-015, FR-006):
- User must be authenticated
- Must have at least one selected area
- Must have valid design style
- Total cost must equal number of selected areas
- Payment method must be authorized before creation

**State Transitions**:
```
pending → processing (background worker starts processing areas)
processing → completed (all areas completed successfully)
processing → partial_failed (some areas completed, some failed)
processing → failed (all areas failed OR system error before processing)
failed → pending (user retries entire request)
```

**Relationships**:
- One Generation Request belongs to one User
- One Generation Request has one Property Address
- One Generation Request has 1-N Yard Areas (min 1, max 4 typical)
- Generation Request creates Payment Transaction record

---

### 4. Generation Progress

**Purpose**: Tracks real-time progress for each yard area during generation

**Attributes**:
- Yard area reference (links to specific Yard Area)
- Current stage (enum: queued, retrieving_imagery, analyzing_property, generating_design, applying_style, finalizing, complete)
- Progress percentage (integer 0-100, calculated from stage)
- Stage start timestamp (when current stage began)
- Stage duration estimate (seconds, for ETA calculation)
- Status message (human-readable, e.g., "Analyzing your front yard layout...")
- Error details (if stage failed, technical error for debugging)
- Retry count (number of automatic retry attempts, max 3)

**Validation Rules** (from FR-009):
- Progress percentage must increase monotonically (never decrease)
- Status message must be user-friendly (no technical jargon)
- Retry count must not exceed 3

**State Transitions** (Linear progression):
```
queued (0%)
  → retrieving_imagery (10%)
  → analyzing_property (30%)
  → generating_design (60%)
  → applying_style (80%)
  → finalizing (95%)
  → complete (100%)
```

**Relationships**:
- One Generation Progress tracks one Yard Area
- Progress updates are polled by frontend every 2 seconds (FR-009)

---

### 5. Payment Status

**Purpose**: Represents user's current payment capabilities for generation

**Attributes**:
- User identifier (links to user account)
- Trial credits remaining (integer, 0-3 for new users)
- Trial credits used (integer, for tracking conversion)
- Token balance (integer, purchased tokens available)
- Subscription tier (enum: free, monthly_pro, annual_pro)
- Subscription status (enum: active, past_due, canceled, trialing, incomplete)
- Active payment method (enum: trial, token, subscription, none)
- Payment method hierarchy result (enum from FR-007 logic)
- Subscription renewal date (if subscribed)
- Last token purchase date (for analytics)

**Validation Rules** (from FR-007, FR-008, FR-014):
- Trial credits remaining must be ≥ 0
- Token balance must be ≥ 0 (enforced by CHECK constraint)
- Subscription status must be valid enum value
- Payment method hierarchy must be: subscription > trial > token

**Business Logic** (from FR-007):
```
IF subscription_status = 'active' THEN
  active_payment_method = 'subscription' (unlimited)
ELSE IF trial_credits_remaining > 0 THEN
  active_payment_method = 'trial'
ELSE IF token_balance > 0 THEN
  active_payment_method = 'token'
ELSE
  active_payment_method = 'none' (blocks generation per FR-014)
```

**State Transitions**:
- Trial credits decrease atomically on generation (FR-008)
- Token balance decreases atomically on generation (FR-008)
- Subscription status changes on Stripe webhook events
- Automatic refund increases balance if generation fails (FR-011)

**Relationships**:
- One Payment Status per User (1:1)
- Payment Status determines Generation Request authorization
- Payment Transactions reference Payment Status for balance updates

---

## Supporting Entities

### 6. Payment Transaction

**Purpose**: Audit trail for all payment operations

**Attributes**:
- Transaction identifier (UUID)
- User identifier
- Transaction type (enum: trial_deduction, trial_refund, token_deduction, token_refund, token_purchase, subscription_charge)
- Amount (integer, tokens or credits affected)
- Balance before (integer, for audit verification)
- Balance after (integer, for audit verification)
- Generation request reference (if related to generation)
- Description (human-readable, e.g., "Front Yard - Modern Minimalist")
- Timestamp (transaction occurrence)
- Idempotency key (prevents duplicate processing)

**Validation Rules**:
- Balance before + amount = balance after (for deductions, amount is negative)
- Idempotency key must be unique
- All deduction transactions must have corresponding generation request

**Relationships**:
- Multiple Transactions belong to one User
- Transaction may reference one Generation Request

---

### 7. Generation Source Image

**Purpose**: Stores original property imagery used as input

**Attributes**:
- Image identifier (UUID)
- Generation request reference
- Image type (enum: street_view, satellite, user_upload)
- Image URL (storage location)
- Image dimensions (width × height pixels)
- Image size (bytes, for cost tracking)
- Capture timestamp (when image retrieved/uploaded)
- Google Maps pano ID (if street view)
- API cost (dollars, for analytics, e.g., 0.007)

**Validation Rules**:
- Image URL must be accessible
- Image must be valid format (JPEG, PNG)
- Image dimensions must be ≥ 640×480 pixels
- User uploads must be ≤ 10MB

**Relationships**:
- Multiple Source Images belong to one Generation Request
- Source Images referenced by Yard Areas for generation

---

## Data Relationships Summary

```
User (1) ──< (N) Generation Requests
User (1) ──── (1) Payment Status
User (1) ──< (N) Payment Transactions

Generation Request (1) ──── (1) Property Address
Generation Request (1) ──< (N) Yard Areas (min 1, max 4)
Generation Request (1) ──< (N) Generation Source Images
Generation Request (1) ──── (1) Payment Transaction (deduction)

Yard Area (1) ──── (1) Generation Progress
Yard Area (1) ──── (1) Generated Image URL

Payment Transaction (N) ──> (1) Payment Status (updates balance)
Payment Transaction (N) ──> (0..1) Generation Request (optional)
```

---

## State Machine Diagrams

### Generation Request Lifecycle

```
[User Submits Form]
        ↓
  ┌─────────────┐
  │   PENDING   │ (payment deducted, request queued)
  └─────────────┘
        ↓
  ┌─────────────┐
  │ PROCESSING  │ (background worker active)
  └─────────────┘
        ↓
    ┌───┴───┐
    ↓       ↓
┌──────┐  ┌─────────────┐
│FAILED│  │ COMPLETED   │ (all areas successful)
└──────┘  └─────────────┘
    ↑           ↑
    │           │
    └─────┬─────┘
          ↓
  ┌────────────────┐
  │ PARTIAL_FAILED │ (some areas successful)
  └────────────────┘
```

### Yard Area Lifecycle

```
[Area Selected by User]
        ↓
  ┌─────────────┐
  │ NOT_STARTED │
  └─────────────┘
        ↓
  ┌─────────────┐
  │   PENDING   │ (queued for processing)
  └─────────────┘
        ↓
  ┌─────────────┐
  │ PROCESSING  │ (AI generation active, 0-100% progress)
  └─────────────┘
        ↓
    ┌───┴───┐
    ↓       ↓
┌──────┐  ┌──────────┐
│FAILED│  │COMPLETED │ (image URL stored)
└──────┘  └──────────┘
    ↓
[Refund Issued] (FR-011)
```

### Payment Status (Active Payment Method)

```
[User Account Created]
        ↓
  ┌─────────────────┐
  │ trial (3 free)  │ ←─── Initial state
  └─────────────────┘
        ↓ (trial exhausted)
  ┌─────────────────┐
  │ none (blocked)  │ ←─── Shows upgrade modal (FR-014)
  └─────────────────┘
        ↓ (purchase tokens)
  ┌─────────────────┐
  │ token (pay-per) │
  └─────────────────┘
        ↓ (subscribe to Monthly Pro)
  ┌─────────────────┐
  │ subscription    │ ←─── Unlimited (bypasses token/trial)
  └─────────────────┘
        ↓ (subscription canceled)
  ┌─────────────────┐
  │ token (fallback)│ (if balance > 0)
  └─────────────────┘
```

---

## Persistence Requirements

### Atomic Operations (from FR-008, FR-011)

All payment deductions MUST be atomic (all-or-nothing):

1. **Trial Deduction**:
   - Lock user row (`FOR UPDATE NOWAIT`)
   - Check `trial_remaining > 0`
   - Decrement `trial_remaining`
   - Create transaction record
   - Commit OR rollback (on any error)

2. **Token Deduction**:
   - Lock user row (`FOR UPDATE NOWAIT`)
   - Check `token_balance >= cost`
   - Decrement `token_balance`
   - Create transaction record
   - Commit OR rollback (on any error)

3. **Refund on Failure** (FR-011):
   - If generation fails: reverse transaction
   - Increment `trial_remaining` OR `token_balance`
   - Create refund transaction record
   - Update generation status to `failed`

### Recovery Requirements (from FR-012)

Generation progress must survive page refresh:

- **Client-side**: Store `request_id` + `timestamp` in `localStorage`
- **Server-side**: Persist generation status in database
- **On page load**: Poll server with stored `request_id` to resume

### Performance Requirements (from SC-002, SC-003)

- Database queries must use indexes on:
  - `user_id` (for user's generation history)
  - `request_id` (for status polling)
  - `status` (for filtering pending/processing requests)
- Multi-area generation must process in parallel (not sequential)
- Status polling must support 100 concurrent users

---

## Validation Rules Summary

| Entity | Field | Validation | Source |
|--------|-------|------------|--------|
| Property Address | address_text | Not empty | FR-001 |
| Property Address | coordinates | Valid lat/lng range | FR-002 |
| Yard Area | area_type | Must be from enum | FR-003 |
| Yard Area | custom_prompt | Max 500 chars | FR-005 |
| Generation Request | selected_areas | Min 1 area | FR-015 |
| Generation Request | style | Must be from enum | FR-005 |
| Payment Status | trial_remaining | ≥ 0, enforced by CHECK | FR-008 |
| Payment Status | token_balance | ≥ 0, enforced by CHECK | FR-008 |
| Payment Transaction | idempotency_key | Unique | FR-011 |

---

## Data Retention & Privacy

### Retention Policies

- **Generation Requests**: Retain indefinitely (user can view history)
- **Source Images**: Retain 90 days (cost optimization)
- **Payment Transactions**: Retain 7 years (legal compliance)
- **Generation Progress**: Delete after completion + 24 hours

### Privacy Considerations

- **Property Addresses**: May contain PII (user's home address)
  - Must respect user's right to deletion
  - Do not share with third parties without consent
  - Use HTTPS for all image URLs

- **Generated Images**: User owns copyright
  - Store securely with access control
  - Provide download option (future feature)
  - Do not use for training without explicit consent

---

## Success Metrics Mapping

| Success Criterion | Data Required | Entity Source |
|-------------------|---------------|---------------|
| SC-001: Complete in <3 min | `creation_timestamp`, `completion_timestamp` | Generation Request |
| SC-003: Multi-area <90 sec | `start_processing_timestamp`, `completion_timestamp` | Generation Request |
| SC-004: 95% success rate | `status` (completed vs failed) | Generation Request |
| SC-005: Zero negative balances | `token_balance`, `trial_remaining` CHECK constraints | Payment Status |
| SC-007: 100% progress recovery | `request_id` in localStorage + database status | Generation Request |
| SC-010: Refund within 2 sec | `transaction_timestamp` (deduction vs refund) | Payment Transaction |

---

## Conclusion

All entities are designed to support the functional requirements (FR-001 through FR-020) and success criteria (SC-001 through SC-010) defined in the feature specification. The data model prioritizes:

- **Atomicity**: Payment deductions use row-level locking
- **Recoverability**: Progress persists across page refresh
- **Transparency**: Payment hierarchy clearly tracked
- **Auditability**: All transactions logged immutably
- **Performance**: Parallel processing for multi-area generation

**Next Phase**: Generate API contracts (OpenAPI specification) that operate on these entities.
