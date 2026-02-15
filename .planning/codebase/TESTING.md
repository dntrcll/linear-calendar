# Testing Patterns

**Analysis Date:** 2026-02-08

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
- Co-located with source files: `src/App.test.js` alongside `src/App.js`
- Separate test directory: `tests/` directory at project root for custom test runners
- Pattern: `.test.js` suffix for Jest-discovered tests, custom test files in `tests/` directory

**Naming:**
- `.test.js` extension for Jest-picked-up tests (e.g., `App.test.js`)
- `.spec.js` not used in current codebase
- Custom test runners: descriptive names (e.g., `performance.test.js`, `metricsCalculations.test.js`)

**Structure:**
```
src/
├── App.test.js          # Tests for App.js
└── setupTests.js        # Jest setup file - imports @testing-library/jest-dom

tests/
├── performance.test.js  # Performance test suite with mock data generation
├── metricsCalculations.test.js  # Unit tests for metrics calculations
└── run-performance-tests.js  # Custom Node.js performance test runner
```

## Test Structure

**Suite Organization:**

Unit test example from `tests/metricsCalculations.test.js`:
```javascript
import {
  calculateProductivityScore,
  calculateFocusTime,
  calculateContextSwitches,
  calculateGoalCompletionRate
} from '../src/utils/metricsCalculations';

describe('calculateProductivityScore', () => {
  test('returns 0 for no tracked time', () => {
    const result = calculateProductivityScore({
      focusTimeMinutes: 0,
      goalCompletionRate: 0,
      contextSwitches: 0,
      totalTrackedMinutes: 0
    });
    expect(result).toBe(0);
  });

  test('returns 100 for perfect inputs', () => {
    const result = calculateProductivityScore({
      focusTimeMinutes: 480,
      goalCompletionRate: 100,
      contextSwitches: 0,
      totalTrackedMinutes: 480
    });
    expect(result).toBe(100);
  });
});
```

**Patterns:**
- Setup: `src/setupTests.js` imports `@testing-library/jest-dom`
- Test definition: `describe()` for grouping related tests, `test()` for individual assertions
- Rendering: `render()` function from @testing-library/react (used in App.test.js)
- Selection: `screen.getByText()` and similar query utilities from @testing-library
- Assertion: `expect()` with jest-dom matchers (toBeInTheDocument, toBe, toBeGreaterThan, etc.)

## Mocking

**Framework:** Jest built-in mocking (jest.fn(), jest.mock())

**Patterns:**

Service function mocking for Supabase operations:
```javascript
// Pattern not yet implemented but should follow:
jest.mock('../supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: [], error: null }))
    }))
  }
}));
```

Mock data generation pattern from `tests/performance.test.js`:
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

**What to Mock:**
- External API calls (Supabase auth, database operations)
- Third-party services (Google OAuth)
- Browser APIs that don't exist in test environment (window.matchMedia)
- Date/time for consistent testing (use jest.useFakeTimers())

**What NOT to Mock:**
- React component rendering (use render() instead)
- User interactions (use @testing-library/user-event)
- Utility functions in the same module
- Business logic you want to validate

## Fixtures and Factories

**Test Data:**

Performance test demonstrates factory pattern:
```javascript
const generateMockEvents = (count) => {
  const events = [];
  // ... generates count events with realistic structure
  return events;
};

const measureEventProcessing = (events) => {
  const startTime = performance.now();
  // Filter, sort, detect conflicts
  const endTime = performance.now();
  return {
    duration: endTime - startTime,
    eventCount: events.length,
    filteredCount: filtered.length,
    conflictCount: conflicts.length
  };
};
```

**Location:**
- No dedicated factory directory; factories defined inline in test files
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
- Current example: `tests/metricsCalculations.test.js` tests pure utility functions
- Test cases include:
  - Edge cases (empty input, zero values)
  - Normal operation (valid inputs)
  - Boundary conditions (max/min values)
  - Side effects (state changes, penalties)

Example from `tests/metricsCalculations.test.js`:
```javascript
describe('calculateFocusTime', () => {
  test('returns 0 for empty events', () => {
    expect(calculateFocusTime([])).toBe(0);
  });

  test('sums duration of focus categories', () => {
    const events = [
      { category: 'work', duration: 60 },
      { category: 'deep-work', duration: 120 }
    ];
    expect(calculateFocusTime(events)).toBe(180);
  });
});
```

**Integration Tests:**
- Scope: multiple modules interacting
- Approach: Set up realistic scenarios with mock data
- Current example: Performance tests measure full event processing pipeline:
  ```javascript
  const measureEventProcessing = (events) => {
    const startTime = performance.now();
    const filtered = events.filter(e => !e.deleted);
    const sorted = [...filtered].sort((a, b) =>
      new Date(a.start).getTime() - new Date(b.start).getTime()
    );
    // ... conflict detection (O(n²) algorithm)
    const endTime = performance.now();
    return { duration: endTime - startTime, conflictCount: conflicts.length };
  };
  ```

**E2E Tests:**
- Framework: Not used
- Pattern: No Cypress, Playwright, or Webdriver configuration
- Opportunity: Could add for user workflows

**Performance Tests:**
- Framework: Custom Node.js script (not Jest)
- Location: `tests/performance.test.js` and `tests/run-performance-tests.js`
- Execution: `npm run test:perf` via Node
- Metrics measured:
  - Generation time: how long to create mock events
  - Processing time: filtering, sorting, conflict detection
  - Conflicts: number of overlapping events detected
  - Per-event overhead in milliseconds
- Thresholds:
  - Total time > 1s: flagged as warning
  - Per-event overhead > 0.1ms: flagged as warning
  - Total time > 5s: hard failure (exit code 1)

## Common Patterns

**Async Testing:**

React hook pattern in components:
```javascript
// From App.js
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

Service error handling pattern from `src/services/eventService.js`:
```javascript
export const loadEvents = async (userId) => {
  try {
    const [eventsResult, tagsResult] = await Promise.all([...]);
    if (eventsResult.error) {
      console.error('Supabase events query error:', eventsResult.error);
      return { data: [], error: eventsResult.error };
    }
    return { data: events, error: null };
  } catch (error) {
    console.error('Error loading events:', error);
    return { data: [], error };
  }
};
```

Test error scenario:
```javascript
test('returns error tuple when load fails', async () => {
  // Mock Supabase to return error
  jest.spyOn(supabase, 'from').mockReturnValue({
    select: jest.fn().mockResolvedValue({
      data: null,
      error: new Error('DB connection failed')
    })
  });

  const { data, error } = await loadEvents('user-123');
  expect(error).toBeDefined();
  expect(data).toEqual([]);
});
```

## Test Gaps

**Current Coverage:**
- Minimal unit tests: Only `tests/metricsCalculations.test.js` and `src/App.test.js`
- Performance tests exist but in custom Node.js format, not Jest
- No E2E tests or service integration tests

**Recommended Areas to Add Tests:**
- Service functions in `src/services/`: eventService.js, authService.js, tagService.js (complex business logic)
- Utility functions: `src/utils/eventUtils.js`, `src/utils/dateUtils.js` (pure functions, easy to test)
- Component logic: Calendar rendering, event display, tag management, MetricsTab
- Error scenarios: Invalid data, auth failures, database errors
- Integration: Event creation → display → conflict detection flow

---

*Testing analysis: 2026-02-08*
