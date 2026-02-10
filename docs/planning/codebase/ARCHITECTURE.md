# Architecture

**Analysis Date:** 2026-01-25

## Pattern Overview

**Overall:** Layered React SPA with Supabase backend

**Key Characteristics:**
- Client-side React component hierarchy centered around `App.js` as the main container
- Service layer abstraction for Supabase interactions (auth, events, tags, user preferences)
- Utility layer with pure functions for date, event, and tag operations
- Constants layer for theming, configuration, and static data
- Single-page routing with React Router for pages (Privacy, Terms)

## Layers

**Presentation Layer:**
- Purpose: Render UI components and handle user interactions
- Location: `src/components/`, `src/pages/`
- Contains: React components (class and functional), styled components with inline CSS
- Depends on: Utils layer (date formatting, event calculations), Constants layer (themes, icons), Service layer (data)
- Used by: Rendered by `App.js`

**Container/State Layer:**
- Purpose: Manage application state, coordinate between services and UI
- Location: `src/App.js` (main container component)
- Contains: React hooks (useState, useEffect, useRef, useCallback, useMemo), error boundary, authentication orchestration
- Depends on: Service layer (auth, events, tags, preferences), Instrumentation utils
- Used by: Index.js entry point, wraps all presentational components

**Service Layer:**
- Purpose: Abstract database and external API interactions
- Location: `src/services/`
- Contains:
  - `authService.js` - Google OAuth with Supabase, session management
  - `eventService.js` - CRUD operations for events (create, read, update, delete, restore)
  - `tagService.js` - CRUD operations for tags
  - `userPreferencesService.js` - User settings management
- Depends on: `supabaseClient.js` (Supabase instance)
- Used by: `App.js` state management, called on mount and during user actions

**Utility Layer:**
- Purpose: Pure utility functions for domain logic
- Location: `src/utils/`
- Contains:
  - `dateUtils.js` - Date formatting, week number calculation
  - `eventUtils.js` - Event overlap detection, conflict finding
  - `tagUtils.js` - Tag icon and styling helpers
  - `instrumentation.js` - Performance monitoring, runtime guards
  - `agentLoop.js` - Agent-based processing loop
  - `debugConsole.js` - Debug utilities
  - `migrateToSupabase.js` - Data migration helpers
  - `runtimeGuards.js` - Runtime validation
  - `index.js` - Barrel export
- Depends on: External libraries (date-fns)
- Used by: App.js, services, components

**Constants Layer:**
- Purpose: Define static configuration and theming
- Location: `src/constants/`
- Contains:
  - `themes.js` - Color palettes and theme objects
  - `config.js` - Focus modes, timer presets, timer colors
  - `quotes.js` - Motivational quotes
  - `tags.js` - Default tags, available icons
  - `layout.js` - Layout configuration
  - `index.js` - Barrel export
- Depends on: None
- Used by: App.js, Components for styling and configuration

**Integration Layer:**
- Purpose: Initialize and manage external service connections
- Location: `src/supabaseClient.js`
- Contains: Supabase client initialization with auth configuration (PKCE flow, session persistence)
- Depends on: External library (@supabase/supabase-js)
- Used by: All service layer files

## Data Flow

**Authentication Flow:**

1. User clicks "Sign In with Google" button in App.js
2. `signInWithGoogle()` from `authService.js` initiates Supabase OAuth
3. User authenticates with Google, redirected back to app
4. `onAuthStateChange()` listener fires with auth event
5. `ensureUserRecord()` checks/creates user record in database
6. Session stored in localStorage with key 'timeline-auth'
7. App component receives session and sets `currentUser` state
8. UI renders authenticated interface

**Event Management Flow:**

1. App.js mounts and calls `loadEvents(userId)` from `eventService.js`
2. Service queries Supabase `events` table with user filter and related `tags`
3. Events transformed from database format to app format (id, title, description, etc.)
4. Events stored in `App.js` state as `events`
5. User creates/updates/deletes event through UI
6. Corresponding service function called (createEvent, updateEvent, deleteEvent)
7. Service validates data, sends to Supabase, receives updated record
8. App state updated with new data, UI re-renders

**Tag Management Flow:**

1. App.js mounts and calls `loadTags(userId)` from `tagService.js`
2. Service queries Supabase `tags` table, transforms data
3. Tags stored in `App.js` state as `tags`
4. When creating events, user selects from available tags
5. Tag operations (create, update, delete) follow similar pattern as events

**State Management:**
- Centralized in `App.js` with React useState hooks
- Authentication state: `currentUser`, `session`
- Data state: `events`, `tags`, `userPreferences`
- UI state: `selectedEvent`, `selectedTheme`, `searchQuery`, modal visibility flags
- Effects (useEffect) trigger data loading on mount and when dependencies change

## Key Abstractions

**Service Functions:**
- Purpose: Hide Supabase query complexity, provide consistent error handling
- Examples: `src/services/authService.js`, `src/services/eventService.js`
- Pattern: Async functions returning `{ data, error }` tuple for consistent error handling across all services

**Utility Functions:**
- Purpose: Reusable pure functions for common operations
- Examples: `eventsOverlap()`, `toLocalDateTimeString()`, `getTagIcon()`
- Pattern: Single responsibility, no side effects, testable

**Theme Objects:**
- Purpose: Centralize styling configuration
- Examples: `PALETTE`, `THEMES` from `src/constants/themes.js`
- Pattern: Plain JavaScript objects passed as props or used for inline styling

**Constants Objects:**
- Purpose: Single source of truth for configuration
- Examples: `FOCUS_MODES`, `TIMER_PRESETS`, `DEFAULT_TAGS` in `src/constants/`
- Pattern: Exported as named exports for selective imports

## Entry Points

**Application Entry:**
- Location: `src/index.js`
- Triggers: Browser loads application
- Responsibilities: Renders React root, wraps App with BrowserRouter, mounts to DOM element with id 'root'

**Main App Container:**
- Location: `src/App.js`
- Triggers: Called from index.js after React initialization
- Responsibilities:
  - Initialize authentication state and session listeners
  - Load events and tags from Supabase on mount
  - Manage global state (events, tags, current user, preferences, UI state)
  - Provide routing structure (PrivacyPolicy, TermsOfService pages)
  - Render error boundary wrapper
  - Coordinate all service calls and state updates
  - Render main UI layout with navigation, modals, event displays

**Page Routes:**
- Location: `src/pages/PrivacyPolicy.js`, `src/pages/TermsOfService.js`
- Triggers: User navigates to /privacy or /terms routes
- Responsibilities: Display policy/terms content

## Error Handling

**Strategy:** Try-catch blocks in services with error object return pattern

**Patterns:**
- Services return `{ data, error }` tuple structure
- Errors logged to console with context prefix (e.g., '[Auth]', '[Event]')
- App.js ErrorBoundary catches React component errors, displays fallback UI with reload button
- Validation errors thrown from services with descriptive messages
- Supabase RLS policy violations caught in service error handlers

## Cross-Cutting Concerns

**Logging:**
- Console.log with prefixed context tags like '[Auth]', '[Event]'
- Used in services for debugging data flow
- Performance instrumentation in `src/utils/instrumentation.js`

**Validation:**
- Input validation in service functions before database operations
- Required field checks (title, category, context, times for events)
- Format validation (date strings, UUIDs)

**Authentication:**
- Checked via `onAuthStateChange()` listener on app mount
- Session persisted to localStorage for resuming sessions
- PKCE flow for secure OAuth with Supabase
- User record created in database via trigger on auth signup

**State Persistence:**
- Session token persisted in localStorage (key: 'timeline-auth')
- Event and tag data loaded fresh from Supabase on mount (not persisted locally)
- User preferences can be stored/loaded via `userPreferencesService.js`
