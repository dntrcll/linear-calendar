# Codebase Structure

**Analysis Date:** 2026-01-25

## Directory Layout

```
linear-calendar/
├── public/              # Static web assets, HTML entry point
├── src/                 # Source code
│   ├── components/      # React UI components
│   ├── constants/       # Static configuration and data
│   ├── pages/           # Page components (routes)
│   ├── services/        # Backend integration layer
│   ├── utils/           # Utility and helper functions
│   ├── App.js           # Main application container
│   ├── index.js         # React DOM entry point
│   ├── supabaseClient.js # Supabase client initialization
│   └── *.css            # Global and component styles
├── tests/               # Test files and utilities
├── scripts/             # Build and utility scripts
├── .planning/           # GSD planning documentation
├── build/               # Generated production build (git-ignored)
├── node_modules/        # Dependencies (git-ignored)
└── package.json         # Project metadata and dependencies
```

## Directory Purposes

**public/:**
- Purpose: Static assets served by web server at root
- Contains: HTML entry point (index.html), favicon, PWA icons, metadata
- Key files: `public/index.html` (root HTML container)

**src/:**
- Purpose: All application source code
- Contains: Components, services, utilities, constants, styles
- Key files: `src/index.js` (React entry), `src/App.js` (root component)

**src/components/:**
- Purpose: Reusable React UI components
- Contains: LinearCalendar component, other presentational components
- Key files: `src/components/LinearCalendar.jsx` (main calendar visualization)

**src/constants/:**
- Purpose: Static configuration, themes, and data
- Contains: Theme definitions, color palettes, default tags, focus modes, layout config
- Key files:
  - `src/constants/themes.js` - Color palettes and theme objects
  - `src/constants/config.js` - Focus modes, timer settings
  - `src/constants/tags.js` - Default tags and icon definitions
  - `src/constants/index.js` - Barrel export of all constants

**src/pages/:**
- Purpose: Page components for routing
- Contains: Full-page components for different routes
- Key files:
  - `src/pages/PrivacyPolicy.js` - /privacy route
  - `src/pages/TermsOfService.js` - /terms route

**src/services/:**
- Purpose: Backend API integration and data access
- Contains: Functions for authentication, data CRUD operations
- Key files:
  - `src/services/authService.js` - Google OAuth, session management
  - `src/services/eventService.js` - Event CRUD (create, read, update, delete, restore)
  - `src/services/tagService.js` - Tag CRUD
  - `src/services/userPreferencesService.js` - User settings

**src/utils/:**
- Purpose: Utility functions for calculations, formatting, and helpers
- Contains: Pure functions for business logic
- Key files:
  - `src/utils/dateUtils.js` - Date formatting, week calculations
  - `src/utils/eventUtils.js` - Event overlap, conflict detection
  - `src/utils/tagUtils.js` - Tag icon and styling
  - `src/utils/instrumentation.js` - Performance monitoring
  - `src/utils/index.js` - Barrel export

**tests/:**
- Purpose: Test files and testing utilities
- Contains: Performance tests, test configuration
- Key files:
  - `tests/performance.test.js` - Performance benchmarks
  - `tests/run-performance-tests.js` - Test runner

## Key File Locations

**Entry Points:**
- `public/index.html` - Browser loads this HTML file
- `src/index.js` - React mounts application to #root element
- `src/App.js` - Root component managing all state and routing

**Configuration:**
- `src/supabaseClient.js` - Supabase instance with environment variables
- `src/constants/config.js` - Focus modes, timer presets
- `src/constants/themes.js` - Theme and palette definitions
- `package.json` - Project dependencies and scripts
- `.env.local` - Local environment variables (not committed)

**Core Logic:**
- `src/App.js` - Application state management (10,943 lines, split-able)
- `src/services/authService.js` - Authentication logic
- `src/services/eventService.js` - Event management
- `src/services/tagService.js` - Tag management
- `src/utils/dateUtils.js` - Date utilities
- `src/utils/eventUtils.js` - Event calculations

**Styling:**
- `src/App.css` - Main application styles
- `src/components/LinearCalendar.css` - Calendar component styles
- `src/index.css` - Global styles (imported in index.js)

**Testing:**
- `src/setupTests.js` - Test configuration and setup
- `src/App.test.js` - App component tests
- `tests/performance.test.js` - Performance tests
- `tests/run-performance-tests.js` - Test runner

## Naming Conventions

**Files:**
- React components: PascalCase with `.jsx` extension (e.g., `LinearCalendar.jsx`)
- Services: camelCase with `Service` suffix (e.g., `authService.js`, `eventService.js`)
- Utils: camelCase describing purpose (e.g., `dateUtils.js`, `eventUtils.js`)
- Constants: camelCase with descriptive names (e.g., `themes.js`, `config.js`)
- Styles: PascalCase matching component name with `.css` (e.g., `LinearCalendar.css`)

**Directories:**
- Lowercase plural nouns: `components/`, `constants/`, `services/`, `utils/`, `pages/`
- Descriptive purpose: `tests/`, `scripts/`, `public/`, `src/`

**Functions:**
- Async service functions: camelCase with action verb (e.g., `loadEvents()`, `createEvent()`, `updateTag()`)
- Pure utility functions: camelCase describing operation (e.g., `eventsOverlap()`, `toLocalDateTimeString()`)
- React components: PascalCase (e.g., `LinearCalendar`, `ErrorBoundary`)
- State setters follow React convention: `set<StateName>` (e.g., `setCurrentUser()`, `setEvents()`)

**Variables:**
- State variables: camelCase (e.g., `currentUser`, `selectedEvent`, `userPreferences`)
- Constants from imports: UPPER_SNAKE_CASE (e.g., `PALETTE`, `THEMES`, `DEFAULT_TAGS`)
- Component props: camelCase (e.g., `currentYear`, `showText`)

**Classes:**
- Error Boundary: `ErrorBoundary` (extends React.Component)

## Where to Add New Code

**New Feature:**
- Primary code: `src/App.js` (state management) or new service in `src/services/`
- Utilities: `src/utils/` (add new file if feature has reusable logic)
- Constants: `src/constants/` (if feature needs configuration)
- Tests: `src/*.test.js` or `tests/` directory

**New Component/Module:**
- UI component: `src/components/` (e.g., `src/components/MyComponent.jsx`)
- Page route: `src/pages/` (e.g., `src/pages/MyPage.js`)
- Service: `src/services/` (e.g., `src/services/myFeatureService.js`)
- Styling: `src/components/MyComponent.css` (co-located with component)

**Utilities:**
- Shared helpers: Add to existing `src/utils/*.js` file if related (e.g., date logic → dateUtils.js)
- New category: Create new file in `src/utils/` (e.g., `src/utils/myUtils.js`)
- Export in: Update barrel export in `src/utils/index.js`

**Constants:**
- New configuration: Add to relevant file in `src/constants/` (e.g., new theme → themes.js)
- New category: Create new file (e.g., `src/constants/myConfig.js`)
- Export in: Update barrel export in `src/constants/index.js`

## Special Directories

**build/:**
- Purpose: Production build output (generated by `react-scripts build`)
- Generated: Yes (by build process)
- Committed: No (.gitignore)
- Usage: Deployed to hosting (Vercel, etc.)

**node_modules/:**
- Purpose: Installed npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No (.gitignore)
- Contains: @supabase/supabase-js, react, react-dom, d3, date-fns, lucide-react, and dev tools

**.planning/:**
- Purpose: GSD (Goal-Source-Direction) planning and analysis documents
- Contains: Codebase mapping (ARCHITECTURE.md, STRUCTURE.md, etc.), planning notes
- Generated: Yes (by GSD tools)
- Committed: Yes

**.claude/**
- Purpose: Claude/Anthropic tooling integration files
- Generated: Yes
- Committed: Yes

**.vscode/**
- Purpose: Visual Studio Code workspace settings
- Generated: Yes
- Committed: Yes (typically)

**public/migrate.html:**
- Purpose: Data migration utility page
- Generated: No (checked-in file)
- Usage: Legacy Supabase migration interface

## Import Path Patterns

**Standard imports from src:**
```javascript
// Services
import { loadEvents, createEvent } from './services/eventService';

// Utils (barrel exports)
import { toLocalDateTimeString, getWeekNumber } from './utils';

// Constants (barrel exports)
import { PALETTE, THEMES, DEFAULT_TAGS } from './constants';

// Components
import LinearCalendar from './components/LinearCalendar';

// Pages
import PrivacyPolicy from './pages/PrivacyPolicy';

// External
import { supabase } from './supabaseClient';
```

**Pattern:** Relative paths from importing file location, barrel exports used for constants and utils to reduce import verbosity.

