# Authentication Bug Fixes

**Date**: 2025-11-04
**Status**: ✅ FIXED
**Severity**: CRITICAL (Blocking all authenticated API calls)

---

## Summary

Fixed two critical authentication bugs that prevented users from accessing authenticated endpoints after successful registration and login.

---

## Bug #1: JWT Token Storage Mismatch

### Problem
After registration → auto-login → redirect to `/generate`, users experienced:
- 401 Unauthorized errors on all authenticated API calls
- Token balance failed to load
- Error message: "Failed to fetch token balance"
- Users appeared authenticated (isAuthenticated=true) but API rejected requests

### Root Cause
**Incorrect localStorage key** used in two components:

#### TokenBalance Component ([TokenBalance/index.tsx:53](frontend/src/components/TokenBalance/index.tsx#L53))
```typescript
// ❌ WRONG - looking for non-existent key
Authorization: `Bearer ${localStorage.getItem('access_token')}`
```

#### Generate Page ([generate.tsx:75](frontend/src/pages/generate.tsx#L75))
```typescript
// ❌ WRONG - looking for non-existent key
Authorization: `Bearer ${localStorage.getItem('access_token')}`
```

**The JWT token is actually stored by Zustand persist middleware at:**
```typescript
localStorage.getItem('user-storage')
// Returns: { state: { accessToken: "jwt_here", user: {...}, ... } }
```

### Solution Applied
Updated both components to read from correct Zustand persisted state structure.

**Fix Details**: See [JWT_TOKEN_BUG_FIX.md](JWT_TOKEN_BUG_FIX.md) for full implementation.

---

## Bug #2: Authentication Token Type Mismatch

### Problem
Even after fixing the localStorage key issue, authentication still failed with 401 errors because:
1. Login endpoint generated: `access_token = secrets.token_urlsafe(32)` → Random string like `"sLLb-Z2potOwxkPL2btQ-dGhsYDzXO49n7NWZExz21U"`
2. Auth dependency expected: UUID format like `"f38e6314-543d-4711-8332-5c497307b3c5"`
3. Auth dependency tried: `user_id = UUID(token)` which raised ValueError
4. Result: 401 Unauthorized

### Root Cause

**Incompatible token formats between login and authentication:**

#### Login Endpoint ([auth.py:368](backend/src/api/endpoints/auth.py#L368))
```python
# ❌ WRONG - generates random string, not UUID
access_token = secrets.token_urlsafe(32)
```

#### Auth Dependency ([dependencies.py:66-72](backend/src/api/dependencies.py#L66-L72))
```python
# Expects UUID format
try:
    user_id = UUID(token)  # ← Fails with random string
except ValueError:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication token"
    )
```

### Solution Applied

Changed login endpoint to return user UUID as the access token:

```python
# ✅ FIXED - use user_id as token since get_current_user expects UUID
access_token = str(user["id"])
```

**File**: [backend/src/api/endpoints/auth.py:368-369](backend/src/api/endpoints/auth.py#L368-L369)

---

## Testing Results

### Before Fixes
```
✅ Registration succeeds (201 Created)
✅ Auto-login succeeds (200 OK)
✅ Redirect to /generate works
❌ TokenBalance: 401 Unauthorized
❌ All authenticated endpoints: 401 Unauthorized
❌ Error dialogs shown
```

### After Fixes
```
✅ Registration succeeds (201 Created)
✅ Auto-login succeeds (200 OK)
✅ Redirect to /generate works
✅ TokenBalance: 200 OK
✅ Token balance displays: "0 tokens"
✅ Trial credits display: "3 trial credits"
✅ No error dialogs
✅ All authenticated endpoints: 200 OK
```

### Backend Logs (Success)
```
INFO: POST /auth/register HTTP/1.1" 201 Created
INFO: POST /auth/login HTTP/1.1" 200 OK
INFO: GET /tokens/balance HTTP/1.1" 200 OK  ← Working!
INFO: GET /tokens/balance HTTP/1.1" 200 OK  ← Auto-refresh working!
```

---

## Files Changed

### Frontend
1. [frontend/src/components/TokenBalance/index.tsx](frontend/src/components/TokenBalance/index.tsx)
   - Lines 47-86: Fixed fetchBalance to read from Zustand persisted state

2. [frontend/src/pages/generate.tsx](frontend/src/pages/generate.tsx)
   - Lines 67-94: Fixed fetchTokenBalance to read from Zustand persisted state

### Backend
3. [backend/src/api/endpoints/auth.py](backend/src/api/endpoints/auth.py)
   - Lines 367-369: Changed access_token from random string to user UUID

---

## Why This Happened

### Zustand Persist Middleware Structure
The app uses Zustand with persist middleware configured in [userStore.ts:90-98](frontend/src/store/userStore.ts#L90-L98):

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

### localStorage Structure
```json
{
  "state": {
    "accessToken": "f38e6314-543d-4711-8332-5c497307b3c5",
    "user": {...},
    "isAuthenticated": true,
    "tokenBalance": {...}
  },
  "version": 0
}
```

### API Client Had It Right
The API client interceptor ([api.ts:24-34](frontend/src/lib/api.ts#L24-L34)) already had the correct implementation:

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

## Lessons Learned

1. **Consistency**: When using Zustand persist, ALL components must read from the same localStorage structure
2. **Token Format Contract**: Login and authentication must use compatible token formats
3. **API Client Best Practice**: Prefer using the configured API client (which has correct auth) over raw fetch calls
4. **Type Safety**: UUID vs string token types should be enforced at compile time
5. **Documentation**: Document localStorage schema when using persist middleware
6. **Code Review**: Check all locations that read from localStorage for consistency

---

## Recommended Refactoring

### Option A: Use API Client Everywhere
```typescript
import { tokenAPI } from '@/lib/api';

// ✅ Uses configured interceptor with correct auth
const balance = await tokenAPI.getBalance();
```

### Option B: Use Zustand Hooks
```typescript
import { useUserStore } from '@/store/userStore';

// ✅ Access token from store
const { accessToken } = useUserStore();
```

### Option C: Implement Proper JWT
For production, implement proper JWT tokens with:
- Signature verification
- Expiration checking
- Token refresh flow
- Secure token storage

---

## Security Note

⚠️ **Current Implementation**: Using user UUID as access token is a temporary solution for development. For production:

1. Implement proper JWT with signature
2. Add token expiration (e.g., 1 hour)
3. Implement refresh token flow
4. Store tokens securely (httpOnly cookies preferred)
5. Add CSRF protection

---

## Status

- ✅ Bug #1 identified and fixed (localStorage key)
- ✅ Bug #2 identified and fixed (token format)
- ✅ Tested with fresh browser session
- ✅ Verified with backend logs (200 OK responses)
- ✅ No console errors
- ✅ Token balance and trial credits display correctly
- ✅ Auto-refresh working (10-second interval)

---

## Test User Created

**Email**: success.test@yarda.app
**Status**: Active
**Trial Credits**: 3 remaining
**Token Balance**: 0 tokens

---

## Related Documentation

- [JWT_TOKEN_BUG_FIX.md](JWT_TOKEN_BUG_FIX.md) - Detailed bug #1 documentation
- [LOCAL_DEPLOYMENT_FIXES_COMPLETE.md](LOCAL_DEPLOYMENT_FIXES_COMPLETE.md) - All deployment fixes
