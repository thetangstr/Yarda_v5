# Quick Start Guide: Data Model Implementation

**Feature**: 001-data-model | **Time to Complete**: ~2 hours

## Prerequisites

- Node.js 18+ and npm installed
- Python 3.11+ installed
- Supabase account created
- Git repository cloned locally

## Step 1: Set Up Supabase Project (15 min)

1. **Create new Supabase project**:
   ```bash
   # Visit https://app.supabase.com
   # Click "New Project"
   # Name: yarda-landscape
   # Database Password: [save this securely]
   # Region: Choose closest to your users
   ```

2. **Get connection details**:
   ```bash
   # Project Settings → Database
   # Copy the connection string (URI)
   # Save as SUPABASE_DB_URL in .env.local

   # Project Settings → API
   # Copy the anon public key
   # Save as NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local

   # Copy the service role key (keep secret!)
   # Save as SUPABASE_SERVICE_ROLE_KEY in .env.local
   ```

3. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref [your-project-ref]
   ```

## Step 2: Create Database Schema (20 min)

1. **Create migration files**:
   ```bash
   # From repository root
   mkdir -p supabase/migrations
   cd supabase/migrations
   ```

2. **Run migrations in order**:
   ```bash
   # Copy the SQL from data-model.md into these files:
   touch 001_create_users_table.sql
   touch 002_create_token_accounts.sql
   touch 003_create_generations.sql
   touch 004_create_rate_limits.sql
   touch 005_create_functions.sql
   touch 006_create_rls_policies.sql

   # Apply migrations
   supabase db push
   ```

3. **Verify schema**:
   ```bash
   # Open Supabase dashboard
   # Navigate to Table Editor
   # Verify all 4 tables exist with correct columns
   ```

## Step 3: Set Up TypeScript Types (10 min)

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install @supabase/supabase-js
   npm install --save-dev @types/node
   ```

2. **Copy type definitions**:
   ```bash
   # Copy contracts/types.ts to frontend/src/types/index.ts
   cp ../specs/001-data-model/contracts/types.ts src/types/index.ts
   ```

3. **Generate Supabase types**:
   ```bash
   npx supabase gen types typescript --local > src/types/database.ts
   ```

## Step 4: Configure Supabase Client (15 min)

1. **Create Supabase client**:
   ```typescript
   // frontend/src/lib/supabase.ts
   import { createClient } from '@supabase/supabase-js'
   import type { Database } from '@/types/database'

   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
   const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

   export const supabase = createClient<Database>(
     supabaseUrl,
     supabaseAnonKey,
     {
       auth: {
         persistSession: true,
         autoRefreshToken: true,
       }
     }
   )
   ```

2. **Update environment variables**:
   ```bash
   # frontend/.env.local
   NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
   ```

## Step 5: Implement Core Services (30 min)

1. **Credit Service**:
   ```typescript
   // frontend/src/services/creditService.ts
   import { supabase } from '@/lib/supabase'

   export const creditService = {
     async getBalance(userId: string) {
       const { data, error } = await supabase
         .rpc('get_credit_balance', { p_user_id: userId })

       if (error) throw error
       return data
     },

     async consumeCredit(userId: string) {
       const { data, error } = await supabase
         .rpc('consume_credit', { p_user_id: userId })

       if (error) throw error
       return data // Returns 'trial' or 'token'
     }
   }
   ```

2. **Rate Limit Service**:
   ```typescript
   // frontend/src/services/rateLimitService.ts
   export const rateLimitService = {
     async checkLimit(userId: string) {
       const { data, error } = await supabase
         .rpc('check_rate_limit', { p_user_id: userId })

       if (error) throw error
       return data // Returns boolean
     }
   }
   ```

3. **Generation Service**:
   ```typescript
   // frontend/src/services/generationService.ts
   export const generationService = {
     async createGeneration(request: CreateGenerationRequest) {
       // Check rate limit
       const canProceed = await rateLimitService.checkLimit(userId)
       if (!canProceed) {
         throw new Error('Rate limit exceeded')
       }

       // Consume credit
       const creditType = await creditService.consumeCredit(userId)

       // Create generation record
       const { data, error } = await supabase
         .from('generations')
         .insert({
           ...request,
           status: 'pending',
           credit_type: creditType
         })
         .select()
         .single()

       if (error) throw error
       return data
     }
   }
   ```

## Step 6: Create UI Components (20 min)

1. **Credit Display Component**:
   ```tsx
   // frontend/src/components/CreditDisplay/index.tsx
   export function CreditDisplay({ credits }: { credits: CreditBalance }) {
     return (
       <div className="flex gap-4">
         <div>Trial Credits: {credits.trial_credits}</div>
         <div>Tokens: {credits.token_balance}</div>
         <div>Total: {credits.total_available}</div>
       </div>
     )
   }
   ```

2. **Generation History Component**:
   ```tsx
   // frontend/src/components/GenerationHistory/index.tsx
   export function GenerationHistory({ generations }: { generations: Generation[] }) {
     return (
       <div className="grid gap-4">
         {generations.map(gen => (
           <GenerationCard key={gen.id} generation={gen} />
         ))}
       </div>
     )
   }
   ```

## Step 7: Write E2E Tests (20 min)

1. **Credit Consumption Test**:
   ```typescript
   // frontend/tests/e2e/credit-consumption.spec.ts
   import { test, expect } from '@playwright/test'

   test('consumes trial credit on generation', async ({ page }) => {
     // Register new user (gets 3 trial credits)
     await page.goto('/register')
     await page.fill('[name=email]', 'test@example.com')
     await page.fill('[name=password]', 'password123')
     await page.click('button[type=submit]')

     // Check initial credits
     await expect(page.locator('[data-testid=trial-credits]')).toHaveText('3')

     // Create generation
     await page.click('[data-testid=generate-button]')

     // Check credit consumed
     await expect(page.locator('[data-testid=trial-credits]')).toHaveText('2')
   })
   ```

2. **Rate Limiting Test**:
   ```typescript
   // frontend/tests/e2e/rate-limiting.spec.ts
   test('enforces rate limit after 3 attempts', async ({ page }) => {
     // Make 3 rapid requests
     for (let i = 0; i < 3; i++) {
       await page.click('[data-testid=generate-button]')
       await page.waitForTimeout(100)
     }

     // 4th request should be blocked
     await page.click('[data-testid=generate-button]')
     await expect(page.locator('[data-testid=rate-limit-error]')).toBeVisible()
   })
   ```

## Step 8: Run and Verify (10 min)

1. **Start development servers**:
   ```bash
   # Terminal 1 - Frontend
   cd frontend
   npm run dev

   # Terminal 2 - Backend
   cd backend
   python main.py
   ```

2. **Run tests**:
   ```bash
   # Run E2E tests
   cd frontend
   npm run test:e2e

   # Run integration tests
   cd backend
   pytest tests/integration/
   ```

3. **Verify in Supabase Dashboard**:
   - Check Table Editor for data
   - Review Auth → Users for registrations
   - Monitor Database → Query Performance

## Common Issues & Solutions

### Issue: RLS policies blocking access
**Solution**: Ensure user is authenticated and policies are correctly configured
```sql
-- Check current user
SELECT auth.uid();

-- Test policy
SELECT * FROM users WHERE auth.uid() = id;
```

### Issue: Rate limit not working
**Solution**: Verify cleanup function is scheduled
```sql
-- Create scheduled job (cron)
SELECT cron.schedule(
  'cleanup-rate-limits',
  '*/2 * * * *', -- Every 2 minutes
  'SELECT cleanup_old_rate_limits();'
);
```

### Issue: Credits going negative
**Solution**: Check constraints are in place
```sql
ALTER TABLE users
ADD CONSTRAINT check_trial_credits CHECK (trial_credits >= 0);
```

## Next Steps

1. **Add monitoring**:
   - Set up Supabase alerts for errors
   - Monitor credit consumption rates
   - Track generation success/failure rates

2. **Optimize performance**:
   - Add connection pooling
   - Implement caching for history
   - Use database indexes effectively

3. **Enhance security**:
   - Enable 2FA for admin accounts
   - Add rate limiting at API gateway
   - Implement audit logging

## Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL RLS Guide](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- Project Slack: #yarda-dev-help

## Checklist

- [ ] Supabase project created
- [ ] Database schema migrated
- [ ] TypeScript types configured
- [ ] Services implemented
- [ ] UI components created
- [ ] E2E tests passing
- [ ] Integration tests passing
- [ ] RLS policies verified
- [ ] Rate limiting tested
- [ ] Credit consumption working

Once all items are checked, the data model implementation is complete! 🎉