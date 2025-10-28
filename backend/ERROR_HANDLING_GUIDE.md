# Error Handling Quick Reference Guide

## Custom Exceptions

Import: `from src.exceptions import *`

### Exception Classes

| Exception | Status Code | Usage |
|-----------|------------|-------|
| `YardaException` | 500 | Base class for all custom exceptions |
| `AuthenticationError` | 401 | Invalid or missing authentication token |
| `AuthorizationError` | 403 | User lacks required permissions |
| `ResourceNotFoundError` | 404 | Requested resource doesn't exist |
| `ValidationError` | 422 | Input validation failed |
| `InsufficientCreditsError` | 402 | User has no credits available |
| `RateLimitError` | 429 | User exceeded rate limit |
| `DatabaseError` | 500 | Database operation failed |
| `ExternalServiceError` | 503 | External service (AI, payment) failed |

## Usage Examples

### In Services

```python
from ..exceptions import InsufficientCreditsError, DatabaseError
import logging

logger = logging.getLogger(__name__)

async def consume_credit(self, user_id: UUID):
    try:
        # Database operation
        result = self.supabase.rpc('consume_credit', {...}).execute()

        if not result.data:
            raise InsufficientCreditsError()

        return result.data

    except InsufficientCreditsError:
        # Re-raise custom exceptions as-is
        raise
    except Exception as e:
        # Log and wrap unexpected errors
        logger.error(f"Failed to consume credit: {str(e)}")
        raise DatabaseError(f"Failed to consume credit: {str(e)}")
```

### Rate Limit with Retry After

```python
from ..exceptions import RateLimitError

if not can_request:
    retry_after = await self.get_time_until_reset(user_id)
    raise RateLimitError(retry_after)  # Includes retry_after in response
```

### Resource Not Found

```python
from ..exceptions import ResourceNotFoundError

if not result.data:
    raise ResourceNotFoundError("Generation")  # Message: "Generation not found"
```

### Validation Errors

```python
from ..exceptions import ValidationError

if limit < 1 or limit > 100:
    raise ValidationError("Limit must be between 1 and 100")
```

## Error Response Format

### Standard Error Response
```json
{
  "error": "InsufficientCreditsError",
  "message": "Insufficient credits to generate design. Please purchase tokens or wait for trial credit reset."
}
```

### Rate Limit Error Response
```json
{
  "error": "RateLimitError",
  "message": "Rate limit exceeded. Try again in 45 seconds",
  "retry_after": 45
}
```

### Validation Error Response
```json
{
  "error": "ValidationError",
  "message": "Invalid request data",
  "details": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

## Best Practices

### 1. Always Re-raise Custom Exceptions
```python
try:
    # operation
except InsufficientCreditsError:
    # Don't wrap - re-raise as-is
    raise
except Exception as e:
    # Wrap unexpected errors
    raise DatabaseError(f"Operation failed: {str(e)}")
```

### 2. Log Before Raising
```python
try:
    # operation
except Exception as e:
    logger.error(f"Context about what failed: {str(e)}")
    raise DatabaseError(f"User-friendly message: {str(e)}")
```

### 3. Don't Expose Internal Details
```python
# BAD
raise DatabaseError(f"SQL Error: {internal_error_details}")

# GOOD
logger.error(f"Database error: {internal_error_details}")
raise DatabaseError("Failed to retrieve data")
```

### 4. Use Appropriate Exception Types
```python
# User not found - use ResourceNotFoundError (404)
if not user:
    raise ResourceNotFoundError("User")

# Invalid token - use ValidationError (422)
if not is_valid_token(token):
    raise ValidationError("Invalid verification token")

# No permissions - use AuthorizationError (403)
if not user.email_verified:
    raise AuthorizationError("Email verification required")
```

## Testing Error Handling

### Test Custom Exceptions
```python
def test_insufficient_credits_error():
    with pytest.raises(InsufficientCreditsError) as exc_info:
        raise InsufficientCreditsError()

    assert exc_info.value.status_code == 402
    assert "Insufficient credits" in exc_info.value.message
```

### Test Service Error Handling
```python
async def test_consume_credit_insufficient(mock_supabase):
    mock_supabase.rpc.return_value.execute.return_value.data = None

    service = CreditService(mock_supabase)

    with pytest.raises(InsufficientCreditsError):
        await service.consume_credit(user_id)
```

### Test API Error Responses
```python
def test_create_generation_no_credits(client, auth_token):
    response = client.post(
        "/api/generations",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={...}
    )

    assert response.status_code == 402
    assert response.json()["error"] == "InsufficientCreditsError"
```

## Common Patterns

### Credit Refund on Failure
```python
credit_type = None

try:
    # Consume credit
    credit_type = await self.credit_service.consume_credit(user_id)

    # Perform operation
    result = await self.perform_operation()

except Exception as e:
    # Refund credit on any failure
    if credit_type:
        await self.credit_service.refund_credit(None, user_id, credit_type)
    raise
```

### Check and Record Pattern (Rate Limiting)
```python
async def check_and_record(self, user_id: UUID):
    try:
        if not await self.check_rate_limit(user_id):
            retry_after = await self.get_time_until_reset(user_id)
            raise RateLimitError(retry_after)

        await self.record_attempt(user_id)

    except RateLimitError:
        raise  # Re-raise as-is
    except Exception as e:
        raise DatabaseError(f"Rate limit operation failed: {str(e)}")
```

### Validation with Multiple Checks
```python
async def validate_data(self, data):
    errors = []

    if not data.email:
        errors.append("Email is required")

    if data.limit < 1:
        errors.append("Limit must be positive")

    if errors:
        raise ValidationError("; ".join(errors))
```

## Monitoring and Alerting

### Log Levels
- `DEBUG`: Detailed diagnostic info (e.g., "Rate limit check passed")
- `INFO`: General info (e.g., "User registered", "Credit consumed")
- `WARNING`: Warning messages (e.g., "User has insufficient credits")
- `ERROR`: Error messages (e.g., "Failed to consume credit")
- `EXCEPTION`: Use in exception blocks for stack trace

### Example Logging
```python
logger.debug(f"Rate limit check for user {user_id}: {can_request}")
logger.info(f"User registered: {user_id}")
logger.warning(f"User {user_id} has insufficient credits")
logger.error(f"Failed to consume credit for user {user_id}: {error_msg}")
```

### Setting Up Error Monitoring

1. Configure Sentry (or similar):
```python
import sentry_sdk

sentry_sdk.init(
    dsn="your-dsn",
    traces_sample_rate=1.0,
    environment="production"
)
```

2. Add context to errors:
```python
with sentry_sdk.configure_scope() as scope:
    scope.set_user({"id": user_id, "email": user_email})
    scope.set_tag("operation", "credit_consumption")
```

## Migration Guide (Old → New)

### Before
```python
@router.post("/generations")
async def create_generation(...):
    try:
        generation = await service.create_generation(...)
        return generation
    except Exception as e:
        if "Insufficient credits" in str(e):
            raise HTTPException(status_code=403, detail="...")
        raise HTTPException(status_code=500, detail="...")
```

### After
```python
@router.post("/generations")
async def create_generation(...):
    # Service raises custom exceptions
    # Global handlers convert to HTTP responses
    generation = await service.create_generation(...)
    return generation
```

## Troubleshooting

### Error Not Caught by Global Handler
- Ensure exception inherits from `YardaException`
- Check exception is raised, not returned
- Verify global handlers are registered in `main.py`

### Wrong Status Code Returned
- Check exception's `status_code` property
- Ensure you're raising the correct exception type
- Verify global handler is using `exc.status_code`

### Error Details Not Shown
- For development: Set `DEBUG=True`
- For production: Check logs for full details
- Error messages are sanitized for security

### Rate Limit Not Working
- Verify `check_user_rate_limit` dependency is used
- Check `RateLimitService.check_and_record()` is called
- Ensure database function `check_rate_limit` exists
