# Research: Data Model for Landscape Design Platform

**Feature**: 001-data-model | **Date**: 2025-10-28

## Executive Summary

Research findings for implementing a PostgreSQL data model using Supabase for user registration, trial credit tracking, design generation history, and rate limiting. All technical decisions align with the project's existing stack and constitution principles.

## Technology Decisions

### 1. Database Choice: PostgreSQL via Supabase

**Decision**: PostgreSQL hosted on Supabase

**Rationale**:
- Native support for ACID transactions (critical for credit atomicity)
- Row Level Security (RLS) for data isolation
- Built-in auth integration with Supabase Auth
- Real-time subscriptions for credit updates
- Automatic API generation via PostgREST

**Alternatives considered**:
- Firebase Firestore: Rejected due to weaker transaction guarantees
- Raw PostgreSQL: Rejected due to additional auth/API overhead
- DynamoDB: Rejected due to complexity for relational data

### 2. Rate Limiting Implementation: Database-based with TTL

**Decision**: PostgreSQL table with timestamp-based rolling window

**Rationale**:
- Centralized rate limiting across all instances
- Atomic operations prevent race conditions
- Built-in cleanup via timestamp comparison
- No additional infrastructure (Redis) required

**Alternatives considered**:
- Redis: Rejected to minimize infrastructure dependencies
- In-memory: Rejected due to lack of persistence and multi-instance issues
- API Gateway rate limiting: Rejected for lack of user-specific control

### 3. Credit Management: Transactional with Optimistic Locking

**Decision**: Database transactions with row-level locks

**Rationale**:
- Guarantees atomic credit consumption
- Prevents double-spending in concurrent scenarios
- Automatic rollback on failures
- Clear audit trail in transaction logs

**Alternatives considered**:
- Event sourcing: Rejected as over-engineered for this scale
- Distributed locks: Rejected due to unnecessary complexity
- Application-level locking: Rejected due to reliability concerns

### 4. Data Isolation: Row Level Security (RLS) Policies

**Decision**: Supabase RLS policies on all tables

**Rationale**:
- Database-enforced security (not application-dependent)
- Automatic filtering based on auth.uid()
- Zero trust model - even compromised API can't breach isolation
- Native Supabase integration

**Alternatives considered**:
- Application-level filtering: Rejected as less secure
- Separate databases per user: Rejected as unscalable
- Middleware filtering: Rejected as additional failure point

## Best Practices Implementation

### 1. Migration Strategy

**Pattern**: Sequential numbered migrations with rollback support

```sql
-- Forward migration
CREATE TABLE IF NOT EXISTS ...
-- Rollback comment
-- DROP TABLE IF EXISTS ...
```

**Benefits**:
- Version control friendly
- Reproducible deployments
- Easy rollback capability
- CI/CD integration

### 2. Index Optimization

**Critical Indexes**:
- `users.email` - Unique index for login
- `generations.user_id, created_at DESC` - History queries
- `rate_limits.user_id, attempted_at` - Rate limit checks
- `token_accounts.user_id` - Foreign key lookups

**Benefits**:
- Sub-100ms query performance
- Efficient pagination
- Reduced database load

### 3. Data Integrity Constraints

**Constraints**:
- Check constraints: `trial_credits >= 0`, `token_balance >= 0`
- Foreign keys: All relations with CASCADE/RESTRICT appropriately
- Unique constraints: Email, user_id per token_account
- Not null: Critical fields like user_id, created_at

**Benefits**:
- Database-enforced data integrity
- Prevents invalid states
- Clear error messages
- Simplified application logic

### 4. Audit Trail Design

**Pattern**: Immutable generation records with status tracking

```sql
-- Never UPDATE generation records, only INSERT
status: 'pending' -> 'processing' -> 'completed'|'failed'
```

**Benefits**:
- Complete history preservation
- Debugging capability
- Compliance readiness
- Analytics foundation

## Performance Considerations

### 1. Connection Pooling

**Configuration**:
- Supabase default: 60 connections
- Backend pool size: 20 connections
- Connection timeout: 10 seconds
- Idle timeout: 10 minutes

### 2. Query Optimization

**Strategies**:
- Prepared statements for repeated queries
- Batch operations where possible
- Pagination with cursor-based approach
- Selective column fetching

### 3. Caching Strategy

**Approach**:
- Frontend: React Query with 5-minute stale time
- Backend: No caching initially (add if needed)
- Generation history: Infinite cache (immutable)

## Security Recommendations

### 1. SQL Injection Prevention

**Measures**:
- Parameterized queries only
- Input validation at API layer
- TypeScript types for all inputs
- Supabase client sanitization

### 2. Rate Limit Bypass Prevention

**Measures**:
- Database-enforced limits
- Server-side timestamp validation
- No client-side rate limit state
- Automatic cleanup of old records

### 3. Credit Manipulation Prevention

**Measures**:
- Database constraints
- Transaction isolation
- Audit logging
- RLS policies preventing direct updates

## Testing Strategy

### 1. Unit Tests

**Focus**:
- Model validation logic
- Service business rules
- Utility functions

### 2. Integration Tests

**Focus**:
- Database transactions
- Credit consumption flows
- Rate limiting enforcement
- RLS policy validation

### 3. E2E Tests

**Focus**:
- Complete user journeys
- Concurrent operations
- Error scenarios
- Performance benchmarks

## Migration Path

### Phase 1: Schema Creation
1. Create users table with trial_credits
2. Create token_accounts table
3. Create generations table
4. Create rate_limits table
5. Apply RLS policies

### Phase 2: API Integration
1. Implement auth endpoints
2. Add credit management
3. Build generation tracking
4. Enable rate limiting

### Phase 3: Frontend Integration
1. Update types/index.ts
2. Implement API client
3. Create UI components
4. Add E2E tests

## Risk Mitigation

### Risk 1: Database Migration Failures
**Mitigation**: Test migrations in staging, maintain rollback scripts

### Risk 2: Race Conditions in Credit Consumption
**Mitigation**: Use database transactions with appropriate isolation levels

### Risk 3: Rate Limit Table Growth
**Mitigation**: Automated cleanup job for records older than 2 minutes

### Risk 4: RLS Policy Bugs
**Mitigation**: Comprehensive integration tests, staged rollout

## Recommendations

1. **Start with migrations**: Create and test database schema first
2. **Implement RLS early**: Security from day one
3. **Test concurrency**: Use Playwright for parallel request testing
4. **Monitor performance**: Set up query performance tracking
5. **Document RLS policies**: Clear comments in migration files

## Conclusion

All technical decisions have been researched and validated against the project constitution and requirements. The chosen approaches prioritize security, performance, and maintainability while avoiding unnecessary complexity. The PostgreSQL/Supabase stack provides all required capabilities without additional infrastructure dependencies.