# Codebase Structure

**Analysis Date:** 2026-02-08

## Directory Layout

```
linear-calendar/
├── public/                  # Static web assets, HTML entry point
├── src/                     # Source code - organized by feature/layer
│   ├── components/          # Reusable React UI components
│   │   ├── ui/              # UI building blocks (future)
│   │   ├── layouts/         # Layout components (future)
│   │   ├── charts/          # Chart widgets
│   │   ├── LinearCalendar.jsx      # Calendar grid visualization
│   │   ├── LinearCalendar.css      # Calendar styles
│   │   ├── InsightsDashboard.js    # Metrics dashboard
│   │   ├── MetricsTab.js           # Analytics tab
│   │   ├── TelemetryPage.js        # Usage tracking page
│   │   └── *.css            # Component-scoped styles
│   ├── features/            # Feature modules (domain-driven)
│   │   ├── auth/            # Authentication feature
│   │   │   ├── authService.js
│   │   │   └── userPreferencesService.js
│   │   ├── events/          # Calendar events feature
│   │   │   ├── eventService.js
│   │   │   ├── tagService.js
│   │   │   ├── eventUtils.js
│   │   │   ├── tagUtils.js
│   │   │   ├── LinearCalendar.jsx
│   │   │   └── LinearCalendar.css
│   │   ├── analytics/       # Analytics & insights feature
│   │   │   ├── InsightsDashboard.js
│   │   │   ├── MetricsTab.js
│   │   │   ├── TelemetryPage.js
│   │   │   ├── metricsService.js
│   │   │   ├── telemetryService.js
│   │   │   ├── productivityMetricsService.js
│   │   │   ├── metricsCalculations.js
│   │   │   └── charts/
│   │   └── subscription/    # Subscription & billing feature
│   │       └── subscriptionService.js
│   ├── services/            # Service layer (data access)
│   │   ├── authService.js
│   │   ├── eventService.js
│   │   ├── tagService.js
│   │   ├── subscriptionService.js
│   │   ├── metricsService.js
│   │   ├── telemetryService.js
│   │   ├── productivityMetricsService.js
│   │   └── userPreferencesService.js
│   ├── constants/           # Static configuration & data
│   │   ├── themes.js        # 9 premium themes, color palettes
│   │   ├── config.js        # Focus modes, timer settings, layout
│   │   ├── tags.js          # Default tags, tag categories
│   │   ├── quotes.js        # 365+ motivational quotes
│   │   ├── layout.js        # Layout constants
│   │   ├── icons.js         # SVG icon library (16KB)
│   │   └── index.js         # Barrel exports
│   ├── utils/               # Utility & helper functions
│   │   ├── dateUtils.js     # Date formatting, calculations
│   │   ├── eventUtils.js    # Event overlap, conflict detection
│   │   ├── tagUtils.js      # Tag styling & icons
│   │   ├── metricsCalculations.js  # Metrics math
│   │   ├── instrumentation.js      # Performance monitoring
│   │   ├── agentLoop.js            # Agent processing
│   │   ├── debugConsole.js         # Debug utilities
│   │   ├── runtimeGuards.js        # Type validation
│   │   ├── migrateToSupabase.js    # Migration helpers
│   │   └── index.js         # Barrel exports
│   ├── types/               # Type definitions
│   │   └── metrics.js       # Metrics types
│   ├── pages/               # Page routes
│   │   ├── PrivacyPolicy.js
│   │   └── TermsOfService.js
│   ├── App.js               # Main container component (10,943 lines)
│   ├── App.css              # Main app styles
│   ├── App.test.js          # App component tests
│   ├── index.js             # React entry point
│   ├── index.css            # Global styles
│   ├── supabaseClient.js    # Supabase client initialization
│   ├── reportWebVitals.js   # Performance monitoring
│   ├── setupTests.js        # Test configuration
│   └── logo.svg             # App logo
├── database/                # Database layer
│   ├── migrations/          # Database schema migrations
│   │   ├── 001_create_life_metrics.sql
│   │   ├── 002_update_life_metrics.sql
│   │   ├── 003-009_metrics_fixes.sql
│   │   ├── 010_subscriptions_table.sql
│   │   ├── add_recurring_events.sql
│   │   └── README.md
│   ├── scripts/             # Database utilities
│   │   ├── RUN_THIS_IN_SUPABASE.sql
│   │   ├── check-tables.sql
│   │   ├── complete-fix.sql
│   │   ├── drop-all-tables.sql
│   │   └── [various fix scripts]
│   └── schemas/             # Schema documentation (future)
├── tests/                   # Test files
│   ├── metricsCalculations.test.js
│   ├── performance.test.js
│   ├── run-performance-tests.js
│   ├── browser-performance-test.html
│   └── README.md
├── .planning/               # GSD planning documents
│   ├── codebase/            # This directory
│   │   ├── ARCHITECTURE.md
│   │   ├── STRUCTURE.md
│   │   ├── CONVENTIONS.md
│   │   ├── TESTING.md
│   │   ├── STACK.md
│   │   ├── INTEGRATIONS.md
│   │   └── CONCERNS.md
│   ├── config.json
│   └── [planning files]
├── .claude/                 # Claude AI development skills
│   ├── skills/              # Specialized AI agents
│   └── settings.local.json
├── .vscode/                 # VS Code workspace settings
├── build/                   # Production build (git-ignored)
├── node_modules/            # Dependencies (git-ignored)
├── public/                  # Static assets
│   ├── index.html           # HTML template with <div id="root">
│   ├── favicon.ico
│   ├── manifest.json        # PWA manifest
│   ├── robots.txt
│   └── [PWA icons]
├── config/                  # Configuration files
│   ├── vercel.json
│   ├── .npmrc
│   └── README.md
├── docs/                    # Documentation
│   ├── guides/              # How-to guides
│   ├── fixes/               # Bug fix documentation
│   ├── launch/              # Deployment docs
│   └── planning/            # Project planning
├── package.json             # Dependencies & scripts
├── package-lock.json        # Locked dependency versions
├── tsconfig.json            # TypeScript config (if using TS)
├── .gitignore               # Git exclusions
├── .env.local               # Local environment variables
├── .claudeignore             # Claude exclusions
├── README.md                # Project overview
└── vercel.json              # Vercel deployment config
```

## Directory Purposes

**public/:**
- Purpose: Static web assets served at root path
- Contains: HTML entry point, favicon, PWA icons, manifest
- Key files:
  - `public/index.html` - HTML template with `<div id="root">` mount point
  - `public/manifest.json` - PWA manifest for app installation

**src/:**
- Purpose: All application source code, organized by feature and layer
- Contains: Components, services, utilities, constants, styles, types
- Key files: `src/index.js` (React entry), `src/App.js` (root container)

**src/components/:**
- Purpose: Reusable React UI components
- Contains: Presentational components, chart widgets, dashboard UI
- Key files:
  - `src/components/LinearCalendar.jsx` - Calendar grid visualization (year/month/week/day)
  - `src/components/InsightsDashboard.js` - Metrics and productivity dashboard
  - `src/components/MetricsTab.js` - Analytics tab (50KB+ component)
  - `src/components/TelemetryPage.js` - Usage tracking dashboard (60KB+ component)
  - `src/components/charts/` - Chart widgets (AreaChartWidget, BarChartWidget, LineChartWidget, HeatmapWidget)
- Subdirectories: `ui/` (future), `layouts/` (future)

**src/features/:**
- Purpose: Feature modules organized by business domain (Domain-Driven Design)
- Structure: Each feature is self-contained with its own services, utilities, and components
- Contains:
  - **`auth/`** - Authentication (Google OAuth, email auth, user session)
  - **`events/`** - Event calendar system (CRUD, recurrence, tags)
  - **`analytics/`** - Insights and metrics (dashboards, calculations, telemetry)
  - **`subscription/`** - Billing and subscription management (Stripe)

**src/services/:**
- Purpose: Backend API integration and data access layer
- Contains: Async functions for Supabase operations
- Key files:
  - `src/services/authService.js` - Google OAuth, email auth, session management
  - `src/services/eventService.js` - Event CRUD (create, read, update, delete, restore), recurring instances
  - `src/services/tagService.js` - Tag/category CRUD
  - `src/services/subscriptionService.js` - Subscription status, trial management, feature gates
  - `src/services/metricsService.js` - Metrics queries and aggregation
  - `src/services/telemetryService.js` - Usage event tracking
  - `src/services/productivityMetricsService.js` - Productivity calculations
  - `src/services/userPreferencesService.js` - User settings storage
- Pattern: All functions return `{ data, error }` tuple, wrap Supabase calls in try-catch

**src/constants/:**
- Purpose: Static configuration, themes, and domain data
- Contains: Theme definitions, color palettes, configuration objects, static data
- Key files:
  - `src/constants/themes.js` - 9 premium themes (Jade, Sapphire, Coral, etc.), PALETTE object with colors
  - `src/constants/config.js` - FOCUS_MODES, TIMER_PRESETS, TIMER_COLORS, LAYOUT constants
  - `src/constants/tags.js` - DEFAULT_TAGS, AVAILABLE_ICONS for tagging system
  - `src/constants/quotes.js` - 365+ motivational quotes with author attribution
  - `src/constants/layout.js` - Layout spacing and dimension constants
  - `src/constants/icons.js` - SVG icon library (16KB)
  - `src/constants/index.js` - Barrel export for clean imports

**src/utils/:**
- Purpose: Pure utility functions for business logic and calculations
- Contains: Reusable helper functions with no side effects
- Key files:
  - `src/utils/dateUtils.js` - `toLocalDateTimeString()`, `getWeekNumber()`, date calculations
  - `src/utils/eventUtils.js` - `eventsOverlap()`, `findConflicts()`, event calculations
  - `src/utils/tagUtils.js` - `getTagIcon()`, tag styling helpers
  - `src/utils/metricsCalculations.js` - Productivity score, focus time, context switches calculations
  - `src/utils/instrumentation.js` - Performance monitoring, `recordPerformance()`, runtime guards
  - `src/utils/agentLoop.js` - Agent-based processing loop
  - `src/utils/debugConsole.js` - Debug output formatting
  - `src/utils/runtimeGuards.js` - Type validation and runtime checks
  - `src/utils/migrateToSupabase.js` - Data migration helpers
  - `src/utils/index.js` - Barrel export

**src/types/:**
- Purpose: Type definitions and interfaces
- Contains: TypeScript types or JSDoc type definitions
- Key files: `src/types/metrics.js` - Metrics type definitions

**src/pages/:**
- Purpose: Page components for routing
- Contains: Full-page components matching routes
- Key files:
  - `src/pages/PrivacyPolicy.js` - /privacy route
  - `src/pages/TermsOfService.js` - /terms route

**database/:**
- Purpose: Database layer with migrations and utilities
- Contains:
  - **`migrations/`** - SQL migration scripts for schema versioning
    - `001_create_life_metrics.sql` - Initial metrics table
    - `010_subscriptions_table.sql` - Subscription schema
    - `add_recurring_events.sql` - Recurring events support
  - **`scripts/`** - Database utilities and setup
    - `RUN_THIS_IN_SUPABASE.sql` - Complete initial setup
    - `check-tables.sql` - Verify schema
    - `complete-fix.sql` - Comprehensive schema fixes
  - **`schemas/`** - Schema documentation (future)
- Tables: events, tags, users, life_metrics, telemetry_events, subscriptions

**tests/:**
- Purpose: Test files and testing utilities
- Contains: Unit tests, integration tests, performance tests
- Key files:
  - `src/App.test.js` - App component tests
  - `src/setupTests.js` - Test configuration
  - `tests/metricsCalculations.test.js` - Metrics math tests
  - `tests/performance.test.js` - Performance benchmarks
  - `tests/run-performance-tests.js` - Test runner

**.planning/codebase/:**
- Purpose: Codebase analysis documents for GSD orchestrator
- Contains:
  - `ARCHITECTURE.md` - Architecture patterns, layers, data flow
  - `STRUCTURE.md` - Directory layout, file purposes, where to add code
  - `CONVENTIONS.md` - Naming conventions, code style, import patterns
  - `TESTING.md` - Testing framework, patterns, coverage
  - `STACK.md` - Technology stack, dependencies
  - `INTEGRATIONS.md` - External API integrations
  - `CONCERNS.md` - Technical debt, issues, fragile areas

**build/:**
- Purpose: Production build output
- Generated: Yes (by `npm run build`)
- Committed: No (.gitignore)
- Usage: Deployed to hosting provider

**node_modules/:**
- Purpose: Installed npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No (.gitignore)
- Contains: @supabase/supabase-js, react, react-dom, recharts, d3, date-fns, lucide-react, etc.

## Key File Locations

**Entry Points:**
- `public/index.html` - Browser loads this HTML file
- `src/index.js` - React mounts application to `#root` element
- `src/App.js` - Root component managing all state and routing
- Supabase client: `src/supabaseClient.js`

**Configuration:**
- `src/supabaseClient.js` - Supabase client initialization with PKCE flow, session persistence
- `src/constants/themes.js` - Theme and color palette definitions
- `src/constants/config.js` - Feature flags, timer presets, focus modes
- `package.json` - Project dependencies and build scripts
- `.env.local` - Environment variables (not committed, contains Supabase URL and keys)

**Core Logic:**
- `src/App.js` - Application state management (10,943 lines)
- `src/services/authService.js` - Authentication (Google OAuth, email, sessions)
- `src/services/eventService.js` - Event management (CRUD, recurrence, tags)
- `src/services/subscriptionService.js` - Subscription logic (plans, trials, feature gates)
- `src/utils/dateUtils.js` - Date utilities
- `src/utils/eventUtils.js` - Event calculations
- `src/utils/metricsCalculations.js` - Productivity metrics

**Styling:**
- `src/App.css` - Main application styles
- `src/index.css` - Global styles and animations (imported in index.js)
- `src/components/LinearCalendar.css` - Calendar component styles
- `src/components/*.css` - Component-scoped styles

**Testing:**
- `src/setupTests.js` - Test configuration and setup
- `src/App.test.js` - App component tests
- `tests/metricsCalculations.test.js` - Metrics unit tests
- `tests/performance.test.js` - Performance benchmarks

## Naming Conventions

**Files:**
- React components: PascalCase with `.jsx` extension (`LinearCalendar.jsx`, `MetricsTab.js`)
- Services: camelCase with `Service` suffix (`authService.js`, `eventService.js`)
- Utils: camelCase describing purpose (`dateUtils.js`, `eventUtils.js`)
- Constants: camelCase with descriptive names (`themes.js`, `config.js`, `quotes.js`)
- Styles: PascalCase matching component or module name with `.css` (`.css` co-located with `.jsx`)
- Tests: `*.test.js` or `*.spec.js` suffix

**Directories:**
- Lowercase plural for collections: `components/`, `constants/`, `services/`, `utils/`, `pages/`
- Lowercase for features: `features/auth/`, `features/events/`, `features/analytics/`
- Descriptive functional names: `tests/`, `database/`, `public/`, `build/`

**Functions:**
- Async service functions: camelCase with action verb (`loadEvents()`, `createEvent()`, `updateTag()`)
- Pure utility functions: camelCase describing operation (`eventsOverlap()`, `toLocalDateTimeString()`, `getTagIcon()`)
- React components (functions): PascalCase (`LinearCalendar`, `ErrorBoundary`, `InsightsDashboard`)
- React hooks: camelCase prefixed with `use` (`useEffect`, `useState`, custom hooks)
- State setters: `set<StateName>` convention (`setCurrentUser()`, `setEvents()`, `setViewMode()`)
- Event handlers: `handle<Action>` convention (`handleCreateEvent()`, `handleSelectDate()`)

**Variables:**
- State variables: camelCase (`currentUser`, `selectedEvent`, `viewMode`, `userPreferences`)
- Constants from imports: UPPER_SNAKE_CASE (`PALETTE`, `THEMES`, `DEFAULT_TAGS`, `FOCUS_MODES`)
- Component props: camelCase (`currentYear`, `showText`, `onClose`, `isLoading`)
- Local variables: camelCase (no prefix/suffix)

**CSS Classes:**
- BEM-inspired: `.linear-calendar`, `.calendar-header`, `.event-item`
- State classes: `.is-active`, `.is-hidden`, `.is-disabled`

## Where to Add New Code

**New Feature:**
1. Create feature folder: `src/features/[feature-name]/`
2. Add service: `src/features/[feature-name]/[feature]Service.js`
3. Add utilities: `src/features/[feature-name]/[feature]Utils.js` (if complex)
4. Add component: `src/features/[feature-name]/[FeatureName].jsx`
5. Register service in: `src/App.js` state and effects
6. Add tests: `tests/[feature].test.js`

**New Component:**
- UI component: Create `src/components/[ComponentName].jsx` and `src/components/[ComponentName].css`
- Export in: Update relevant barrel export or import directly
- Add to: `src/App.js` or relevant container component

**New Service Function:**
- Add to: `src/services/[category]Service.js` or create new service file
- Pattern: Return `{ data, error }` tuple
- Wrap Supabase calls in try-catch
- Use context-prefixed console.error logging
- Import and call in: `src/App.js` useEffect or event handlers

**New Utility Function:**
- Add to: Existing `src/utils/[category].js` if related, otherwise create new
- Pattern: Pure function, no side effects, single responsibility
- Export in: Barrel export file `src/utils/index.js`
- Add tests: `tests/[category].test.js`

**New Constant:**
- Add to: Relevant file in `src/constants/` (e.g., new theme → themes.js)
- Create new file: If new category (e.g., `src/constants/focusModes.js`)
- Export in: Barrel export `src/constants/index.js`
- Access: Import from barrel: `import { THEMES, PALETTE } from './constants'`

**New Page Route:**
- Create: `src/pages/[PageName].js`
- Add route: In `src/App.js` `<Routes>` component
- Pattern: Full-page component, fetch own data, handle own state

## Special Directories

**build/:**
- Purpose: Production build output (generated by `npm run build`)
- Generated: Yes (by react-scripts)
- Committed: No (.gitignore)
- Usage: Deployed to Vercel or other hosting

**node_modules/:**
- Purpose: Installed npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No (.gitignore)

**.planning/codebase/:**
- Purpose: Codebase analysis documents for GSD tools
- Contents: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, STACK.md, INTEGRATIONS.md, CONCERNS.md
- Generated: Partially (by GSD analysis tools)
- Committed: Yes
- Used by: /gsd:plan-phase and /gsd:execute-phase commands

**.claude/:**
- Purpose: Claude Code development skills and settings
- Generated: Yes (by Claude tooling)
- Committed: Yes

**.vscode/:**
- Purpose: Visual Studio Code workspace settings
- Generated: Yes
- Committed: Yes (shared workspace config)

## Import Path Patterns

**Standard patterns (using relative paths):**
```javascript
// Services
import { loadEvents, createEvent } from './services/eventService';
import { getSubscriptionStatus } from './services/subscriptionService';

// Utils (barrel exports)
import { toLocalDateTimeString, getWeekNumber, eventsOverlap } from './utils';

// Constants (barrel exports)
import { PALETTE, THEMES, DEFAULT_TAGS, FOCUS_MODES } from './constants';

// Components
import LinearCalendar from './components/LinearCalendar';
import { InsightsDashboard } from './components/InsightsDashboard';

// Pages
import PrivacyPolicy from './pages/PrivacyPolicy';

// External
import { supabase } from './supabaseClient';
```

**Feature-based imports (future path alias):**
```javascript
import { eventService } from '@features/events/eventService';
import { authService } from '@features/auth/authService';
import { calculateProductivityScore } from '@utils/metricsCalculations';
import { THEMES } from '@constants/themes';
```

**Current state:** Relative paths used, path aliases not yet configured (pending jsconfig.json setup)

## Database Schema Overview

**Tables:**
- **`events`** - Calendar events (user_id, title, start_time, end_time, category, context, deleted)
- **`tags`** - Event categories/tags (user_id, tag_id, name, color, icon)
- **`users`** - User profiles (id, email, name, preferences)
- **`subscriptions`** - Billing subscriptions (user_id, plan, status, trial_dates)
- **`life_metrics`** - Productivity metrics (user_id, date, metrics_data)
- **`telemetry_events`** - Usage analytics (user_id, event_type, timestamp)

**RLS Policies:**
- Users can only access their own data (user_id matching auth.uid())
- Service role has full access for webhooks and admin operations
- Authenticated users can create their own records

---

*Structure analysis: 2026-02-08*
