# Test Fixtures

This directory contains test fixtures for E2E tests.

## Required Fixtures

### test-property-image.jpg

A sample property image for testing manual upload functionality.

**Requirements**:
- Format: JPEG
- Size: < 10MB (per MAX_IMAGE_SIZE_MB configuration)
- Dimensions: Minimum 400x400 pixels
- Content: Any property/landscape image

**How to add**:
1. Find or create a test property image
2. Save it as `test-property-image.jpg` in this directory
3. Ensure it's included in .gitignore if it contains sensitive content

**Alternative**: You can use any publicly available landscape/property image for testing purposes.

## Usage in Tests

```typescript
import path from 'path';

const testImagePath = path.join(__dirname, '../fixtures/test-property-image.jpg');
await page.setInputFiles('input[type="file"]', testImagePath);
```
