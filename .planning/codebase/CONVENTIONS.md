# Coding Conventions

**Analysis Date:** 2026-02-08

## Naming Patterns

**Files:**
- Components: PascalCase with .jsx extension (e.g., `LinearCalendar.jsx`, `MetricsTab.js`)
- Utilities: camelCase with .js extension (e.g., `dateUtils.js`, `eventUtils.js`)
- Services: camelCase with Service suffix (e.g., `eventService.js`, `authService.js`)
- Constants: camelCase (e.g., `config.js`, `themes.js`)
- Test files: Paired with source file using .test.js suffix (e.g., `App.test.js`, `metricsCalculations.test.js`)

**Functions:**
- camelCase for all functions and arrow functions
- Named exports preferred for utility functions
- Example from `dateUtils.js`: `toLocalDateTimeString`, `getWeekNumber`, `eventsOverlap`
- Async functions: `loadEvents`, `createEvent`, `signInWithGoogle` - use verb prefixes

**Variables:**
- camelCase for all variable declarations
- camelCase for state variables and hooks (e.g., `currentYear`, `setCurrentYear`)
- PascalCase only for React components and classes (e.g., `LinearCalendar`, `ErrorBoundary`)
- Boolean variables: use prefix `is`, `has` (e.g., `isWeekend`, `isToday`, `deleted`)

**Constants:**
- UPPER_SNAKE_CASE for exported constants
- Grouped in dedicated constant files: `src/constants/`
- Examples: `PALETTE`, `THEMES`, `DEFAULT_TAGS`, `TIMER_PRESETS`, `FOCUS_MODES`

**Types:**
- No TypeScript in use; documentation via JSDoc comments instead
- Use object property naming conventions: camelCase (e.g., `tagId`, `bgColor`, `textColor`)
- Database fields use snake_case (e.g., `tag_id`, `bg_color`, `text_color`) with transformation to camelCase in app code

## Code Style

**Formatting:**
- No explicit prettier/ESLint config files detected; uses create-react-app defaults
- Indentation: 2 spaces (React scripts standard)
- Line length: No strict limit enforced

**Linting:**
- ESLint configured via `package.json` extending `react-app` and `react-app/jest`
- Uses React-specific rules from create-react-app

## Import Organization

**Order:**
1. React and core dependencies (React, ReactDOM, hooks)
2. Third-party libraries (date-fns, uuid, recharts, @visx/*, lucide-react)
3. Supabase client imports
4. Internal service imports
5. Utility function imports
6. Constant imports
7. Component imports
8. CSS imports (last)

**Example from `src/App.js`:**
```javascript
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Routes, Route } from "react-router-dom";
import { toLocalDateTimeString, getWeekNumber, eventsOverlap, findConflicts, getTagIcon } from "./utils";
import { signInWithGoogle, signInWithEmail, signUpWithEmail, signOut } from "./services/authService";
import { PALETTE, THEMES, MOTIVATIONAL_QUOTES, DEFAULT_TAGS } from "./constants";
import { InsightsDashboard } from './components/InsightsDashboard';
import './App.css';
```

**Path Aliases:**
- No path aliases configured
- Uses relative imports (e.g., `../supabaseClient`, `./utils`)
- Features organized by domain: `src/features/auth/`, `src/features/events/`, `src/features/analytics/`

## Error Handling

**Patterns:**
- Try-catch blocks standard in async functions
- All service functions return `{ data, error }` tuple pattern
- Example from `eventService.js`:
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

- Error propagation: Errors returned in tuple rather than thrown
- Graceful degradation: Services return empty arrays on error to keep app functional
- ErrorBoundary class component (in `src/App.js` lines 77-90) wraps entire app to catch React rendering errors

## Logging

**Framework:** `console` (native browser API)

**Patterns:**
- Functional logging with prefixes for categorization
- Example: `console.log('[Auth] Starting Google sign-in...')`, `console.error('[Auth] Sign-in error:', error)`
- Logging locations:
  - Service functions in `src/services/authService.js`, `src/services/eventService.js` log on entry and error
  - Error handling logs error objects with context
  - Development-only instrumentation (agentLoop, runtimeGuards) uses conditional logging

**Levels used:**
- `console.log()`: Informational messages, especially in auth flow (prefixed with `[Auth]`, `[Instrumentation]`)
- `console.error()`: Error conditions from Supabase, auth, and operations
- No `console.warn()` or `console.debug()` detected

## Comments

**When to Comment:**
- JSDoc comments on all exported functions and utility functions
- Inline comments for complex logic or non-obvious decisions
- Comments in Todo items marking future improvements (prefixed with `//TODO:`)

**JSDoc/TSDoc:**
- Used extensively in utility functions and services
- Standard JSDoc format with `@param` and `@returns`
- Example from `dateUtils.js`:
```javascript
/**
 * Format date for datetime-local input (avoids UTC conversion issues)
 * @param {Date|string|number} date - The date to format
 * @returns {string} Date string in format YYYY-MM-DDTHH:mm
 */
export const toLocalDateTimeString = (date) => { ... };
```

- Service functions document parameters and return types
- Not all functions have JSDoc (inconsistent in event handling and components)

## Function Design

**Size:**
- Utility functions are small, focused, and single-purpose (10-40 lines typically)
- Service functions handle database operations and return tuple patterns (30-80 lines)
- Component functions can be larger (100-300+ lines for complex UIs like App.js which is 400KB+)

**Parameters:**
- Utility functions take simple scalar parameters and objects
- Service functions take userId as first parameter, data object as second
- Arrow functions preferred for new code
- Class methods use `this` binding for React lifecycle components

**Return Values:**
- Service functions: Always return `{ data, error }` tuple
- Utility functions: Return computed value or boolean
- Promise-based: Services are async and return promises
- React components: Return JSX

## Module Design

**Exports:**
- Named exports preferred for utility functions and services
- Default exports used for React components (e.g., `export default App`)
- Constants exported as named exports from barrel file `src/constants/index.js`

**Barrel Files:**
- `src/constants/index.js` re-exports: `PALETTE`, `THEMES`, `MOTIVATIONAL_QUOTES`, `DEFAULT_TAGS`, `AVAILABLE_ICONS`, `FOCUS_MODES`, `TIMER_COLORS`, `TIMER_ICONS`, `TIMER_PRESETS`, `LAYOUT`
- `src/utils/index.js` re-exports utility functions (partial)
- `src/features/analytics/charts/index.js` uses lazy imports for chart components

**Imports:**
- Relative path imports used throughout (no path aliases)
- Features organized by domain:
  - `src/features/auth/` - auth-related services
  - `src/features/events/` - event and tag services
  - `src/features/analytics/` - metrics and telemetry
  - `src/features/subscription/` - subscription management

---

*Convention analysis: 2026-02-08*
