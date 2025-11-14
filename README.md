# Yarda AI Landscape Studio

AI-powered landscape design platform with trial credits, token system, and subscription plans.

## 📚 Documentation

**New to the project?** Start here:

| Document | Description |
|----------|-------------|
| [CLAUDE.md](CLAUDE.md) | **AI Assistant Context** - High-level overview and quick reference |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, patterns, and data flows |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Feature specifications and business logic |
| [docs/TESTING.md](docs/TESTING.md) | Testing strategy, CUJs, and commands |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Environment configs, CI/CD, deployment guide |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Setup, commands, troubleshooting |
| [docs/API.md](docs/API.md) | API endpoint reference |
| [docs/DATABASE.md](docs/DATABASE.md) | Schema, migrations, query patterns |
| [docs/adr/](docs/adr/) | Architecture Decision Records |

**Quick Links:**
- 🚀 [Quick Start](#quick-start) - Get running locally in 5 minutes
- 🧪 [Testing](#testing) - Run E2E and unit tests
- 🚢 [Deployment](#deployment) - Deploy to production
- 🏗️ [Project Structure](#project-structure) - Codebase organization

## Project Structure

```
yarda-v5/
├── backend/                 # Python FastAPI backend
│   ├── src/
│   │   ├── api/endpoints/  # API route handlers
│   │   ├── db/             # Database connection pool
│   │   ├── models/         # Pydantic models
│   │   └── services/       # Business logic services
│   ├── tests/              # Backend tests
│   └── requirements.txt    # Python dependencies
│
├── frontend/               # Next.js React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Next.js pages
│   │   ├── store/         # Zustand state management
│   │   ├── services/      # API client services
│   │   └── lib/           # Utility functions
│   ├── tests/e2e/         # Playwright E2E tests
│   └── package.json       # Node dependencies
│
├── supabase/
│   └── migrations/        # Database migrations (10 files)
│
└── specs/
    └── 001-002-landscape-studio/  # Feature specifications
```

## Technology Stack

### Backend
- **Python 3.11+** - Programming language
- **FastAPI** - Web framework
- **PostgreSQL** (Supabase) - Database with row-level security
- **Stripe** - Payment processing
- **Google Gemini 2.5 Flash** - AI image generation
- **Vercel Blob** - Image storage
- **Firebase Admin** - Authentication

### Frontend
- **Next.js 15** - React framework
- **TypeScript 5.x** - Type safety
- **Zustand** - State management with localStorage persistence
- **Axios** - HTTP client
- **Stripe.js** - Payment UI

### Infrastructure
- **Supabase** - PostgreSQL database + Auth
- **Vercel** - Frontend hosting
- **Railway** - Backend hosting (alternative: Render, Fly.io)

## Quick Start

### Prerequisites

1. **Node.js 18+** and **Python 3.11+**
2. **Supabase account** - [app.supabase.com](https://app.supabase.com)
3. **Stripe account** - [dashboard.stripe.com](https://dashboard.stripe.com)
4. **Firebase project** - [console.firebase.google.com](https://console.firebase.google.com)
5. **Google AI API key** - [ai.google.dev](https://ai.google.dev)
6. **Vercel account** - [vercel.com](https://vercel.com)

### 1. Database Setup

```bash
# Follow the Supabase setup guide
cd supabase
cat README.md  # Detailed migration instructions
```

**Quick Summary**:
1. Create Supabase project
2. Apply all 10 migrations in order (001 → 010)
3. Verify tables and functions exist

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run backend
uvicorn src.main:app --reload --port 8000
```

Backend will be available at `http://localhost:8000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Run frontend
npm run dev
```

Frontend will be available at `http://localhost:3000`

## Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Firebase
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json

# Google Gemini
GEMINI_API_KEY=...

# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# Application
APP_URL=http://localhost:3000
API_URL=http://localhost:8000
```

### Frontend (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# API
NEXT_PUBLIC_API_URL=http://localhost:8000

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=[project].firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=[project]
```

## Key Features

### 1. Trial System (User Story 1 - P1)
- 3 free trial credits on registration
- Atomic trial deduction with row-level locking
- Email verification required
- Trial exhausted modal when remaining = 0

### 2. Token System (User Story 2 - P1)
- Pay-per-use token packages ($2-$40)
- Stripe Checkout integration
- Idempotent webhook processing
- Atomic token deduction (prevents negative balances)

### 3. Auto-Reload (User Story 3 - P2)
- Configurable threshold (1-100 tokens) and amount (min 10)
- 60-second throttle to prevent duplicate charges
- Automatic disable after 3 payment failures
- Email notifications on success/failure

### 4. Subscriptions (User Story 4 - P2)
- 7-Day Pass ($49), Per-Property ($29), Monthly Pro ($99/month)
- Unlimited generations for active subscribers
- Stripe Customer Portal for management
- Graceful fallback to token system on cancellation

### 5. Multi-Area Generation (User Story 5 - P3)
- Select up to 5 yard areas per request
- Parallel processing with asyncio
- Multiple angles for backyard (2-3 images)
- Independent status tracking per area

### 6. Transaction History (User Story 6 - P3)
- Complete audit trail of all token operations
- Running balance after each transaction
- Filterable by type, date range
- CSV export

## Testing

### Backend Tests

```bash
cd backend
pytest tests/ -v
pytest tests/integration/ -v  # Integration tests
```

### Frontend E2E Tests

```bash
cd frontend
npm run test:e2e
```

### Manual Testing

See [specs/001-002-landscape-studio/quickstart.md](specs/001-002-landscape-studio/quickstart.md) for detailed test scenarios.

## API Documentation

Once the backend is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI Spec**: [specs/001-002-landscape-studio/contracts/openapi.yaml](specs/001-002-landscape-studio/contracts/openapi.yaml)

## Development Workflow

### Constitution Principles (NON-NEGOTIABLE)

1. **Type Safety**: No `any` types in TypeScript, Pydantic models in Python
2. **Test-First Development**: Write tests before implementation
3. **CI/CD Pipeline**: All tests must pass before merge

### Adding a New Feature

1. **Specify**: Create spec in `specs/[feature]/spec.md`
2. **Plan**: Generate `plan.md` with technical decisions
3. **Tasks**: Break down into `tasks.md`
4. **Implement**: Follow TDD approach
5. **Test**: E2E, integration, and unit tests
6. **Deploy**: CI/CD pipeline handles deployment

## Deployment

### Backend (Railway/Render/Fly.io)

```bash
# Railway
railway up

# Or Render
git push render main

# Or Fly.io
flyctl deploy
```

### Frontend (Vercel)

```bash
# Connect GitHub repo to Vercel
vercel --prod
```

### Database Migrations

```bash
# Already applied during setup
# For new migrations, add to supabase/migrations/ and apply via psql
```

## Security

- **Row-Level Security (RLS)**: Users can only access their own data
- **Firebase Authentication**: JWT-based auth with backend validation
- **Stripe PCI Compliance**: No card data stored in database
- **Rate Limiting**: 60 requests/minute, 1000/hour per user
- **Environment Variables**: Never commit .env files

## Monitoring

- **Database**: Supabase dashboard for query performance
- **Backend**: FastAPI logs + error tracking
- **Frontend**: Vercel Analytics + error monitoring
- **Payments**: Stripe dashboard for transaction monitoring

## Support

- **Documentation**: See `specs/001-002-landscape-studio/` for complete specs
- **Issues**: Create GitHub issue with reproduction steps
- **Stripe Webhooks**: Configure at `https://[domain]/v1/webhooks/stripe`

## License

Proprietary - All rights reserved

---

**Status**: ✅ Ready for Phase 3 implementation (User Story 1 - Trial System)

**Next Steps**:
1. Apply database migrations (see `supabase/README.md`)
2. Configure environment variables
3. Run backend and frontend locally
4. Begin implementing User Story 1 (Phase 3 in tasks.md)
