# Testing Guide - User Story 3: Generation History Tracking

## Quick Start

### Prerequisites
```bash
# Backend
- Python 3.11+
- Supabase project with service role key
- Virtual environment activated

# Frontend
- Node.js 18+
- npm installed
- Environment variables configured
```

### Environment Setup

#### Backend (.env)
```bash
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## Running Backend Integration Tests

### All Integration Tests
```bash
cd backend
pytest tests/integration/test_generation_history.py -v
```

### Specific Test
```bash
# Test pagination
pytest tests/integration/test_generation_history.py::TestGenerationHistory::test_pagination_with_limit_and_offset -v

# Test filtering
pytest tests/integration/test_generation_history.py::TestGenerationHistory::test_filter_by_status -v

# Test ordering
pytest tests/integration/test_generation_history.py::TestGenerationHistory::test_generations_ordered_by_created_at_desc -v
```

### With Coverage
```bash
pytest tests/integration/test_generation_history.py --cov=src/services/generation_service --cov-report=html
```

### Expected Output
```
tests/integration/test_generation_history.py::TestGenerationHistory::test_list_user_generations PASSED
tests/integration/test_generation_history.py::TestGenerationHistory::test_pagination_with_limit_and_offset PASSED
tests/integration/test_generation_history.py::TestGenerationHistory::test_generations_ordered_by_created_at_desc PASSED
tests/integration/test_generation_history.py::TestGenerationHistory::test_filter_by_status PASSED
tests/integration/test_generation_history.py::TestGenerationHistory::test_user_isolation_in_history PASSED
tests/integration/test_generation_history.py::TestGenerationHistory::test_generation_includes_all_fields PASSED
tests/integration/test_generation_history.py::TestGenerationHistory::test_count_total_generations PASSED
tests/integration/test_generation_history.py::TestGenerationHistory::test_empty_history_for_new_user PASSED

===================== 9 passed in 12.34s =====================
```

## Running Frontend E2E Tests

### Prerequisites
```bash
cd frontend

# Install dependencies if not already done
npm install

# Install Playwright browsers (first time only)
npx playwright install
```

### Start Backend Server
```bash
cd backend
uvicorn src.main:app --reload
# Backend should be running on http://localhost:8000
```

### Start Frontend Dev Server
```bash
cd frontend
npm run dev
# Frontend should be running on http://localhost:3000
```

### Run E2E Tests

#### All E2E Tests
```bash
npm test -- tests/e2e/generation-history.spec.ts
```

#### Headed Mode (See browser)
```bash
npm run test:headed -- tests/e2e/generation-history.spec.ts
```

#### UI Mode (Interactive)
```bash
npm run test:ui -- tests/e2e/generation-history.spec.ts
```

#### Specific Test
```bash
npm test -- tests/e2e/generation-history.spec.ts -g "should display all user generations"
```

#### Generate Report
```bash
npm test -- tests/e2e/generation-history.spec.ts --reporter=html
npm run test:report
```

### Expected Output
```
Running 13 tests using 1 worker

  ✓ should display all user generations in history (15.2s)
  ✓ should show generation details in history card (8.1s)
  ✓ should display generation status in history (7.8s)
  ✓ should show credit type used in history (7.9s)
  ✓ should display generations in reverse chronological order (18.5s)
  ✓ should show empty state when no generations exist (2.3s)
  ✓ should support pagination for large history (45.6s)
  ✓ should filter by status (8.2s)
  ✓ should show generation details in modal (9.1s)
  ✓ should close modal when clicking close button (8.4s)
  ✓ should show processing time for each generation (7.7s)
  ✓ should display thumbnail images in history cards (8.0s)

  13 passed (2.5m)
```

## Test Breakdown

### Backend Integration Tests (9 tests)

#### 1. test_list_user_generations
- Creates 3 generations for a user
- Verifies all 3 are returned
- Checks descending order

#### 2. test_pagination_with_limit_and_offset
- Creates 15 generations
- Fetches page 1 (10 items)
- Fetches page 2 (5 items)
- Verifies no overlap

#### 3. test_generations_ordered_by_created_at_desc
- Creates generations with specific addresses
- Verifies newest is first
- Verifies oldest is last

#### 4. test_filter_by_status
- Creates generations with different statuses
- Filters by "completed" status
- Verifies only completed returned
- Filters by "failed" status
- Verifies only failed returned

#### 5. test_user_isolation_in_history
- Creates two users
- Creates generation for each
- Verifies each user only sees their own

#### 6. test_generation_includes_all_fields
- Creates complete generation with all fields
- Retrieves and verifies all fields present

#### 7. test_count_total_generations
- Creates 25 generations
- Verifies count is exact

#### 8. test_empty_history_for_new_user
- Creates new user
- Verifies empty history

#### 9. Test pagination boundary conditions
- Verified in test #2

### Frontend E2E Tests (13 tests)

#### 1. Display all user generations in history
- Registers user
- Creates 3 generations
- Navigates to /history
- Verifies 3 cards displayed

#### 2. Show generation details in history card
- Creates generation with address, style, custom prompt
- Verifies all details shown in card

#### 3. Display generation status in history
- Creates completed generation
- Verifies status badge shows "completed"

#### 4. Show credit type used in history
- Creates generation
- Verifies credit type badge shows "trial"

#### 5. Display generations in reverse chronological order
- Creates 3 generations with different addresses
- Verifies newest is first, oldest is last

#### 6. Show empty state when no generations exist
- New user with no generations
- Verifies empty state message
- Verifies CTA button present

#### 7. Support pagination for large history
- Creates 15 generations
- Verifies first page shows 10
- Clicks next
- Verifies second page shows 5

#### 8. Filter by status
- Creates completed generation
- Selects "completed" filter
- Verifies only completed shown

#### 9. Show generation details in modal
- Creates generation
- Clicks card
- Verifies modal opens with all details

#### 10. Close modal when clicking close button
- Opens modal
- Clicks close button
- Verifies modal closes

#### 11. Show processing time for each generation
- Creates generation
- Verifies processing time displayed

#### 12. Display thumbnail images in history cards
- Creates generation with image
- Verifies thumbnail displayed

#### 13. Navigate from empty state
- Implicitly tested in test #6

## Debugging Failed Tests

### Backend Tests

#### Connection Issues
```bash
# Check Supabase connection
python -c "from supabase import create_client; import os; print(create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY')))"
```

#### Database State Issues
```bash
# Reset test database
pytest --create-db
```

#### Verbose Output
```bash
pytest tests/integration/test_generation_history.py -vv -s
```

### Frontend E2E Tests

#### Check Backend Running
```bash
curl http://localhost:8000/health
# Should return {"status": "healthy"}
```

#### Check Frontend Running
```bash
curl http://localhost:3000
# Should return HTML
```

#### Debug Mode
```bash
# Run with headed browser and slow motion
npm test -- tests/e2e/generation-history.spec.ts --headed --slowmo=500
```

#### Screenshots on Failure
```bash
# Playwright automatically captures screenshots on failure
# Check: test-results/<test-name>/test-failed-1.png
```

#### Trace Viewer
```bash
# Enable tracing
npm test -- tests/e2e/generation-history.spec.ts --trace=on

# View trace
npx playwright show-trace trace.zip
```

## Common Issues

### Issue: "Generation not found"
**Cause:** Backend not creating generation properly
**Fix:** Check backend logs, verify database schema

### Issue: "Empty history shows but generations exist"
**Cause:** API call failing or authentication issue
**Fix:** Check network tab, verify auth token

### Issue: "Pagination not working"
**Cause:** Incorrect offset calculation
**Fix:** Verify store currentPage and pageSize

### Issue: "Status filter not working"
**Cause:** Status parameter not sent correctly
**Fix:** Check API client query parameter formatting

### Issue: "Modal not opening"
**Cause:** selectedGeneration not set in store
**Fix:** Verify setSelectedGeneration called on card click

### Issue: "Timeout on generation completion"
**Cause:** Background processing taking too long
**Fix:** Increase timeout in test or speed up mock processing

## Performance Benchmarks

### Backend
- List 10 generations: < 100ms
- List 100 generations: < 200ms
- Filter by status: < 150ms
- Count total: < 50ms

### Frontend
- Initial render: < 2s
- Page navigation: < 500ms
- Filter change: < 500ms
- Modal open/close: < 100ms

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Test Generation History

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Run integration tests
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          cd backend
          pytest tests/integration/test_generation_history.py -v

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      - name: Install Playwright
        run: |
          cd frontend
          npx playwright install --with-deps
      - name: Run E2E tests
        env:
          NEXT_PUBLIC_API_URL: http://localhost:8000
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
        run: |
          cd frontend
          npm test -- tests/e2e/generation-history.spec.ts
```

## Manual Testing Checklist

### UI/UX Testing
- [ ] Cards display properly on different screen sizes
- [ ] Hover effects work smoothly
- [ ] Modal backdrop blur works
- [ ] Empty state displays correctly
- [ ] Loading spinner animates
- [ ] Error states show helpful messages

### Functionality Testing
- [ ] Pagination buttons enable/disable correctly
- [ ] Status filter updates results
- [ ] Modal shows all generation details
- [ ] Processing time formats correctly
- [ ] Thumbnail images load
- [ ] Click outside modal closes it

### Accessibility Testing
- [ ] Tab navigation works
- [ ] Screen reader announces changes
- [ ] Color contrast meets WCAG standards
- [ ] Buttons have clear labels
- [ ] Disabled states are obvious

### Performance Testing
- [ ] Large lists (100+ items) render smoothly
- [ ] Pagination doesn't cause lag
- [ ] Images load efficiently
- [ ] No memory leaks on page changes

### Cross-Browser Testing
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Mobile Testing
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Responsive layout works
- [ ] Touch interactions work

## Test Data

### Sample Generation Object
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "660e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "input_type": "address",
  "input_address": "123 Main St, San Francisco, CA",
  "style": "modern",
  "custom_prompt": "Add palm trees and tropical flowers",
  "output_image_url": "https://example.com/output.jpg",
  "processing_time_ms": 1500,
  "credit_type": "trial",
  "credit_refunded": false,
  "created_at": "2025-10-28T10:30:00Z"
}
```

## Success Criteria

All tests pass with:
- ✅ 9/9 backend integration tests passing
- ✅ 13/13 frontend E2E tests passing
- ✅ No console errors
- ✅ No network errors
- ✅ Performance within benchmarks
- ✅ All data-testid attributes present
- ✅ UI matches design requirements

## Next Steps After Testing

1. Fix any failing tests
2. Address performance issues
3. Improve error messages
4. Add loading states where missing
5. Implement additional features (infinite scroll, export, etc.)
6. Code review and refactoring
7. Documentation updates
8. Deploy to staging
9. QA testing
10. Production deployment

---

**Last Updated:** 2025-10-28
**Status:** Ready for Testing
