# Timeline OS — Claude Code Reference

> **Single-file React 19 app** (`src/App.js`, 12,465 LOC). This is intentional architecture, not tech debt.

## Commands

```bash
npm install --legacy-peer-deps   # Required — React 19 peer dep conflicts
npm start                        # Dev → http://localhost:3000
npm run build                    # Prod build (CI=false, no sourcemaps — see vercel.json)
npm test                         # Jest watch mode
npm run test:perf                # Performance benchmarks (node tests/run-performance-tests.js)
```

## Project Layout

```
src/
├── App.js                    # 12,465 lines — all views, modals, settings, auth (see component map below)
├── App.css                   # Calendar grid styles, responsive breakpoints
├── supabaseClient.js         # Supabase init (PKCE flow, storageKey: 'timeline-auth')
├── services/                 # Supabase CRUD layer (8 files)
│   ├── authService.js        # signInWithGoogle, signInWithEmail, signUpWithEmail, signInWithPassword, signOut, onAuthStateChange
│   ├── eventService.js       # loadEvents, createEvent, updateEvent, deleteEvent, permanentlyDeleteEvent, restoreEvent, createRecurringInstances
│   ├── tagService.js         # loadTags, createTag, updateTag, deleteTag, getTagsByContext, getTagByTagId
│   ├── telemetryService.js   # loadMonthTelemetry, toggleHabitCompletion, updateDayTelemetry, createHabit, updateHabit, archiveHabit
│   ├── subscriptionService.js # SUBSCRIPTION_PLANS, getSubscriptionStatus, startFreeTrial, canUseFeature, localSubscriptionManager
│   ├── metricsService.js     # loadMetrics, insertMetric, updateMetric, deleteMetric
│   ├── userPreferencesService.js  # loadUserPreferences, updateUserPreferences (currently commented out in App.js imports)
│   └── productivityMetricsService.js # calculateAndSaveProductivityMetrics, calculateProductivityMetricsRange
├── constants/                # Static data (7 files, barrel-exported via index.js)
│   ├── themes.js             # PALETTE + THEMES — 12 theme objects (see Styling section)
│   ├── icons.js              # ICONS — SVG icon definitions
│   ├── quotes.js             # MOTIVATIONAL_QUOTES array
│   ├── config.js             # FOCUS_MODES, TIMER_COLORS, TIMER_ICONS, TIMER_PRESETS
│   ├── tags.js               # DEFAULT_TAGS, AVAILABLE_ICONS
│   └── layout.js             # LAYOUT config object
├── utils/                    # Pure logic (10 files, barrel-exported via index.js)
│   ├── dateUtils.js          # toLocalDateTimeString, getWeekNumber
│   ├── eventUtils.js         # eventsOverlap, findConflicts
│   ├── tagUtils.js           # getTagIcon
│   ├── metricsCalculations.js # calculateProductivityScore, transformToHeatmapBins, calculateFocusTime
│   ├── runtimeGuards.js      # detectOverlaps, detectOrderingIssues, runAllGuards, getAnomalyStats
│   ├── agentLoop.js          # recordPerformance, getPerformanceStats, analyzeAnomalies
│   ├── instrumentation.js    # runAllGuards, initInstrumentation (orchestrates guards + perf)
│   ├── debugConsole.js       # initDebugConsole (dev-only data export)
│   └── migrateToSupabase.js  # migrateUserData (one-time migration helper)
├── components/
│   ├── TelemetryPage.js      # 1,951 lines — habits page (mood, completions, monthly summaries)
│   ├── MetricsTab.js         # 1,499 lines — life metrics dashboard (sleep, weight, workouts)
│   ├── InsightsDashboard.js  # 592 lines — analytics/insights view
│   ├── LinearCalendar.jsx    # Legacy component (unused)
│   ├── LinearCalendar.css    # Keyframes (@keyframes pulse), scrollbar styles, heatmap grid
│   └── charts/               # Recharts + visx wrappers (barrel-exported via index.js)
│       ├── LineChartWidget.js
│       ├── BarChartWidget.js
│       ├── AreaChartWidget.js
│       └── HeatmapWidget.js
├── pages/
│   ├── PrivacyPolicy.js      # Legal page
│   └── TermsOfService.js     # Legal page
├── types/                    # TypeScript type definitions
│   └── events.ts
api/                          # Vercel serverless functions (all require JWT auth)
├── create-checkout-session.js  # Stripe checkout — validates priceId, finds/creates Stripe customer
├── create-portal-session.js    # Stripe billing portal — finds customer by email
├── stripe-webhook.js           # Handles checkout.session.completed, subscription updates
└── verify-session.js           # Verifies Stripe session + payment status
database/
├── SCHEMA.md                   # Full schema documentation
├── migrations/                 # 14 SQL migrations (001–011 + add_recurring_events)
└── scripts/                    # 16 maintenance/fix SQL scripts
```

## App.js Component Map

| Line | Component | Description |
|------|-----------|-------------|
| 75 | `ErrorBoundary` | Class component — catches React render errors |
| 144 | `APP_META` | App metadata constants |
| 153 | `AppLogo` | Logo with optional text/animation |
| 294 | *Inline CSS* | Global styles + keyframe animations as template literal |
| 608 | **`TimelineOS`** | **Root app component** — all state, auth, views, sidebar, header |
| 3304 | `AuthScreen` | Login/signup (Google OAuth + email/password) |
| 3940 | `MiniCalendar` | Compact month calendar for date picking |
| 4098 | `DayView` | Single-day view with hourly time slots |
| 4995 | `WeekView` | 7-day grid with hourly time slots |
| 5385 | `MonthView` | Full month calendar grid |
| 5616 | `LinearYearView` | Year heatmap with event density coloring |
| 6389 | `EventListItem` | `React.memo` — memoized event row |
| 6485 | `FocusView` | Timer + goals focus mode |
| 7184 | `EventListPanel` | Side panel event list with search/filters |
| 7595 | `EventEditor` | Create/edit event modal (with recurrence, tags, all-day) |
| 8068 | `SubscriptionContent` | Billing plans + Stripe checkout integration |
| 8777 | `SharingContent` | Family/team calendar sharing |
| 9055 | `SettingsModal` | Multi-tab settings (Appearance, Behavior, Data) |
| 10155 | `TrashModal` | Soft-deleted events — restore or permanent delete |
| 10373 | `TagManager` | CRUD for tags with icon/color pickers |
| 11050 | `MetricsView` | Life metrics dashboard (sleep, weight, workouts) |
| 11516 | `MultiLineChart` | Multi-series line chart component |
| 11758 | `LifeView` | Life-in-weeks visualization (configurable lifespan 70–90y) |
| 12455 | `App` | Default export — `ErrorBoundary` > `BrowserRouter` > `Routes` |

**Routes:** `/` → TimelineOS, `/privacy` → PrivacyPolicy, `/terms` → TermsOfService

## Key State in TimelineOS (~line 608)

| Variable | Type | Purpose |
|----------|------|---------|
| `user` | User \| null | Authenticated Supabase user |
| `viewMode` | string | `"year"` \| `"month"` \| `"week"` \| `"day"` \| `"linear"` |
| `context` | string | `"personal"` \| `"work"` — switches tag/event namespace |
| `events` | array | Events filtered by current context |
| `deletedEvents` | array | Soft-deleted events (trash) |
| `tags` | object | `{ work: {}, personal: {} }` — tags indexed by context |
| `activeTagIds` | object | Selected tag filter IDs per context |
| `config` | object | User settings (theme, layout, preferences) |
| `currentDate` / `nowTime` | Date | Display date vs real-time clock |
| `modalOpen` / `settingsOpen` / `trashOpen` / `tagManagerOpen` | boolean | Modal visibility flags |
| `editingEvent` | Event \| null | Currently editing event |
| `selectedEvents` / `bulkMode` | array / boolean | Bulk edit state |
| `timers` / `goals` | array | Focus mode data |
| `searchQuery` / `dateFilter` | string / object | Event filtering |

## Styling

**Inline styles only** — no CSS-in-JS, no Tailwind, no styled-components.

CSS files exist only for keyframes + scrollbars: `App.css`, `LinearCalendar.css`

### 12 Themes (`src/constants/themes.js`)

| ID | Display Name | Dark? |
|----|-------------|-------|
| `light` | Sky | No |
| `dark` | Charcoal | **Yes** |
| `midnight` | Midnight | **Yes** |
| `forest` | Forest | **Yes** |
| `sunset` | Sunset | No |
| `lavender` | Lavender | No |
| `barbie` | Barbie | No |
| `arctic` | Arctic | No |
| `monochrome` | Monochrome | No |
| `golden` | Golden | No |
| `emerald` | Emerald | No |
| `rose` | Rose | No |

```js
const isDark = ['dark', 'midnight', 'forest'].includes(theme.id);
```

### Theme Gotchas

- `theme.premiumGlass`, `theme.glass`, `theme.liquidGlass` are often too transparent — use explicit `rgba()` values
- Glass properties vary significantly across themes — always test one light (sky) + one dark (midnight)
- Each theme object has: `bg`, `surface`, `text`, `accent`, `border`, `glass`, `premiumGlass`, `liquidGlass`, `gradient`, and more

## Tech Stack

| Tech | Version | Usage |
|------|---------|-------|
| React | 19.2.3 | CRA (not Next.js) |
| Supabase | ^2.90.1 | Auth (Google OAuth PKCE + email) + Postgres |
| Stripe | ^20.3.1 | Subscriptions via Vercel serverless |
| Recharts | ^3.7.0 | Line, Bar, Area charts |
| visx | ^3.12.0 | Heatmap visualizations |
| date-fns | ^4.1.0 | Date utilities |
| lucide-react | ^0.562.0 | Icons |
| react-router-dom | ^6.28.0 | Client-side routing (3 routes) |
| uuid | ^13.0.0 | ID generation |
| d3 | ^7.9.0 | Data visualization utilities |

**Dev deps:** `sharp` (image processing)

## Environment Variables

### Frontend (`REACT_APP_*` — bundled into client)
| Variable | Purpose |
|----------|---------|
| `REACT_APP_SUPABASE_URL` | Supabase project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase public anon key |
| `REACT_APP_STRIPE_PRO_PRICE_ID` | Stripe monthly price ID |
| `REACT_APP_STRIPE_PRO_YEARLY_PRICE_ID` | Stripe yearly price ID |

### Backend (Vercel serverless only — set in Vercel dashboard)
| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe secret key (never in frontend) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (bypasses RLS) |

**Auth config:** PKCE flow, `persistSession: true`, `autoRefreshToken: true`, `storageKey: 'timeline-auth'`

## Database (Supabase Postgres)

### Tables (14 total)

**Core:**
| Table | Key Columns | Notes |
|-------|------------|-------|
| `users` | id, email, display_name | Auto-created from `auth.users` via trigger |
| `events` | id, user_id, title, start_time, end_time, tag_id, is_deleted, recurrence_pattern, parent_event_id | Soft delete. `tag_id` is UUID FK → `tags.id` (not tag name). Recurrence: none/daily/weekly/fortnightly/monthly/yearly |
| `tags` | id, user_id, name, color, icon, context, border_color, text_color, slug | 15 default tags. Context: `work` or `personal` |
| `user_preferences` | id, user_id, preferences (JSONB) | Per-user settings storage |
| `goals` | id, user_id, title, completed | Focus mode goals |
| `timers` | id, user_id, duration, type | Focus mode sessions |
| `subscriptions` | id, user_id, plan, status, stripe_customer_id, stripe_subscription_id, current_period_start/end | Plans: free/pro. Tracks trial state |

**Telemetry:**
| Table | Key Columns | Notes |
|-------|------------|-------|
| `telemetry_habits` | id, user_id, name, habit_type, active | habit_type: `build` or `eliminate` |
| `telemetry_days` | id, user_id, date, mood_score, notes, memorable_moments, mood_emoji | mood_score: 0–10 |
| `telemetry_completions` | id, user_id, date, habit_id | Unique per (user_id, date, habit_id) |
| `telemetry_month_summaries` | id, user_id, month, memorable_moments | Monthly narrative text |

**Metrics:**
| Table | Key Columns | Notes |
|-------|------------|-------|
| `life_metrics` | id, user_id, date, metric_name, metric_type, value, json_value | metric_type: manual/auto. Tracks sleep, weight, workouts |

**Security:** All tables use RLS with `user_id = auth.uid()` policies. Migration `011_enable_rls_all_tables.sql` enables comprehensive RLS.

## Patterns & Conventions

### UI Patterns
- **Settings modal:** Vertical sidebar tabs + glassmorphic styling
- **Tag management:** SVG icon buttons with hover-reveal actions
- **Habit actions:** Click-to-select pattern with action bar above table (not hover-swap)
- **Modals:** Typically controlled by boolean state flags (`settingsOpen`, `trashOpen`, etc.)
- **Context switching:** `work` / `personal` context toggles separate event + tag namespaces

### Code Patterns
- **Auth redirects:** `window.location.origin` (works on any domain)
- **localStorage key:** `timeline-auth` (Supabase session)
- **Subscription cache:** `localSubscriptionManager` caches pro status in localStorage for offline access
- **Event recurrence:** Parent event has `recurrence_pattern`; children have `parent_event_id` + `recurrence_pattern: 'none'`
- **Soft delete:** Events use `is_deleted` flag; permanent delete is separate operation
- **Tag references:** Always by `tag_id` (UUID), never by tag name string
- **Font stack:** Playfair Display (serif headings) + Inter (sans-serif body) — loaded via Google Fonts in `public/index.html`

### Development Rules
- **Do not split App.js** — the monolith architecture is intentional
- **Inline styles only** — do not introduce CSS modules, Tailwind, or styled-components
- **Install with `--legacy-peer-deps`** — React 19 has unresolved peer dep conflicts
- **Test both themes** — verify any visual change against a light theme (sky) and dark theme (midnight)

## Deployment

| Property | Value |
|----------|-------|
| **Platform** | Vercel |
| **Domain** | `https://timeline.solutions` |
| **Framework** | create-react-app |
| **Build** | `CI=false GENERATE_SOURCEMAP=false npm run build` |
| **API routes** | `/api/*` → Vercel serverless functions |
| **Security headers** | X-Content-Type-Options, X-Frame-Options (DENY), HSTS, Referrer-Policy, X-XSS-Protection |
| **Source maps** | Disabled in production (`GENERATE_SOURCEMAP=false`), `.map` files have `noindex` |

## Branding

| | Value |
|-|-------|
| **App name** | Timeline OS (in-app, og:title) |
| **Company name** | Timeline Solutions (domain, legal, Google OAuth) |
| **Domain** | `https://timeline.solutions` |
| **Theme color** | `#F97316` (orange) |
| **Supabase project** | `zywodfjarbppgdgmvfxw.supabase.co` |
| **Google OAuth** | Verified, published as "Timeline Solutions" |
