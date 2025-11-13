# Yarda V5 - Complete Documentation Index

Welcome! This is your guide to understanding the Yarda V5 codebase. Start here and navigate to the documentation that matches your needs.

---

## Quick Navigation

### For First-Time Readers
**Start here to understand what Yarda is and how it works.**

1. **[CODEBASE_SUMMARY.md](./CODEBASE_SUMMARY.md)** (15 min read)
   - What is Yarda V5?
   - Core features overview
   - Architecture at a glance
   - Key stats and critical paths
   - Potential bottlenecks
   - FAQ section

2. **[ARCHITECTURE_DIAGRAM.md](./ARCHITECTURE_DIAGRAM.md)** (20 min read)
   - Visual system architecture
   - High-level component diagram
   - Complete data flow walkthrough
   - Payment system hierarchy
   - Database atomicity patterns
   - Deployment topology

### For Deep Understanding
**Dive into the complete architecture and implementation details.**

3. **[CODEBASE_ARCHITECTURE_OVERVIEW.md](./CODEBASE_ARCHITECTURE_OVERVIEW.md)** (45 min read)
   - Comprehensive directory structure
   - Complete tech stack details
   - Main entry points explained
   - All key services & modules (17 backend services)
   - External service integrations (5 APIs)
   - Complete data flow architecture
   - Critical integration points & bottlenecks
   - Testing infrastructure overview
   - Deployment architecture
   - Anti-patterns to watch

### For Project Context
**Refer to these for specific information about the project.**

4. **[CLAUDE.md](./CLAUDE.md)** (Project Configuration)
   - Project overview and history
   - Technology stack details
   - Deployment configuration (IDs, URLs)
   - Architecture patterns
   - Critical business logic
   - Development commands
   - Common tasks
   - Environment variables
   - Database schema
   - Known issues & gotchas

---

## Navigation by Role

### Product Manager / Business User
**Want to understand what Yarda does?**
1. Read: CODEBASE_SUMMARY.md (entire document)
2. Skim: ARCHITECTURE_DIAGRAM.md (Overview section)
3. Check: Current Status in CODEBASE_SUMMARY.md

### Backend Developer
**Want to understand how the backend works?**
1. Start: CODEBASE_SUMMARY.md → Critical Paths section
2. Deep dive: CODEBASE_ARCHITECTURE_OVERVIEW.md → Sections 4-5 (Services & Integrations)
3. Reference: ARCHITECTURE_DIAGRAM.md → Data Flow section
4. Implementation: Specific service files in `backend/src/services/`
5. Patterns: CLAUDE.md → Architecture Patterns section

### Frontend Developer
**Want to understand how the frontend works?**
1. Start: CODEBASE_SUMMARY.md → Critical Paths → Authentication section
2. Components: CODEBASE_ARCHITECTURE_OVERVIEW.md → Section 1 (Directory Structure) → Frontend
3. State: CODEBASE_ARCHITECTURE_OVERVIEW.md → Section 4 (Frontend Services)
4. Data flow: ARCHITECTURE_DIAGRAM.md → System Architecture diagram
5. Implementation: Specific component files in `frontend/src/`

### DevOps / Infrastructure
**Want to understand deployment and infrastructure?**
1. Start: CODEBASE_SUMMARY.md → Current Status
2. Deployment: CODEBASE_ARCHITECTURE_OVERVIEW.md → Section 9 (Deployment Architecture)
3. Infrastructure: ARCHITECTURE_DIAGRAM.md → Deployment Topology
4. Configuration: CLAUDE.md → Deployment Configuration section
5. Dashboards: Vercel, Railway, Supabase (via CLAUDE.md)

### QA / Test Engineer
**Want to understand how testing works?**
1. Start: CLAUDE.md → Testing Strategy section
2. Tests: CODEBASE_ARCHITECTURE_OVERVIEW.md → Section 8 (Testing Infrastructure)
3. CUJs: CLAUDE.md → Critical User Journeys Checklist
4. E2E: `frontend/tests/e2e/` directory
5. Backend: `backend/tests/` directory

### New Team Member
**Want a comprehensive onboarding?**
1. Day 1: Read CODEBASE_SUMMARY.md (entire)
2. Day 1: Read ARCHITECTURE_DIAGRAM.md (entire)
3. Day 2: Read CODEBASE_ARCHITECTURE_OVERVIEW.md (focus on your role)
4. Day 2: Set up local development (CLAUDE.md → Development Setup)
5. Day 3: Run tests to ensure everything works
6. Week 1: Pick a small task, trace through the code
7. Week 2+: Reference CLAUDE.md for patterns and practices

---

## Navigation by Topic

### Understanding Payment Systems
**How users pay for generations:**

Files to read:
- CODEBASE_SUMMARY.md → Critical Paths #1 → Payment Flow
- CODEBASE_ARCHITECTURE_OVERVIEW.md → Section 4 → TrialService, TokenService, SubscriptionService
- ARCHITECTURE_DIAGRAM.md → Payment System Hierarchy
- `backend/src/services/trial_service.py`
- `backend/src/services/token_service.py`
- `backend/src/services/subscription_service.py`

Key concepts:
- Subscription > Trial > Token (priority order)
- FOR UPDATE NOWAIT for atomicity
- Refund on failure
- Webhook processing for token addition

### Understanding Image Generation
**How Yarda generates landscape designs:**

Files to read:
- CODEBASE_SUMMARY.md → Critical Paths #2 → Image Generation Workflow
- ARCHITECTURE_DIAGRAM.md → Data Flow section
- CODEBASE_ARCHITECTURE_OVERVIEW.md → Section 4 → GenerationService, GeminiClient, MapsService
- `backend/src/services/generation_service.py`
- `backend/src/services/gemini_client.py`
- `backend/src/services/maps_service.py`
- `backend/src/services/prompt_builder.py`

Key concepts:
- Perspective-based prompt engineering
- Google Maps API (geocoding, street view, satellite)
- Gemini 2.5 Flash image generation
- Multi-area coordination
- Vercel Blob storage

### Understanding Authentication
**How users log in and stay logged in:**

Files to read:
- CODEBASE_SUMMARY.md → Critical Paths #4 → Authentication
- CODEBASE_ARCHITECTURE_OVERVIEW.md → Section 4 (Frontend) → API Client, UserStore
- `frontend/src/pages/auth/callback.tsx`
- `frontend/src/store/userStore.ts`
- `frontend/src/lib/api.ts`
- `backend/src/api/endpoints/auth.py`

Key concepts:
- Google OAuth flow
- Supabase Auth SDK
- JWT token injection
- localStorage persistence
- Zustand state management

### Understanding Stripe Integration
**How payment processing works:**

Files to read:
- CODEBASE_SUMMARY.md → Critical Paths #3 → Stripe Integration
- CODEBASE_ARCHITECTURE_OVERVIEW.md → Section 5 → Stripe Payment Processing
- ARCHITECTURE_DIAGRAM.md → System Architecture diagram
- `backend/src/api/endpoints/webhooks.py`
- `backend/src/services/webhook_service.py`
- `backend/src/services/stripe_service.py`

Key concepts:
- Webhook signature verification
- Idempotency key deduplication
- Atomic token addition
- Payment intent lifecycle

### Understanding Database Schema
**What data is stored and how:**

Files to read:
- CODEBASE_ARCHITECTURE_OVERVIEW.md → Section 1 → Database Structure
- All files in `supabase/migrations/`
- CLAUDE.md → Database Schema section

Key tables:
- `users` (authentication + subscription)
- `users_token_accounts` (balance tracking)
- `users_token_transactions` (history)
- `generations` (generation records)
- `generation_areas` (per-area results)
- `subscriptions` (Stripe subscriptions)
- `holiday_generations` (holiday feature)

---

## Alphabetical File Reference

| File | Purpose | Read Time |
|------|---------|-----------|
| ARCHITECTURE_DIAGRAM.md | Visual architecture, data flows, deployment topology | 20 min |
| CODEBASE_ARCHITECTURE_OVERVIEW.md | Complete detailed architecture documentation | 45 min |
| CODEBASE_SUMMARY.md | Executive summary, quick reference, gotchas | 15 min |
| CLAUDE.md | Project instructions, patterns, deployment config | 30 min |
| DOCUMENTATION_INDEX.md | This file - navigation guide | 10 min |

---

## Common Questions & Where to Find Answers

| Question | Answer Location |
|----------|------------------|
| What is Yarda? | CODEBASE_SUMMARY.md - Top section |
| How do I run the app locally? | CLAUDE.md - Development Setup |
| Where's the payment logic? | CODEBASE_ARCHITECTURE_OVERVIEW.md - Section 4 (Services) |
| How does image generation work? | ARCHITECTURE_DIAGRAM.md - Data Flow section |
| What are the bottlenecks? | CODEBASE_SUMMARY.md - Potential Bottlenecks section |
| How do I deploy? | CODEBASE_ARCHITECTURE_OVERVIEW.md - Section 9 |
| Where's the database schema? | CODEBASE_ARCHITECTURE_OVERVIEW.md - Section 1 (Database) |
| What are critical gotchas? | CODEBASE_SUMMARY.md - Critical Gotchas section |
| How do I run tests? | CLAUDE.md - Testing Strategy section |
| What's the tech stack? | CODEBASE_ARCHITECTURE_OVERVIEW.md - Section 2 |
| Where are the API endpoints? | CODEBASE_ARCHITECTURE_OVERVIEW.md - Section 1 (Backend Structure) |
| How do I sync credit balances? | CODEBASE_ARCHITECTURE_OVERVIEW.md - Section 4 (Frontend Services) #4 |
| What are the critical paths? | CODEBASE_SUMMARY.md - Critical Paths section |
| How does Stripe integration work? | CODEBASE_SUMMARY.md - Critical Paths #3 |
| What are the payment priorities? | ARCHITECTURE_DIAGRAM.md - Payment System Hierarchy |

---

## Learning Path (Recommended)

### Week 1: Foundations
- Day 1-2: Read CODEBASE_SUMMARY.md (understand what we're building)
- Day 2-3: Read ARCHITECTURE_DIAGRAM.md (understand how it fits together)
- Day 3-4: Run app locally (CLAUDE.md - Development Setup)
- Day 4-5: Explore codebase structure (CODEBASE_ARCHITECTURE_OVERVIEW.md - Section 1)

### Week 2: Deep Dive (Choose Your Path)

**Backend Developer Path:**
- Read CODEBASE_ARCHITECTURE_OVERVIEW.md - Sections 3-5
- Study services files (generation_service.py, payment services, etc.)
- Trace a complete request flow with debugger
- Run backend unit tests

**Frontend Developer Path:**
- Read CODEBASE_ARCHITECTURE_OVERVIEW.md - Section 1 (Frontend)
- Study component structure and Zustand store
- Trace authentication flow
- Run E2E tests

**DevOps Path:**
- Read CODEBASE_ARCHITECTURE_OVERVIEW.md - Section 9
- Review Vercel/Railway/Supabase configurations
- Understand CI/CD pipeline
- Review monitoring and logging

### Week 3: Specialization
- Pick a feature or service
- Read all related code comments
- Understand error handling and edge cases
- Contribute a small fix or improvement

---

## Document Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-13 | Initial comprehensive documentation created |

---

## How to Use This Documentation

1. **Bookmark this file** (DOCUMENTATION_INDEX.md) as your starting point
2. **Use the table of contents** to jump to specific topics
3. **Follow the reading recommendations** for your role
4. **Reference CLAUDE.md** for practical how-to guides
5. **Check the FAQ** for quick answers
6. **Refer to specific architecture documents** when diving deep

---

## Contributing to Documentation

Found an error or outdated information? 
1. Update the relevant document
2. Update the version history above
3. Commit with a clear message
4. Mention in your PR description

---

**Last Updated**: 2025-11-13  
**Maintained By**: Codebase Architecture Team  
**Status**: Complete and Production-Ready

