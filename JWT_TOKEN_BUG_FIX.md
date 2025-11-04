# JWT Token Storage Bug Fix

**Date**: 2025-11-04
**Status**: ✅ FIXED
**Severity**: CRITICAL (Blocking authentication after registration)

---

## Summary

Fixed critical bug where JWT tokens were not being retrieved correctly from localStorage, causing 401 Unauthorized errors after successful registration and login.

---

## Problem

After registration → auto-login → redirect to `/generate`, users experienced:

1. **401 Unauthorized errors** on all authenticated API calls
2. Token balance failed to load
3. Error message: "Failed to fetch token balance"
4. Users appeared authenticated (isAuthenticated=true) but API rejected requests

---

## Root Cause

**Incorrect localStorage key** used in two locations:

### 1. TokenBalance Component ([TokenBalance/index.tsx:53](frontend/src/components/TokenBalance/index.tsx#L53))
```typescript
// ❌ WRONG - looking for non-existent key
Authorization: `Bearer ${localStorage.getItem('access_token')}`
```

### 2. Generate Page ([generate.tsx:75](frontend/src/pages/generate.tsx#L75))
```typescript
// ❌ WRONG - looking for non-existent key
Authorization: `Bearer ${localStorage.getItem('access_token')}`
```

**The JWT token is actually stored by Zustand persist middleware at:**
```typescript
localStorage.getItem('user-storage')
// Returns: { state: { accessToken: "jwt_here", user: {...}, ... } }
```

---

## Solution

Updated both components to read from correct Zustand persisted state structure:

### Fix 1: TokenBalance Component
**File**: [frontend/src/components/TokenBalance/index.tsx](frontend/src/components/TokenBalance/index.tsx)

```typescript
// ✅ FIXED - Read from Zustand persisted state
const userStorage = localStorage.getItem('user-storage');
if (!userStorage) {
  setLoading(false);
  return;
}

const { state } = JSON.parse(userStorage);
if (!state?.accessToken) {
  setLoading(false);
  return;
}

const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/tokens/balance`,
  {
    headers: {
      Authorization: `Bearer ${state.accessToken}`,
    },
  }
);
```

### Fix 2: Generate Page
**File**: [frontend/src/pages/generate.tsx](frontend/src/pages/generate.tsx)

```typescript
// ✅ FIXED - Read from Zustand persisted state
const userStorage = localStorage.getItem('user-storage');
if (!userStorage) return;

const { state } = JSON.parse(userStorage);
if (!state?.accessToken) return;

const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/tokens/balance`,
  {
    headers: {
      Authorization: `Bearer ${state.accessToken}`,
    },
  }
);
```

---

## Why This Happened

### Zustand Persist Middleware Structure

The app uses Zustand with persist middleware configured in [userStore.ts:90-98](frontend/src/components/userStore.ts#L90-L98):

```typescript
persist(
  (set) => ({
    // state definitions
  }),
  {
    name: 'user-storage', // ← localStorage key
    partialize: (state) => ({
      user: state.user,
      accessToken: state.accessToken,  // ← JWT stored HERE
      isAuthenticated: state.isAuthenticated,
      tokenBalance: state.tokenBalance,
    }),
  }
)
```

This creates a localStorage entry:
```json
{
  "state": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {...},
    "isAuthenticated": true,
    "tokenBalance": {...}
  },
  "version": 0
}
```

### Correct Way (API Client)

The API client already had it right ([api.ts:24-34](frontend/src/lib/api.ts#L24-L34)):

```typescript
// ✅ CORRECT - API client interceptor
apiClient.interceptors.request.use((config) => {
  const userStorage = localStorage.getItem('user-storage');
  if (userStorage) {
    try {
      const { state } = JSON.parse(userStorage);
      if (state?.accessToken) {
        config.headers.Authorization = `Bearer ${state.accessToken}`;
      }
    } catch (e) {
      console.error('Failed to parse user storage:', e);
    }
  }
  return config;
});
```

---

## Files Changed

1. [frontend/src/components/TokenBalance/index.tsx](frontend/src/components/TokenBalance/index.tsx)
   - Lines 47-86: Fixed fetchBalance function

2. [frontend/src/pages/generate.tsx](frontend/src/pages/generate.tsx)
   - Lines 67-94: Fixed fetchTokenBalance function

---

## Testing

### Before Fix
```
✅ Registration succeeds (201 Created)
✅ Auto-login succeeds (200 OK)
✅ Redirect to /generate works
❌ TokenBalance: 401 Unauthorized
❌ Error dialog shown
```

### After Fix (Expected)
```
✅ Registration succeeds (201 Created)
✅ Auto-login succeeds (200 OK)
✅ Redirect to /generate works
✅ TokenBalance: 200 OK
✅ Token count displays correctly
✅ No error dialogs
```

---

## Lessons Learned

1. **Consistency**: When using Zustand persist, ALL components must read from the same localStorage structure
2. **API Client Best Practice**: Prefer using the configured API client (which has correct auth) over raw fetch calls
3. **Documentation**: Document localStorage schema when using persist middleware
4. **Code Review**: Check all locations that read from localStorage for consistency

---

## Recommended Refactoring

Instead of manually reading localStorage in multiple places, components should:

**Option A**: Use the API client
```typescript
import { tokenAPI } from '@/lib/api';

// ✅ Uses configured interceptor
const balance = await tokenAPI.getBalance();
```

**Option B**: Use Zustand hooks
```typescript
import { useUserStore } from '@/store/userStore';

// ✅ Access token from store
const { accessToken } = useUserStore();
```

---

## Status

- ✅ Bug identified
- ✅ Root cause found
- ✅ Fix implemented in 2 files
- ⏳ Pending: Fresh browser test (no cached localStorage)

---

## Related Issues

- Issue documented in [LOCAL_DEPLOYMENT_FIXES_COMPLETE.md](LOCAL_DEPLOYMENT_FIXES_COMPLETE.md)
- Original UAT testing found login redirect loop (separate issue, also fixed)
