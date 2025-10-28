# Yarda Backend API

FastAPI backend for AI-powered yard design generation platform.

## Features

- **User Authentication**: Email/password with verification
- **Credit System**: Trial credits + purchasable tokens
- **Design Generation**: AI-powered yard design creation
- **Atomic Operations**: Thread-safe credit consumption with PostgreSQL row-level locking
- **Automatic Refunds**: Failed generations automatically refund credits

## Tech Stack

- **Framework**: FastAPI 0.104+
- **Database**: Supabase (PostgreSQL + Auth)
- **Validation**: Pydantic 2.5+
- **Testing**: pytest + pytest-asyncio
- **Python**: 3.11+

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3. Run Database Migrations

```bash
# From project root
cd supabase
supabase db push
```

### 4. Start Development Server

```bash
cd backend
python -m uvicorn src.main:app --reload --port 8000
```

API will be available at:
- Main API: http://localhost:8000
- Swagger Docs: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## Project Structure

```
backend/
├── src/
│   ├── main.py                 # FastAPI application entry point
│   ├── models/                 # Pydantic models
│   │   ├── user.py
│   │   ├── token_account.py
│   │   └── generation.py
│   ├── services/               # Business logic layer
│   │   ├── auth_service.py
│   │   ├── credit_service.py
│   │   └── generation_service.py
│   └── api/
│       ├── dependencies.py     # FastAPI dependencies
│       └── endpoints/          # API routes
│           ├── auth.py
│           ├── credits.py
│           └── generations.py
├── tests/
│   ├── conftest.py            # Shared test fixtures
│   ├── test_services.py       # Unit tests
│   └── integration/           # Integration tests
│       ├── test_email_verification.py
│       └── test_credit_consumption.py
├── requirements.txt
├── pytest.ini
└── .env
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/verify-email` - Verify email address
- `POST /api/auth/resend-verification` - Resend verification email
- `GET /api/auth/me` - Get current user info

### Credits
- `GET /api/credits/balance` - Get credit balance

### Generations
- `POST /api/generations` - Create new design generation
- `GET /api/generations/{id}` - Get generation details
- `GET /api/generations` - List user's generations

## Testing

### Run All Tests
```bash
pytest -v
```

### Run Integration Tests Only
```bash
pytest tests/integration/ -v
```

### Run with Coverage
```bash
pytest --cov=src --cov-report=html
open htmlcov/index.html
```

### Run Specific Test File
```bash
pytest tests/integration/test_credit_consumption.py -v
```

## Development

### Code Style
```bash
# Format code
black src/ tests/

# Check types
mypy src/

# Lint
ruff check src/ tests/
```

### Adding New Endpoints

1. Create model in `src/models/`
2. Create service in `src/services/`
3. Create endpoint in `src/api/endpoints/`
4. Register router in `src/main.py`
5. Add tests in `tests/`

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin) | `eyJh...` |
| `SUPABASE_ANON_KEY` | Anonymous key (client) | `eyJh...` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` |

## Database Schema

### Tables
- **users**: User accounts with trial credits
- **token_accounts**: Purchased token balances
- **generations**: Design generation history
- **rate_limits**: API rate limiting (future)

### Functions
- `consume_credit(user_id)`: Atomically consume credit
- `refund_credit(generation_id)`: Refund failed generation
- `get_credit_balance(user_id)`: Get credit breakdown
- `check_rate_limit(user_id)`: Check rate limit status

See `supabase/migrations/` for complete schema.

## Common Tasks

### Create New User
```python
from src.services.auth_service import AuthService
from src.models.user import UserCreate

# In endpoint
auth_service = AuthService(supabase_client)
user = await auth_service.register_user(
    UserCreate(email="test@example.com", password="SecurePass123!")
)
```

### Consume Credit
```python
from src.services.credit_service import CreditService

credit_service = CreditService(supabase_client)
credit_type = await credit_service.consume_credit(user_id)
# Returns CreditType.TRIAL or CreditType.TOKEN
```

### Create Generation
```python
from src.services.generation_service import GenerationService
from src.models.generation import GenerationCreate, InputType

generation_service = GenerationService(supabase_client)
generation = await generation_service.create_generation(
    user_id=user_id,
    generation_data=GenerationCreate(
        input_type=InputType.PHOTO,
        input_photo_url="https://example.com/photo.jpg",
        style="modern"
    )
)
```

## Troubleshooting

### "Insufficient credits" Error
- User has consumed all trial credits and has no tokens
- Check credit balance: `GET /api/credits/balance`
- Solution: Purchase tokens or wait for trial reset

### "Email verification required" Error
- User hasn't verified their email
- Resend verification: `POST /api/auth/resend-verification`

### Database Connection Issues
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
- Check Supabase project is not paused
- Verify network connectivity

### Tests Failing
- Ensure Supabase instance is running
- Run migrations: `supabase db push`
- Check test database has clean state

## Production Deployment

### Environment Setup
1. Set production environment variables
2. Disable debug mode
3. Configure proper CORS origins
4. Set up SSL/TLS

### Database
1. Run migrations on production database
2. Set up database backups
3. Configure connection pooling

### Monitoring
1. Set up application logging
2. Configure error tracking (Sentry)
3. Monitor API performance
4. Track credit consumption metrics

## Future Enhancements

- [ ] Real AI integration (replace mock)
- [ ] Rate limiting implementation
- [ ] Webhook notifications
- [ ] Payment processing (Stripe)
- [ ] Admin dashboard
- [ ] Generation queue with Celery
- [ ] Image optimization and CDN
- [ ] Caching layer (Redis)

## Support

For detailed implementation information, see:
- `IMPLEMENTATION_SUMMARY.md` - Complete implementation guide
- API Documentation: http://localhost:8000/api/docs
- Database Schema: `supabase/migrations/`

## License

Proprietary - All rights reserved
