# Feature 005: Cleanup Checklist

**Purpose**: Systematic cleanup after porting v2 generation flow to v5
**Date**: 2025-11-07
**Status**: Ready for execution after testing passes

---

## Phase 1: Code Cleanup

### Remove Deprecated Files
- [ ] **Backup old generate page**
  ```bash
  mv frontend/src/pages/generate.tsx frontend/src/pages/generate-old-backup.tsx
  ```

- [ ] **Activate new generate page**
  ```bash
  mv frontend/src/pages/generate-v2.tsx frontend/src/pages/generate.tsx
  ```

- [ ] **Test new page thoroughly** (run all E2E tests)

- [ ] **Delete backup if tests pass**
  ```bash
  rm frontend/src/pages/generate-old-backup.tsx
  ```

### Remove Old Progress Components (if superseded)
- [ ] Check if `GenerationProgress.tsx` is still used
  - If not, remove: `rm frontend/src/components/generation/GenerationProgress.tsx`

- [ ] Check if separate results page exists
  - If yes, remove old results components

### Clean Up Test Artifacts
- [ ] Remove old test screenshots
  ```bash
  rm -rf frontend/test-results/*.png
  ```

- [ ] Clean Playwright cache
  ```bash
  cd frontend && npx playwright clean
  ```

---

## Phase 2: Documentation Updates

### Update CLAUDE.md
- [ ] **Add new component patterns**
  ```markdown
  ## Generation Flow Components (Feature 005)

  ### GenerationProgressInline
  - Location: `frontend/src/components/generation/GenerationProgressInline.tsx`
  - Purpose: Inline progress tracking with per-area status
  - Props: `areas`, `overallStatus`, `className`

  ### GenerationResultsInline
  - Location: `frontend/src/components/generation/GenerationResultsInline.tsx`
  - Purpose: Inline results display with image gallery
  - Props: `areas`, `address`, `onStartNew`, `className`

  ### Suggested Prompts System
  - Location: `frontend/src/lib/suggested-prompts.ts`
  - 30+ emoji keyword mappings
  - 5 prompts per area (front_yard, back_yard, walkway)
  - Max 3 selections per area
  ```

- [ ] **Add polling strategy**
  ```markdown
  ## Polling Strategy (Feature 005)

  **Location**: `frontend/src/lib/api.ts`

  **Configuration**:
  - Interval: 2 seconds (`POLLING_INTERVAL`)
  - Timeout: 5 minutes (`POLLING_TIMEOUT`)
  - Auto-retry on network errors

  **Usage**:
  ```typescript
  import { pollGenerationStatus } from '@/lib/api';

  const cleanup = pollGenerationStatus(generationId, {
    onProgress: (response) => { /* update UI */ },
    onComplete: (response) => { /* show results */ },
    onError: (error) => { /* show error */ },
    onTimeout: () => { /* handle timeout */ }
  });

  // Cleanup on unmount
  useEffect(() => () => cleanup(), []);
  ```
  ```

- [ ] **Add localStorage recovery**
  ```markdown
  ## Session Recovery (Feature 005)

  **Location**: `frontend/src/lib/localStorage-keys.ts`

  **Storage Keys**:
  - `ACTIVE_REQUEST_ID`: Generation UUID
  - `ACTIVE_REQUEST_AREAS`: Selected areas JSON
  - `ACTIVE_REQUEST_ADDRESS`: Property address

  **Usage**:
  ```typescript
  import {
    saveGenerationToLocalStorage,
    getGenerationFromLocalStorage,
    clearGenerationFromLocalStorage,
  } from '@/lib/localStorage-keys';

  // Save on submit
  saveGenerationToLocalStorage(requestId, areas, address);

  // Recover on mount
  const recovery = getGenerationFromLocalStorage();
  if (recovery.requestId) {
    // Resume polling
  }

  // Clear on completion
  clearGenerationFromLocalStorage();
  ```
  ```

### Update specs/005-port-v2-generation/tasks.md
- [ ] Mark all Phase 1-3 tasks as complete
  ```markdown
  ## Phase 1: Setup (Shared Infrastructure)
  - [x] T001 [P] Create TypeScript types
  - [x] T002 [P] Create suggested prompts data
  - [x] T003 [P] Create localStorage constants

  ## Phase 2: Foundational
  - [x] T004 Refactor Zustand store
  - [x] T005 [P] Extend generation types
  - [x] T006 [P] Add polling helper functions
  - [x] T007 [P] Create emoji mapping utility

  ## Phase 3: US1 + US5 (Priority: P1)
  - [x] T008 [P] [US1] [US5] E2E test for single-page flow
  - [x] T009 [P] [US1] [US5] E2E test for polling
  - [x] T010 [P] [US1] [US5] E2E test for inline results
  - [x] T011 [P] [US1] Create GenerationProgressInline
  - [x] T012 [P] [US1] Create GenerationResultsInline
  - [x] T013 [US5] Implement polling logic
  - [x] T014 [US5] Add polling state management
  - [x] T015 [US1] [US5] Refactor generate.tsx
  - [x] T016 [US1] [US5] Add conditional rendering (progress)
  - [x] T017 [US1] [US5] Add conditional rendering (results)
  - [x] T018 [US1] Add "Start New Generation" button
  - [x] T019 [US5] Add error handling for network
  - [x] T020 [US5] Add timeout handling
  ```

---

## Phase 3: Code Quality

### Add Inline Comments
- [ ] **Polling logic** (`frontend/src/lib/api.ts`)
  ```typescript
  // Complex logic deserves explanation
  // Add comments for:
  // - Why 2-second interval chosen
  // - Why 5-minute timeout
  // - How cleanup works
  // - Edge cases handled
  ```

- [ ] **localStorage recovery** (`frontend/src/lib/localStorage-keys.ts`)
  ```typescript
  // Add comments for:
  // - Storage quota limits
  // - Stale data handling (> 24 hours)
  // - Graceful degradation if unavailable
  ```

- [ ] **Zustand store** (`frontend/src/store/generationStore.ts`)
  ```typescript
  // Add comments for:
  // - Persistence strategy (what persists, what doesn't)
  // - Why certain state is transient
  ```

### TypeScript Strict Check
- [ ] Run type check
  ```bash
  cd frontend && npm run type-check
  ```

- [ ] Fix any errors (target: 0 errors)

### ESLint Check
- [ ] Run linter
  ```bash
  cd frontend && npm run lint
  ```

- [ ] Fix any errors (target: 0 errors)

---

## Phase 4: Performance & Accessibility

### Performance Audit
- [ ] **Test animations on mid-range device**
  - Target: 60 FPS during transitions
  - Tool: Chrome DevTools Performance tab
  - Check: Framer Motion animations don't cause jank

- [ ] **Test polling performance**
  - Verify 2-second intervals don't cause memory leaks
  - Check: Network tab shows requests every 2 seconds
  - Cleanup: Verify polling stops after completion/timeout

- [ ] **Bundle size check**
  ```bash
  cd frontend && npm run build
  # Check output size - should be < 5MB gzipped
  ```

### Accessibility Audit
- [ ] **Keyboard navigation**
  - Tab through entire form
  - Verify focus indicators visible
  - Test Enter key on buttons

- [ ] **Screen reader support**
  - Test with VoiceOver (Mac) or NVDA (Windows)
  - Verify status updates announced
  - Check ARIA labels on progress indicators

- [ ] **Color contrast**
  - Use Chrome DevTools Lighthouse
  - Target: WCAG AA compliance
  - Fix any contrast issues

- [ ] **Focus management**
  - Verify focus moves to progress section when generation starts
  - Verify focus moves to results when complete
  - Test "Start New Generation" returns focus to form

---

## Phase 5: Testing

### E2E Test Execution
- [ ] **Run all generation flow tests**
  ```bash
  cd frontend
  npx playwright test generation-flow-v2.spec.ts --headed
  ```

- [ ] **Verify all tests pass** (6/6 passing)
  - T008: Single-page flow
  - T009: Polling updates
  - T010: Inline results
  - T018: Start new generation
  - T019: Network error handling
  - T020: Timeout handling

- [ ] **Fix any failures** (TDD Green phase)

### Manual Testing
- [ ] **Happy path**
  1. Fill form
  2. Submit generation
  3. Watch progress inline
  4. View results inline
  5. Click "Start New Generation"
  6. Verify form resets

- [ ] **Recovery scenario**
  1. Start generation
  2. Close browser mid-generation
  3. Reopen browser
  4. Verify generation recovers

- [ ] **Error scenario**
  1. Start generation
  2. Disconnect network
  3. Verify error message appears
  4. Reconnect network
  5. Verify auto-retry works

- [ ] **Timeout scenario**
  1. Mock stuck backend (always returns "processing")
  2. Wait 5 minutes
  3. Verify timeout message appears

### Cross-Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Phase 6: Git Housekeeping

### Commit Messages
- [ ] **Review all commits**
  - Ensure descriptive commit messages
  - Follow conventional commits format
  - Squash fixup commits if needed

### Branch Cleanup
- [ ] **Verify branch is up to date with main**
  ```bash
  git checkout 001-data-model
  git pull origin 001-data-model
  git checkout 005-port-v2-generation
  git rebase 001-data-model
  ```

- [ ] **Resolve any conflicts**

### PR Preparation
- [ ] **Update PR description** with:
  - Summary of changes
  - Screenshots/videos of new flow
  - Testing checklist
  - Known issues (if any)

- [ ] **Link to tracking issues**
  - Reference: Feature 005 spec.md
  - Reference: This cleanup checklist

---

## Phase 7: Deployment Verification

### Pre-Deployment Checklist
- [ ] All E2E tests passing
- [ ] Type check passing (0 errors)
- [ ] Build succeeding
- [ ] Lint passing (0 errors)
- [ ] Manual testing complete
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Accessibility verified

### Post-Deployment Monitoring
- [ ] **Monitor Vercel deployment logs**
  - Check for runtime errors
  - Verify no console errors

- [ ] **Monitor backend logs**
  - Check polling load
  - Verify no 5xx errors

- [ ] **User testing**
  - Test with real users
  - Collect feedback
  - Log any issues

---

## Rollback Plan

### If Critical Issues Found
1. **Immediate rollback**
   ```bash
   git checkout 001-data-model
   git push origin 001-data-model --force
   ```

2. **Restore old generate page**
   ```bash
   mv frontend/src/pages/generate-old-backup.tsx frontend/src/pages/generate.tsx
   git add frontend/src/pages/generate.tsx
   git commit -m "rollback: Restore old generate page"
   git push
   ```

3. **Document issues**
   - Create GitHub issue with:
     - Steps to reproduce
     - Expected vs actual behavior
     - Screenshots/logs
     - Environment details

4. **Fix in new branch**
   - Create hotfix branch
   - Fix issues
   - Re-test thoroughly
   - Deploy when stable

---

## Success Criteria

### Definition of Done
- [x] All Phase 1-3 tasks complete
- [ ] All E2E tests passing (6/6)
- [ ] Type check passing (0 errors)
- [ ] Build succeeding
- [ ] Lint passing (0 errors)
- [ ] Documentation updated (CLAUDE.md, tasks.md)
- [ ] Code reviewed and approved
- [ ] Manual testing complete (all scenarios)
- [ ] Accessibility verified (WCAG AA)
- [ ] Performance verified (60 FPS, no leaks)
- [ ] Deployed to preview environment
- [ ] Preview environment tested
- [ ] Ready for production deployment

### Post-Launch Metrics
- **Adoption**: % of generations using new flow
- **Success Rate**: % of generations completing successfully
- **Recovery Rate**: % of interrupted generations recovering
- **Performance**: Average generation time
- **Errors**: Rate of network errors, timeouts
- **User Feedback**: Qualitative feedback on new UX

---

**Last Updated**: 2025-11-07 04:15 UTC
**Status**: Ready for execution
**Estimated Time**: 3-4 hours for complete cleanup
