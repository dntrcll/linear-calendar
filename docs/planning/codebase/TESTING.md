# Testing Patterns

**Analysis Date:** 2026-01-25

## Test Framework

**Runner:**
- Jest via React Scripts 5.0.1
- Jest integrated into `react-scripts` package
- Configuration: defined implicitly through React Scripts; no explicit jest.config.js file

**Assertion Library:**
- @testing-library/jest-dom (version ^6.9.1)
- Provides custom matchers like `toBeInTheDocument()`

**Related Testing Libraries:**
- @testing-library/react (version ^16.3.1) - React component testing utilities
- @testing-library/user-event (version ^13.5.0) - User interaction simulation
- @testing-library/dom (version ^10.4.1) - DOM testing utilities

**Run Commands:**
```bash
npm test                 # Run all tests in watch mode
npm run test:perf        # Run performance test suite (node tests/run-performance-tests.js)
```

## Test File Organization

**Location:**
- Co-located with source files: `src/App.test.js` sits alongside `src/App.js`
- Separate test directory: `tests/` directory at project root for custom test runners
- Pattern: `.test.js` suffix for Jest-discovered tests, custom test files in `tests/` directory

**Naming:**
- `.test.js` extension for Jest-picked-up tests (e.g., `App.test.js`)
- `.spec.js` not used in current codebase
- Custom test runners: descriptive names (e.g., `performance.test.js`, `run-performance-tests.js`)

**Structure:**
```
src/
├── App.test.js          # Tests for App.js
└── setupTests.js        # Jest setup file

tests/
├── performance.test.js  # Performance test suite
└── run-performance-tests.js  # Performance test runner
```

## Test Structure

**Suite Organization:**
```javascript
// From App.test.js - minimal test structure
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
```

**Patterns:**
- Setup: `src/setupTests.js` imports `@testing-library/jest-dom` (provides custom matchers)
- Test definition: `test()` or `it()` with description string and test function
- Rendering: `render()` function from @testing-library/react
- Selection: `screen.getByText()`, similar query utilities from @testing-library
- Assertion: `expect()` with jest-dom matchers

## Mocking

**Framework:** Jest built-in mocking (jest.fn(), jest.mock())

**Patterns:**
Not extensively demonstrated in current test files. Opportunity exists:
- Supabase client could be mocked in service tests
- Google OAuth could be mocked in auth tests
- Performance tests generate mock data instead:
  ```javascript
  const generateMockEvents = (count) => {
    const events = [];
    const startDate = new Date('2024-01-01');
    // ... generate synthetic event data
    return events;
  };
  ```

**What to Mock:**
- External API calls (Supabase auth, database operations)
- Third-party services (Google OAuth, etc.)
- Browser APIs that don't exist in test environment (window.matchMedia, etc.)
- Date/time for consistent testing (use jest.useFakeTimers())

**What NOT to Mock:**
- React component rendering (use render() instead)
- User interactions (use @testing-library/user-event)
- Utility functions in the same module
- Business logic you want to validate

## Fixtures and Factories

**Test Data:**
Performance test suite demonstrates data generation:
```javascript
const generateMockEvents = (count) => {
  const events = [];
  const startDate = new Date('2024-01-01');
  const contexts = ['personal', 'family'];
  const categories = ['work', 'health', 'social', 'learning', 'other'];

  for (let i = 0; i < count; i++) {
    const start = new Date(startDate.getTime() + (i * 3600000)); // 1 hour apart
    const end = new Date(start.getTime() + 1800000); // 30 min duration

    events.push({
      id: `event-${i}`,
      title: `Event ${i}`,
      description: `Description for event ${i}`,
      location: i % 5 === 0 ? `Location ${i}` : '',
      category: categories[i % categories.length],
      context: contexts[i % contexts.length],
      start: start.toISOString(),
      end: end.toISOString(),
      deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  return events;
};
```

**Location:**
- No dedicated factory directory; factories are defined inline in test files
- Performance test suite includes factory functions at module level (`tests/performance.test.js`)
- Mock data generation: embedded in test function, not separated into dedicated files

## Coverage

**Requirements:** Not detected in codebase. No coverage configuration or thresholds enforced.

**View Coverage:**
```bash
npm test -- --coverage
```
(Standard Jest command; no custom script defined)

## Test Types

**Unit Tests:**
- Scope: individual functions and components
- Approach: Render component or call function in isolation
- Current example: `App.test.js` tests that App component renders
- Service tests: opportunities exist but not yet implemented for event/auth/tag services

**Integration Tests:**
- Scope: multiple modules interacting
- Approach: Set up realistic scenarios with mock data
- Current example: Performance tests measure full event processing pipeline
  ```javascript
  const measureEventProcessing = (events) => {
    const startTime = performance.now();
    const filtered = events.filter(e => !e.deleted);
    const sorted = [...filtered].sort((a, b) =>
      new Date(a.start).getTime() - new Date(b.start).getTime()
    );
    // ... conflict detection
    const endTime = performance.now();
    return { duration: endTime - startTime, ... };
  };
  ```

**E2E Tests:**
- Framework: Not used
- Pattern: No Cypress, Playwright, or Webdriver configuration
- Opportunity: Could add for user workflows like create-event-check-conflicts

**Performance Tests:**
- Framework: Custom Node.js script
- Location: `tests/performance.test.js` and `tests/run-performance-tests.js`
- Execution: `npm run test:perf` via Node (not Jest)
- Metrics measured:
  - Generation time: how long to create mock events
  - Processing time: filtering, sorting, conflict detection
  - Conflicts: number of overlapping events detected
- Thresholds:
  - Total time > 1s: flagged as warning
  - Per-event overhead > 0.1ms: flagged as warning
  - Total time > 5s: hard failure (exit code 1)
- Example output from `performance.test.js`:
  ```
  Testing 100 events...
    Generation: 0.50ms
    Processing: 2.15ms
    Conflicts: 5

  === SUMMARY ===
  100 events:
    Total time: 2.65ms
    Avg time per event: 0.0265ms
  ```

## Common Patterns

**Async Testing:**
```javascript
// App.js shows async operations in useEffect
useEffect(() => {
  const loadData = async () => {
    try {
      const { data, error } = await loadEvents(userId);
      if (error) {
        setError(error);
      } else {
        setEvents(data);
      }
    } catch (err) {
      setError(err);
    }
  };

  if (userId) {
    loadData();
  }
}, [userId]);
```

Testing async operations with React Testing Library:
- Wrap renders in `waitFor()` for state updates after async completion
- Use `screen.findBy*` queries (automatically wait for element)
- Example pattern:
  ```javascript
  test('loads events on mount', async () => {
    render(<App userId="test-user" />);
    const eventElement = await screen.findByText(/Event 1/i);
    expect(eventElement).toBeInTheDocument();
  });
  ```

**Error Testing:**
```javascript
// Service pattern for error handling
export const loadEvents = async (userId) => {
  try {
    // operation
    return { data: events, error: null };
  } catch (error) {
    console.error('Error loading events:', error);
    return { data: [], error };
  }
};

// Test error scenario
test('returns error when load fails', async () => {
  // Mock Supabase to throw
  jest.spyOn(supabase, 'from').mockImplementation(() => ({
    select: () => ({
      then: () => Promise.reject(new Error('DB error'))
    })
  }));

  const { data, error } = await loadEvents('user-123');
  expect(error).toBeDefined();
  expect(data).toEqual([]);
});
```

## Test Gaps

**Current Coverage:**
- Minimal: Only App.test.js exists with basic render test
- Performance tests exist but in custom Node.js format, not Jest

**Recommended Areas to Add Tests:**
- Service functions: `eventService.js`, `authService.js`, `tagService.js` (complex business logic)
- Utility functions: `eventUtils.js`, `dateUtils.js` (pure functions, easy to test)
- Component logic: Calendar rendering, event display, tag management
- Error scenarios: Invalid data, auth failures, database errors
- Integration: Event creation -> display -> conflict detection flow

---

*Testing analysis: 2026-01-25*
