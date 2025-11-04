# Localhost Functionality Guide

**What Actually Works in Localhost** - Complete Breakdown

---

## ✅ 1. User Registration - FULLY FUNCTIONAL

**Status**: 🟢 **WORKS COMPLETELY**

**What Happens**:
1. User submits email + password on `/register`
2. Backend validates email format and password (8+ chars)
3. Backend checks for duplicate email
4. Backend hashes password using SHA-256
5. Backend **INSERTS user into Supabase `users` table**:
   - `email`: user's email
   - `password_hash`: hashed password
   - `trial_remaining`: 3 (free credits)
   - `trial_used`: 0
   - `email_verified`: false
   - `subscription_tier`: 'free'
   - `subscription_status`: 'inactive'
6. Backend generates verification token (24hr expiry)
7. Backend **prints verification link to console** (since no email service)
8. Frontend receives `user_id` and shows success

**Code Reference**: [backend/src/api/endpoints/auth.py:114-129](/Volumes/home/Projects_Hosted/Yarda_v5/backend/src/api/endpoints/auth.py#L114-L129)

**Limitations**:
- ⚠️ Email not actually sent (printed to backend console instead)
- ✅ But email verification is SKIPPED via `SKIP_EMAIL_VERIFICATION=true`

---

## ✅ 2. User Login - FULLY FUNCTIONAL

**Status**: 🟢 **WORKS COMPLETELY**

**What Happens**:
1. User submits email + password on `/login`
2. Backend queries `users` table for email
3. Backend compares hashed passwords
4. Backend generates JWT token with:
   - `user_id`
   - `email`
   - 1-hour expiry
5. Frontend receives JWT + user data
6. Frontend stores JWT in:
   - Zustand store (in-memory)
   - localStorage (persisted)
7. All subsequent API calls include JWT in `Authorization: Bearer {token}` header

**Code Reference**: Check auth.py login endpoint

**Test it**:
```
POST http://localhost:8000/auth/login
{
  "email": "test@example.com",
  "password": "password123"
}
```

---

## ✅ 3. Authenticated API Calls - FULLY FUNCTIONAL

**Status**: 🟢 **WORKS COMPLETELY**

**What Happens**:
1. Frontend includes JWT in all API requests
2. Backend validates JWT signature
3. Backend extracts `user_id` from JWT
4. Backend fetches user from database
5. Endpoint receives authenticated user object

**Protected Endpoints**:
- ✅ `/tokens/balance` - Get token balance
- ✅ `/generations/` - List generation history
- ✅ `/generations/` (POST) - Create generation
- ✅ `/subscriptions/current` - Get subscription
- ✅ `/tokens/purchase` - Purchase tokens

---

## ⚠️ 4. Token Purchase - PARTIAL (UI Only)

**Status**: 🟡 **UI WORKS, BACKEND NEEDS WEBHOOK**

**What Works**:
1. ✅ `/purchase` page shows token packages
2. ✅ User selects package
3. ✅ Backend creates Stripe Checkout session
4. ✅ Redirects to Stripe payment page
5. ✅ User completes payment on Stripe

**What Doesn't Work**:
6. ❌ Stripe webhook to `http://localhost:8000/webhooks/stripe` fails
   - **Reason**: Localhost not accessible from internet
   - **Stripe can't call localhost webhook**
7. ❌ Backend never receives "payment successful" notification
8. ❌ Tokens never added to user's account

**Workaround for Testing**:
You can manually test the Stripe Checkout UI, but tokens won't actually be added.

**Code Reference**:
- Frontend: [frontend/src/pages/purchase.tsx](/Volumes/home/Projects_Hosted/Yarda_v5/frontend/src/pages/purchase.tsx)
- Backend: Check token purchase endpoint

---

## 🔍 5. Image Generation - LET'S CHECK

Let me investigate the generation endpoint to see what will work...

