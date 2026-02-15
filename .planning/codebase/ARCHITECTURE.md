# Architecture

**Analysis Date:** 2026-02-08

## Pattern Overview

**Overall:** Layered React SPA (Single Page Application) with Supabase backend

**Key Characteristics:**
- Monolithic container component (`src/App.js`) managing global application state
- Service-oriented data layer abstracting Supabase operations
- Feature-driven service modules organized by domain (auth, events, analytics, subscription)
- Utility layer with pure domain-logic functions
- Constants layer providing configuration and static data
- React Router for simple page routing (Privacy, Terms)
- Material Design inspired with premium dark/light themes

## Layers

**Presentation Layer:**
- Purpose: Render UI components and handle user interactions
- Location: `src/components/`, `src/pages/`
- Contains: React components (class ErrorBoundary, functional components), inline CSS styling
- Depends on: Utils layer (date formatting, event calculations), Constants layer (themes, icons, data), Service layer (data loading)
- Used by: App.js renders all presentational components
- Key files: `src/components/LinearCalendar.jsx` (calendar grid), `src/components/InsightsDashboard.js` (metrics), `src/components/MetricsTab.js` (analytics), `src/components/TelemetryPage.js` (usage tracking)

**Container/State Layer:**
- Purpose: Manage application state, coordinate between services and UI components
- Location: `src/App.js` (10,943 lines - monolithic)
- Contains: React hooks (useState, useEffect, useRef, useCallback, useMemo), ErrorBoundary class, authentication orchestration, theme management, modal state
- Depends on: Service layer (authService, eventService, tagService, subscriptionService), Instrumentation utils, Constants
- Used by: index.js entry point, wraps all presentational components
- State managed:
  - Authentication: `user`, `session`, `isAuthModalOpen`
  - Data: `events`, `deletedEvents`, `tags`, `goals`
  - UI: `viewMode` (year/week/day), `currentDate`, `selectedEvent`, `modalOpen`, `settingsOpen`
  - Theme: `currentTheme`, `accentColor`, `customTheme`
  - Subscription: `subscription`, `trial status`
  - Filters: `context` (personal/work), `dateFilter`, `searchQuery`

**Feature Service Layer:**
- Purpose: Abstract Supabase and external API interactions per feature domain
- Location: `src/services/` and `src/features/*/`
- Contains:
  - **`src/services/authService.js`** or `src/features/auth/authService.js` - Google OAuth (PKCE flow), email auth, session management, user record creation
  - **`src/services/eventService.js`** or `src/features/events/eventService.js` - Event CRUD (create, read, update, delete, restore), recurring instance generation, tag mapping
  - **`src/services/tagService.js`** or `src/features/events/tagService.js` - Tag/category CRUD, default tag initialization
  - **`src/services/subscriptionService.js`** or `src/features/subscription/subscriptionService.js` - Subscription status, trial management, feature access control
  - **`src/services/metricsService.js`** - Metrics data queries and aggregation
  - **`src/services/telemetryService.js`** - Usage event tracking
  - **`src/services/productivityMetricsService.js`** - Productivity score calculations
- Depends on: `supabaseClient.js` (Supabase instance), uses `{ data, error }` tuple pattern
- Used by: App.js calls these on mount and during user actions
- Error Handling Pattern: All functions return `{ data, error }` structure with console.error prefixes like `[Auth]`, `[Event]`

**Utility/Domain Logic Layer:**
- Purpose: Pure functions for business logic, calculations, and data transformations
- Location: `src/utils/`, `src/features/*/eventUtils.js`
- Contains:
  - **`src/utils/dateUtils.js`** - Date formatting (`toLocalDateTimeString()`), week number calculation (`getWeekNumber()`)
  - **`src/utils/eventUtils.js`** - Event overlap detection (`eventsOverlap()`), conflict finding (`findConflicts()`)
  - **`src/utils/tagUtils.js`** - Tag icon retrieval (`getTagIcon()`)
  - **`src/utils/metricsCalculations.js`** - Productivity score, focus time, context switches, goal completion rate
  - **`src/utils/instrumentation.js`** - Performance monitoring (`recordPerformance()`, `runAllGuards()`), runtime guards, analysis cycle
  - **`src/utils/agentLoop.js`** - Agent-based processing loop
  - **`src/utils/debugConsole.js`** - Debug output utilities
  - **`src/utils/runtimeGuards.js`** - Runtime type validation and guards
  - **`src/utils/index.js`** - Barrel export of utilities
- Depends on: External libraries (date-fns), Constants
- Used by: App.js, services, components
- Key Pattern: Pure functions with no side effects (except instrumentation), easily testable

**Constants/Configuration Layer:**
- Purpose: Define static configuration, themes, and domain data
- Location: `src/constants/`
- Contains:
  - **`src/constants/themes.js`** - 9 premium themes (Jade, Sapphire, Coral, Midnight, etc.), PALETTE object, color definitions
  - **`src/constants/config.js`** - FOCUS_MODES, TIMER_PRESETS, TIMER_COLORS, TIMER_ICONS
  - **`src/constants/tags.js`** - DEFAULT_TAGS, AVAILABLE_ICONS, tag categories
  - **`src/constants/quotes.js`** - 365+ motivational quotes with authors
  - **`src/constants/layout.js`** - Layout constants, spacing, dimensions
  - **`src/constants/icons.js`** - 16KB SVG icon library
  - **`src/constants/index.js`** - Barrel export of all constants
- Depends on: None
- Used by: App.js, Services, Components for styling and configuration
- Access Pattern: Destructure from barrel export: `import { THEMES, PALETTE } from './constants'`

**Integration Layer:**
- Purpose: Initialize and manage external service connections
- Location: `src/supabaseClient.js`
- Contains: Supabase client initialization with auth configuration
- Configuration:
  - PKCE flow for secure OAuth
  - Session persistence in localStorage (key: `timeline-auth`)
  - Auto-refresh token enabled
  - Custom storage key for auth session
- Depends on: External library (`@supabase/supabase-js`)
- Used by: All service layer files for database operations

**Analytics/Instrumentation Layer:**
- Purpose: Track performance and runtime behavior
- Location: `src/utils/instrumentation.js`, `src/features/analytics/`
- Contains: Performance metrics collection, guard execution, analysis cycles
- Pattern: Non-blocking async operations, minimal impact on UX

## Data Flow

**Authentication Flow:**
```
1. User clicks "Sign In with Google" button (in App.js UI)
   ↓
2. signInWithGoogle() from authService.js invokes Supabase OAuth
   ↓
3. User authenticates with Google in popup/redirect
   ↓
4. Redirect back to app (http://localhost:3000/)
   ↓
5. onAuthStateChange() listener fires with authenticated event
   ↓
6. Get user profile and create/update user record in database
   ↓
7. Session stored in localStorage with key 'timeline-auth'
   ↓
8. App component receives session → setUser(user) → UI re-renders with authenticated state
```

**Event Load & Display Flow:**
```
1. App.js mounts, useEffect fires
   ↓
2. loadEvents(userId) called from eventService.js
   ↓
3. Service queries Supabase 'events' table:
   - Filters by user_id
   - Orders by start_time ascending
   - Joins with tags table to get tag_id mappings
   ↓
4. Transform database format to app format:
   - Supabase field: tag_id (UUID) → App field: category (tag_id string)
   - Map tag UUIDs to human-readable category names
   ↓
5. Store in App state: setEvents(transformedEvents)
   ↓
6. Component re-renders with events:
   - LinearCalendar renders year/month/week/day grid
   - Events colored by category/tag
   - InsightsDashboard calculates metrics from events
```

**Event Modification Flow (Create/Update/Delete):**
```
User action (create/edit/delete event)
   ↓
Form validated in App.js
   ↓
Service function called:
   - createEvent(userId, eventData)
   - updateEvent(eventId, userId, updates)
   - deleteEvent(eventId, userId) [soft delete]
   ↓
Service validates and sends to Supabase
   ↓
Supabase RLS policies check user ownership
   ↓
Database transaction completes
   ↓
Service returns { data: updatedEvent, error: null }
   ↓
App.js updates state: setEvents(updatedArray)
   ↓
Components re-render with new data
```

**Subscription & Feature Access Flow:**
```
1. User signs in → App.js loads subscription via getSubscriptionStatus()
   ↓
2. Query 'subscriptions' table for user record
   ↓
3. Return subscription object with:
   - plan: 'free' or 'pro'
   - status: 'active', 'trialing', etc.
   - trial_ends_at, current_period_end (dates)
   - features: Feature flag object
   ↓
4. App.js stores in state: setSubscription(subStatus)
   ↓
5. Feature gates checked via canUseFeature(feature, subscription):
   - advancedAnalytics? → Show MetricsTab
   - customThemes? → Show theme picker
   - maxEvents exceeded? → Show upgrade prompt
   ↓
6. If user starts trial: startFreeTrial(userId) → Insert/update subscription record
```

**State Management:**
- Centralized in `App.js` with React hooks (useState, useEffect, useCallback, useMemo)
- No Redux, Context API only for error boundary
- State organized by concern:
  - Authentication: `user`, `session`, `isAuthModalOpen`
  - Data: `events`, `tags`, `deletedEvents`, `goals`
  - UI: `viewMode`, `modalOpen`, `selectedEvent`, `filterOpen`, `bulkMode`
  - Theme: `currentTheme`, `accentColor`, `customTheme`
  - Performance: `timers`, `floatingTimerVisible`, `nowTime`
- Effects (useEffect) trigger data loads on mount and dependency changes
- Callbacks (useCallback) prevent unnecessary re-renders for memoized components

## Key Abstractions

**Service Functions Pattern:**
```javascript
// All service functions follow this pattern:
export const loadEvents = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('[Events] Load error:', error);
      return { data: [], error };
    }

    return { data: transformedData, error: null };
  } catch (error) {
    console.error('[Events] Unexpected error:', error);
    return { data: [], error };
  }
};
```
- Async functions returning `{ data, error }` tuple
- Consistent error handling with context prefixes
- No exceptions thrown to caller (error in return tuple)
- Used by: App.js calls these and checks error before using data

**Utility Functions Pattern:**
```javascript
// Pure functions with no side effects
export const eventsOverlap = (event1, event2) => {
  return event1.end > event2.start && event1.start < event2.end;
};

export const toLocalDateTimeString = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString();
};
```
- Single responsibility
- Deterministic (same input → same output)
- No external state dependencies
- Easily testable

**Theme Object Pattern:**
```javascript
// Centralized theme definitions
const THEMES = {
  jade: {
    id: 'jade',
    name: 'Jade',
    colors: {
      primary: '#06B6D4',
      background: '#0F172A',
      // ...
    }
  },
  // ...
};
```
- Plain JavaScript objects
- Passed as props or imported for styling
- Enables dynamic theme switching in App.js

**Component Pattern (Container vs Presentational):**
- Container: App.js manages state, calls services, passes props down
- Presentational: LinearCalendar, InsightsDashboard receive props, render UI with minimal logic
- Modal components: Inline in App.js (future refactor to extract)

## Entry Points

**Browser Entry:**
- Location: `public/index.html`
- Loads: React library, CSS, mounts to `<div id="root">`

**Application Entry:**
- Location: `src/index.js`
- Triggers: On page load, after DOM ready
- Code:
```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```
- Responsibilities:
  - Create React root
  - Wrap App with BrowserRouter for routing support
  - Mount to DOM element with id 'root'

**Main App Container:**
- Location: `src/App.js`
- Triggers: Called from index.js after React mount
- Responsibilities:
  - Initialize authentication listener: `onAuthStateChange()`
  - Load events, tags, subscription data on mount
  - Manage all global state (events, user, theme, etc.)
  - Provide routing structure (PrivacyPolicy, TermsOfService via React Router)
  - Render error boundary wrapper (ErrorBoundary class component)
  - Coordinate all service calls based on user actions
  - Render main UI: header, navigation, calendar, modals, sidebars
  - Handle theme switching, view mode changes, event CRUD operations
- State initialization with useCallback to avoid infinite loops

**Page Routes:**
- Location: `src/pages/PrivacyPolicy.js`, `src/pages/TermsOfService.js`
- Defined in: `src/App.js` via `<Routes>` component
- Triggers: User navigates to /privacy or /terms
- Responsibilities: Display static policy/terms content

## Error Handling

**Strategy:** Defensive programming with try-catch at service layer and boundary at component layer

**Service Layer Error Handling:**
- Services wrap Supabase calls in try-catch
- Return `{ data: null, error: errorObject }` on failure
- Log errors with context prefix: `[Auth]`, `[Events]`, `[Tags]`, `[Metrics]`
- Input validation before database operations (required fields, format checks)
- Supabase RLS policy violations caught and logged

**Component Layer Error Handling:**
- ErrorBoundary class component catches React component render errors
- Fallback UI: "Something went wrong" message with error details and reload button
- Location: `src/App.js` ErrorBoundary class wraps all children
- Gracefully handles undefined/null states in conditional renders

**User-Facing Error Handling:**
- Validation errors shown in modals or toast-like notifications
- Network errors logged, user sees generic message
- Failed service calls: setNotifications() for toast notifications

**Pattern Examples:**
```javascript
// Service returns error tuple
const { data, error } = await loadEvents(userId);
if (error) {
  console.error('Failed to load events:', error);
  return; // Don't use data
}

// Component renders conditionally
{events && events.length > 0 ? (
  <CalendarView events={events} />
) : (
  <EmptyState />
)}
```

## Cross-Cutting Concerns

**Logging:**
- Console.log with prefixed context tags: `[Auth]`, `[Events]`, `[Tags]`, `[Subscription]`, `[Metrics]`
- Used in services for debugging data flow
- Used in App.js for lifecycle debugging
- Performance instrumentation: `recordPerformance()` in `src/utils/instrumentation.js`
- No centralized logging service (console only)

**Validation:**
- Input validation in service functions before Supabase operations
- Required field checks: title, category, context, start/end times for events
- Format validation: date strings (ISO format), UUIDs, email addresses
- Runtime guards in `src/utils/runtimeGuards.js` for type safety
- Form validation in UI before calling services

**Authentication:**
- Checked via `onAuthStateChange()` listener on app mount
- Session persisted to localStorage (key: `timeline-auth`)
- PKCE flow for secure OAuth with Supabase (browser-based, no backend)
- User record auto-created in database via Supabase trigger on auth signup
- All data operations require `user_id` match with current user (enforced by RLS policies)
- Logout: `signOut()` clears session from localStorage and Supabase

**State Persistence:**
- Session token persisted in localStorage: key `timeline-auth`
- Event and tag data loaded fresh from Supabase on mount (not cached locally)
- User preferences can be stored/loaded via `userPreferencesService.js`
- Theme selection stored in App.js state only (not persisted)
- Goals stored in component state (future: move to Supabase)

**Performance Optimization:**
- useMemo for expensive calculations (calendar grid, metrics)
- useCallback for event handlers to prevent child re-renders
- useFetch-like pattern in services for parallel Supabase queries
- Increased Supabase timeout to 15s for cold starts (in environment)

---

*Architecture analysis: 2026-02-08*
