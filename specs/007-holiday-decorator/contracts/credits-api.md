# API Contract: Holiday Credits Management

**Service**: Holiday Decorator - Credits Management
**Base Path**: `/v1/holiday/credits`
**Authentication**: Required (Bearer token from Supabase Auth)

---

## GET /v1/holiday/credits

Get user's current holiday credit balance.

### Request

**Headers**:
```
Authorization: Bearer <supabase-access-token>
```

### Response

**Success (200 OK)**:
```typescript
interface HolidayCreditsResponse {
  holiday_credits: number;       // Current balance
  holiday_credits_earned: number;  // Total earned (lifetime)
  can_generate: boolean;         // true if credits > 0
  earnings_breakdown: {
    signup_bonus: number;        // 1 (or 0 if not during holiday season)
    social_shares: number;       // Credits earned from shares
    other: number;               // Future: referrals, promotions, etc.
  };
}
```

**Example**:
```json
{
  "holiday_credits": 2,
  "holiday_credits_earned": 4,
  "can_generate": true,
  "earnings_breakdown": {
    "signup_bonus": 1,
    "social_shares": 3,
    "other": 0
  }
}
```

**Error Responses**:

**401 Unauthorized** - No auth token:
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

---

## GET /v1/holiday/credits/history

Get user's holiday credit transaction history (paginated).

### Request

**Headers**:
```
Authorization: Bearer <supabase-access-token>
```

**Query Parameters**:
- `limit` (number, optional): Number of results (default: 10, max: 50)
- `offset` (number, optional): Pagination offset (default: 0)

### Response

**Success (200 OK)**:
```typescript
interface CreditHistoryResponse {
  transactions: Array<{
    id: string;
    type: 'earned' | 'spent' | 'refunded';
    amount: number;              // Positive for earned, negative for spent
    reason: string;              // Human-readable description
    related_id: string | null;   // Generation ID or share ID
    balance_after: number;       // Balance after this transaction
    created_at: string;
  }>;
  total: number;
  limit: number;
  offset: number;
}
```

**Example**:
```json
{
  "transactions": [
    {
      "id": "txn-uuid-1",
      "type": "earned",
      "amount": 1,
      "reason": "Shared on Instagram",
      "related_id": "share-uuid-789",
      "balance_after": 2,
      "created_at": "2024-12-20T11:00:00Z"
    },
    {
      "id": "txn-uuid-2",
      "type": "spent",
      "amount": -1,
      "reason": "Generated holiday decoration (Classic style)",
      "related_id": "gen-uuid-123",
      "balance_after": 1,
      "created_at": "2024-12-20T10:30:00Z"
    },
    {
      "id": "txn-uuid-3",
      "type": "earned",
      "amount": 1,
      "reason": "Signup bonus (Holiday Season 2024)",
      "related_id": null,
      "balance_after": 2,
      "created_at": "2024-12-20T10:00:00Z"
    }
  ],
  "total": 3,
  "limit": 10,
  "offset": 0
}
```

---

## POST /v1/holiday/credits/grant (Admin Only)

Grant holiday credits to a user (admin endpoint for promotions, support, etc.).

### Request

**Headers**:
```
Authorization: Bearer <admin-access-token>
Content-Type: application/json
```

**Body**:
```typescript
interface GrantCreditsRequest {
  user_id: string;               // User UUID
  amount: number;                // Credits to grant (must be > 0)
  reason: string;                // Reason for granting (e.g., "Compensation", "Promotion")
}
```

**Example**:
```json
{
  "user_id": "user-uuid-456",
  "amount": 3,
  "reason": "Holiday promotion - 3 free credits"
}
```

### Response

**Success (200 OK)**:
```typescript
interface GrantCreditsResponse {
  success: boolean;
  user_id: string;
  amount_granted: number;
  new_balance: number;
  reason: string;
  granted_at: string;
}
```

**Example**:
```json
{
  "success": true,
  "user_id": "user-uuid-456",
  "amount_granted": 3,
  "new_balance": 5,
  "reason": "Holiday promotion - 3 free credits",
  "granted_at": "2024-12-20T12:00:00Z"
}
```

**Error Responses**:

**403 Forbidden** - Not admin:
```json
{
  "error": "FORBIDDEN",
  "message": "Admin access required"
}
```

**400 Bad Request** - Invalid amount:
```json
{
  "error": "INVALID_AMOUNT",
  "message": "Amount must be greater than 0"
}
```

---

## Backend Implementation Notes

### Endpoint: GET /v1/holiday/credits

**Processing Flow**:
1. Validate user authentication
2. Fetch user's `holiday_credits` and `holiday_credits_earned` from database
3. Calculate earnings breakdown:
   - Signup bonus: 1 if user created during holiday season, else 0
   - Social shares: Count of `social_shares` where `credit_granted = true`
   - Other: Total - (signup_bonus + social_shares)
4. Return credit balance and breakdown

**Service Implementation**:
```python
# backend/src/services/holiday_credit_service.py

class HolidayCreditService:
    def __init__(self, db_pool):
        self.db_pool = db_pool

    async def get_balance(self, user_id: UUID) -> Dict[str, Any]:
        """Get user's holiday credit balance with earnings breakdown."""
        # Fetch user credits
        user = await self.db_pool.fetchrow(
            """
            SELECT holiday_credits, holiday_credits_earned
            FROM users
            WHERE id = $1
            """,
            user_id
        )

        if not user:
            raise UserNotFoundError()

        # Count social share credits
        share_credits = await self.db_pool.fetchval(
            """
            SELECT COUNT(*)
            FROM social_shares
            WHERE user_id = $1 AND credit_granted = TRUE
            """,
            user_id
        )

        # Signup bonus (1 if created during holiday season)
        signup_bonus = 1 if user["holiday_credits_earned"] > 0 else 0

        # Other (e.g., admin grants, future features)
        other_credits = user["holiday_credits_earned"] - signup_bonus - share_credits

        return {
            "holiday_credits": user["holiday_credits"],
            "holiday_credits_earned": user["holiday_credits_earned"],
            "can_generate": user["holiday_credits"] > 0,
            "earnings_breakdown": {
                "signup_bonus": signup_bonus,
                "social_shares": share_credits,
                "other": max(0, other_credits)
            }
        }
```

### Endpoint: GET /v1/holiday/credits/history

**Implementation Note**: This requires a new `holiday_credit_transactions` table to track history.

**Option 1: Add Transaction Logging Table** (RECOMMENDED):
```sql
CREATE TABLE holiday_credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('earned', 'spent', 'refunded')),
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    related_id UUID,  -- Generation ID or share ID
    balance_after INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_holiday_credit_transactions_user_id ON holiday_credit_transactions(user_id, created_at DESC);
```

**Update Functions to Log Transactions**:
```sql
-- Modified deduct_holiday_credit function
CREATE OR REPLACE FUNCTION deduct_holiday_credit(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, credits_remaining INTEGER) AS $$
DECLARE
    v_credits INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Lock and check
    SELECT holiday_credits INTO v_credits
    FROM users WHERE id = p_user_id FOR UPDATE NOWAIT;

    IF v_credits < 1 THEN
        RETURN QUERY SELECT FALSE, v_credits::INTEGER;
        RETURN;
    END IF;

    -- Deduct
    UPDATE users SET holiday_credits = holiday_credits - 1, updated_at = NOW()
    WHERE id = p_user_id
    RETURNING holiday_credits INTO v_new_balance;

    -- Log transaction
    INSERT INTO holiday_credit_transactions (user_id, type, amount, reason, balance_after)
    VALUES (p_user_id, 'spent', -1, 'Generated holiday decoration', v_new_balance);

    RETURN QUERY SELECT TRUE, v_new_balance::INTEGER;
END;
$$ LANGUAGE plpgsql;
```

**Option 2: Reconstruct History from Existing Tables** (simpler, no new table):
```python
async def get_credit_history(user_id: UUID, limit: int, offset: int) -> List[Dict]:
    """
    Reconstruct credit history from existing tables:
    - Signup bonus from user creation date
    - Spent credits from holiday_generations
    - Earned credits from social_shares
    """
    transactions = []

    # Fetch generations (spent)
    generations = await self.db_pool.fetch(
        """
        SELECT id, style, created_at
        FROM holiday_generations
        WHERE user_id = $1 AND credit_deducted = TRUE
        ORDER BY created_at DESC
        """,
        user_id
    )

    for gen in generations:
        transactions.append({
            "type": "spent",
            "amount": -1,
            "reason": f"Generated holiday decoration ({gen['style']} style)",
            "related_id": gen["id"],
            "created_at": gen["created_at"]
        })

    # Fetch social shares (earned)
    shares = await self.db_pool.fetch(
        """
        SELECT id, platform, credit_granted_at
        FROM social_shares
        WHERE user_id = $1 AND credit_granted = TRUE
        ORDER BY credit_granted_at DESC
        """,
        user_id
    )

    for share in shares:
        transactions.append({
            "type": "earned",
            "amount": 1,
            "reason": f"Shared on {share['platform'].capitalize()}",
            "related_id": share["id"],
            "created_at": share["credit_granted_at"]
        })

    # Sort by created_at DESC
    transactions.sort(key=lambda x: x["created_at"], reverse=True)

    # Paginate
    return transactions[offset:offset + limit]
```

**Recommendation**: Use **Option 2** for MVP (simpler, no schema changes). Add transaction table in v2 if more detailed auditing is needed.

### Endpoint: POST /v1/holiday/credits/grant (Admin)

**Processing Flow**:
1. **Validate admin permissions** (check if user has `admin` role)
2. Validate request (amount > 0, user exists)
3. Call `grant_holiday_credit(user_id, amount)` function
4. Log transaction (if using transaction table)
5. Return new balance

**Admin Authorization**:
```python
# Middleware to check admin role
async def require_admin(request: Request, user_id: UUID = Depends(get_current_user)):
    user = await db.fetchrow("SELECT role FROM users WHERE id = $1", user_id)

    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return user_id


# Admin endpoint
@router.post("/v1/holiday/credits/grant")
async def grant_credits(
    request: GrantCreditsRequest,
    admin_id: UUID = Depends(require_admin)
):
    # Grant credits
    new_balance = await credit_service.grant_credit(
        user_id=request.user_id,
        amount=request.amount,
        reason=request.reason
    )

    return {
        "success": True,
        "user_id": request.user_id,
        "amount_granted": request.amount,
        "new_balance": new_balance,
        "reason": request.reason,
        "granted_at": datetime.now(timezone.utc).isoformat()
    }
```

---

## Frontend Implementation Notes

### Credits Display Component

```typescript
// src/components/HolidayCreditsDisplay.tsx

interface HolidayCreditsDisplayProps {
  showBreakdown?: boolean;       // Show earnings breakdown
}

function HolidayCreditsDisplay({ showBreakdown = false }: HolidayCreditsDisplayProps) {
  const [credits, setCredits] = useState<HolidayCreditsResponse | null>(null);

  useEffect(() => {
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    const data = await api.get('/v1/holiday/credits');
    setCredits(data);
  };

  if (!credits) return <Loading />;

  return (
    <div className="credits-display">
      <h3>Holiday Credits: {credits.holiday_credits}</h3>

      {!credits.can_generate && (
        <p className="warning">
          You need 1 Holiday Credit to generate.
          <a href="#share">Share your design</a> to earn more!
        </p>
      )}

      {showBreakdown && (
        <div className="breakdown">
          <h4>Earnings Breakdown:</h4>
          <ul>
            <li>Signup Bonus: {credits.earnings_breakdown.signup_bonus}</li>
            <li>Social Shares: {credits.earnings_breakdown.social_shares}</li>
            {credits.earnings_breakdown.other > 0 && (
              <li>Other: {credits.earnings_breakdown.other}</li>
            )}
          </ul>
          <p>Total Earned: {credits.holiday_credits_earned}</p>
        </div>
      )}
    </div>
  );
}
```

### Credits History Modal

```typescript
// src/components/HolidayCreditsHistory.tsx

function HolidayCreditsHistory() {
  const [history, setHistory] = useState<CreditHistoryResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchHistory = async () => {
    const data = await api.get('/v1/holiday/credits/history?limit=20');
    setHistory(data);
  };

  const openModal = () => {
    fetchHistory();
    setModalOpen(true);
  };

  return (
    <>
      <button onClick={openModal} className="link-button">
        View Credit History
      </button>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <h2>Holiday Credit History</h2>

        {history && (
          <table className="credit-history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Reason</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {history.transactions.map((txn) => (
                <tr key={txn.id}>
                  <td>{new Date(txn.created_at).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${txn.type}`}>
                      {txn.type === 'earned' && '+ '}
                      {txn.type === 'spent' && '- '}
                      {txn.type === 'refunded' && '↩️ '}
                      {txn.type}
                    </span>
                  </td>
                  <td className={txn.amount > 0 ? 'positive' : 'negative'}>
                    {txn.amount > 0 ? '+' : ''}{txn.amount}
                  </td>
                  <td>{txn.reason}</td>
                  <td>{txn.balance_after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </>
  );
}
```

---

## Testing

### Unit Tests (Backend - pytest)

```python
# tests/unit/test_holiday_credit_service.py

async def test_get_balance_with_breakdown(test_pool):
    """Test getting credit balance with earnings breakdown."""
    service = HolidayCreditService(test_pool)

    # Setup: User has earned credits from signup and shares
    await test_pool.execute(
        "UPDATE users SET holiday_credits = 2, holiday_credits_earned = 4 WHERE id = $1",
        user_id
    )
    await test_pool.execute(
        """
        INSERT INTO social_shares (user_id, generation_id, platform, tracking_link, credit_granted)
        VALUES ($1, $2, 'instagram', 'link1', TRUE), ($1, $2, 'facebook', 'link2', TRUE)
        """,
        user_id, generation_id
    )

    # Act
    balance = await service.get_balance(user_id)

    # Assert
    assert balance["holiday_credits"] == 2
    assert balance["holiday_credits_earned"] == 4
    assert balance["can_generate"] is True
    assert balance["earnings_breakdown"]["signup_bonus"] == 1
    assert balance["earnings_breakdown"]["social_shares"] == 2
    assert balance["earnings_breakdown"]["other"] == 1  # 4 - 1 - 2 = 1


async def test_get_credit_history(test_pool):
    """Test reconstructing credit history from existing tables."""
    service = HolidayCreditService(test_pool)

    # Setup: User has generated and shared
    gen_id = await test_pool.fetchval(
        """
        INSERT INTO holiday_generations (user_id, address, geocoded_lat, geocoded_lng, street_view_heading, style, original_image_url, status, credit_deducted)
        VALUES ($1, '123 Main St', 37.0, -122.0, 0, 'classic', 'url', 'completed', TRUE)
        RETURNING id
        """,
        user_id
    )
    await test_pool.execute(
        """
        INSERT INTO social_shares (user_id, generation_id, platform, tracking_link, credit_granted, credit_granted_at)
        VALUES ($1, $2, 'instagram', 'link1', TRUE, NOW())
        """,
        user_id, gen_id
    )

    # Act
    history = await service.get_credit_history(user_id, limit=10, offset=0)

    # Assert
    assert len(history) == 2
    assert history[0]["type"] == "earned"  # Most recent
    assert history[0]["reason"] == "Shared on Instagram"
    assert history[1]["type"] == "spent"
    assert "Generated holiday decoration" in history[1]["reason"]
```

### E2E Tests (Frontend - Playwright)

```typescript
// tests/e2e/holiday-credits.spec.ts

test('Credits display shows correct balance and breakdown', async ({ page }) => {
  // Setup: User signed up and has 1 credit
  await page.goto('/holiday');

  // Verify initial balance
  await expect(page.locator('text=Holiday Credits: 1')).toBeVisible();

  // Click "View Breakdown" (if implemented)
  await page.click('button:has-text("View Breakdown")');

  // Verify breakdown
  await expect(page.locator('text=Signup Bonus: 1')).toBeVisible();
  await expect(page.locator('text=Social Shares: 0')).toBeVisible();
  await expect(page.locator('text=Total Earned: 1')).toBeVisible();
});


test('Credits history shows transactions', async ({ page }) => {
  // Setup: User has generated and shared
  await page.goto('/holiday');

  // Click "View Credit History"
  await page.click('button:has-text("View Credit History")');

  // Verify modal appears
  await expect(page.locator('h2:has-text("Holiday Credit History")')).toBeVisible();

  // Verify transaction table
  await expect(page.locator('table.credit-history-table tbody tr')).toHaveCount(2);

  // Verify transaction details
  await expect(page.locator('text=Generated holiday decoration')).toBeVisible();
  await expect(page.locator('text=Shared on Instagram')).toBeVisible();
});
```

---

## Summary

**Key Endpoints**:
- ✅ `GET /v1/holiday/credits` - Get balance with earnings breakdown
- ✅ `GET /v1/holiday/credits/history` - Get transaction history (reconstructed from existing tables for MVP)
- ✅ `POST /v1/holiday/credits/grant` - Admin-only credit granting

**Implementation Notes**:
- Use existing atomic deduction patterns (proven to prevent negative balances)
- Reconstruct history from existing tables for MVP (no new transaction table needed initially)
- Admin endpoint requires role-based authorization
- Frontend displays credits prominently with breakdown on demand
