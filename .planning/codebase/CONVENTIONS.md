# Coding Conventions

**Analysis Date:** 2026-01-25

## Naming Patterns

**Files:**
- Components: PascalCase with .jsx extension (e.g., `LinearCalendar.jsx`)
- Services: camelCase with descriptive names (e.g., `eventService.js`, `authService.js`)
- Utilities: camelCase with focused purpose (e.g., `dateUtils.js`, `eventUtils.js`)
- Constants: UPPER_SNAKE_CASE exported from index files (e.g., `PALETTE`, `THEMES`, `DEFAULT_TAGS`)
- Tests: .test.js or .spec.js suffix (e.g., `App.test.js`, `performance.test.js`)
- Pages: PascalCase for page components (e.g., `PrivacyPolicy.js`, `TermsOfService.js`)

**Functions:**
- Public exported functions: camelCase (e.g., `signInWithGoogle`, `loadEvents`, `toLocalDateTimeString`)
- Private/internal functions: camelCase prefixed with underscore or inside service scope (e.g., `_getConflicts`)
- Async functions: conventional camelCase, returns Promise (e.g., `loadEvents`, `createEvent`, `signOut`)
- Query/getter functions: use `get` or `load` prefix (e.g., `getTagIcon`, `loadEvents`)
- Event handler functions: use `handle` prefix (e.g., `handleClick`, `handleChange`)
- State setter callbacks: use `go` prefix for navigation (e.g., `goToPrevYear`, `goToNextYear`)

**Variables:**
- Regular variables: camelCase (e.g., `currentYear`, `startDate`, `eventCount`)
- Boolean variables: use prefix `is`, `has`, `can`, `should` (e.g., `isWeekend`, `hasError`, `deleted`)
- Constants: UPPER_SNAKE_CASE (e.g., `TIMER_COLORS`, `DEFAULT_TAGS`, `AVAILABLE_ICONS`)
- DOM elements: descriptive camelCase ending with `Element` or `Ref` (e.g., `containerElement`, `timeRef`)
- Event objects: convention prefix with `e` or full name like `event` (e.g., `event`, `error`)

**Types/Interfaces:**
- Objects returned from services: simple lowercase (e.g., `data`, `error`)
- Event data structures: match Supabase schema naming with snake_case for database fields (e.g., `start_time`, `end_time`, `created_at`)
- API responses: destructured as `{ data, error }` pattern
- React props: PascalCase for component names, properties use camelCase

## Code Style

**Formatting:**
- React Scripts 5.0.1 includes built-in ESLint configuration
- Extended configurations: `"react-app"` and `"react-app/jest"`
- No explicit .prettierrc file - uses React Scripts defaults
- Indentation: 2 spaces (standard React Scripts)
- Line length: pragmatic (files show long lines in data structures are acceptable)
- Quotes: both single and double quotes used; single quotes preferred in most JS files

**Linting:**
- ESLint configured via `package.json` eslintConfig
- Extends `react-app` preset which includes React best practices
- Extends `react-app/jest` for test-specific linting
- Built-in rules: no explicit rules configuration beyond presets
- No .eslintrc file at project root - relies on React Scripts built-in config

**Import Organization:**
Order (observed in codebase):
1. React and React-DOM imports
2. Third-party libraries (date-fns, uuid, lucide-react, d3)
3. Testing utilities (@testing-library/react, etc.)
4. Project constants (from `./constants` or `./constants/index`)
5. Project utilities (from `./utils` or `./utils/index`)
6. Project services (from `./services/*`)
7. Components (from `./components/*`)
8. CSS files (from `./components/*.css` or `./App.css`)

**Path Aliases:**
Not explicitly used. Project uses relative paths throughout (e.g., `../utils`, `../services`, `../constants`). No jsconfig.json or path mapping observed.

## Error Handling

**Patterns:**
- Try-catch blocks with async/await pattern used throughout services
- Error returns: `{ data, error }` object pattern for consistency
- Supabase query errors checked with `if (error)` pattern
- Logging on error: `console.error()` with descriptive message and context
- Error propagation: caught errors logged and wrapped in return object
- Validation: explicit checks with descriptive error messages (e.g., `throw new Error('Event title is required')`)
- Example from `eventService.js`:
  ```javascript
  export const createEvent = async (userId, eventData) => {
    try {
      if (!eventData.title || !eventData.title.trim()) {
        throw new Error('Event title is required');
      }
      // operation...
      return { data, error: null };
    } catch (error) {
      console.error('Error creating event:', error);
      return { data: null, error };
    }
  };
  ```

**Error Boundary:** React Error Boundary class component in `App.js` catches component render errors. See `App.js` line 58-100+ for implementation pattern.

## Logging

**Framework:** Native `console` object exclusively

**Patterns:**
- `console.log()`: information logging, progress tracking
- `console.error()`: error logging with context
- `console.warn()`: warning conditions (e.g., user record not found)
- Context prefix used: `[Auth]`, `[API]` style prefixes for console log organization (e.g., `console.log('[Auth] Starting Google sign-in...')`)
- Usage in services: all async operations log start and completion
- Example from `authService.js`:
  ```javascript
  console.log('[Auth] Starting Google sign-in...');
  if (error) {
    console.error('[Auth] Sign-in error:', error);
    throw error;
  }
  ```

**Instrumentation:** Custom instrumentation module in `src/utils/instrumentation.js` for performance metrics and analysis cycles.

## Comments

**When to Comment:**
- File headers: JSDoc-style comments explaining module purpose (seen in performance.test.js, dateUtils.js)
- Function documentation: JSDoc format with @param and @returns
- Complex logic: inline comments explaining non-obvious algorithms or workarounds
- TODOs: occasional TODO comments for future improvements (e.g., in performance.test.js line 126-130)
- Database constraints: comments explaining rationale for design choices

**JSDoc/TSDoc:**
- Used selectively for public functions and utilities
- Format: standard JSDoc with @param, @returns, @description
- Example from `dateUtils.js`:
  ```javascript
  /**
   * Format date for datetime-local input (avoids UTC conversion issues)
   * @param {Date|string|number} date - The date to format
   * @returns {string} Date string in format YYYY-MM-DDTHH:mm
   */
  export const toLocalDateTimeString = (date) => {
  ```
- No type annotations (pure JavaScript, not TypeScript)

## Function Design

**Size:** Functions are pragmatic in size. Main App.js is 400KB+ indicating large component with many features bundled. Services isolate business logic by domain (events, auth, tags).

**Parameters:**
- Async service functions: accept userId as first parameter, then operation-specific data
- Utility functions: accept specific required data (event1, event2)
- Event handlers: accept event object implicitly or explicitly as parameter
- React components: use props object, sometimes destructured in parameters

**Return Values:**
- Async service calls: return `{ data, error }` object for consistent error handling
- Utility functions: return primitive or specific data type
- React components: return JSX
- Void functions: side effects only (navigation, state updates)

## Module Design

**Exports:**
- Services: individual named exports per function (e.g., `export const loadEvents = async (userId) => {...}`)
- Utilities: individual named exports per function
- Constants: large objects exported and re-exported through barrel file
- Barrel files: used extensively for organizing constants (`src/constants/index.js`) and utilities (`src/utils/index.js`)

**Barrel Files:**
- Located at `src/constants/index.js` - exports all constant groups
- Located at `src/utils/index.js` - exports utility functions
- Pattern: allows clean imports like `import { toLocalDateTimeString } from './utils'`
- `src/constants/index.js` example:
  ```javascript
  // Barrel export for all constants
  export { PALETTE, THEMES } from './themes';
  export { MOTIVATIONAL_QUOTES } from './quotes';
  export { DEFAULT_TAGS, AVAILABLE_ICONS } from './tags';
  export { FOCUS_MODES, TIMER_COLORS, TIMER_ICONS, TIMER_PRESETS } from './config';
  export { LAYOUT } from './layout';
  ```

---

*Convention analysis: 2026-01-25*
