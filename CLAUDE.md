# Timeline OS - Claude Code Instructions

## Quick Reference

```bash
npm start          # Dev server on http://localhost:3000
npm run build      # Production build (CI=false via vercel.json)
npm test           # Jest tests (interactive watch mode)
npm run test:perf  # Performance tests
```

Install: `npm install --legacy-peer-deps` (required due to React 19 peer dep conflicts)

## Architecture

**Single-file React app** — `src/App.js` (~12,450 lines) contains most UI components. This is intentional, not tech debt to fix.

| Layer | Location | Purpose |
|-------|----------|---------|
| Main UI | `src/App.js` | All calendar views, modals, settings, auth |
| Services | `src/services/` | Supabase CRUD (events, tags, metrics, telemetry, subscriptions, auth) |
| Constants | `src/constants/` | Themes, tags, icons, config, layout, quotes |
| Utils | `src/utils/` | Date helpers, event logic, instrumentation, metrics calculations |
| Charts | `src/components/charts/` | Recharts-based widgets (Line, Bar, Area, Heatmap) |
| Telemetry | `src/components/TelemetryPage.js` | Habits tracking page |
| Pages | `src/pages/` | PrivacyPolicy, TermsOfService |
| API | `api/` | Vercel serverless functions (Stripe checkout, webhooks, portal) |

## App.js Component Map

| Line | Component | Description |
|------|-----------|-------------|
| 77 | `ErrorBoundary` | Class component, catches React errors |
| 146 | `APP_META` | App metadata constants |
| 155 | `AppLogo` | Logo with optional text/animation |
| 296 | CSS string | Global inline CSS and keyframe animations |
| 610 | `TimelineOS` | **Main component** — all state, auth, views, sidebar, header |
| 3316 | `AuthScreen` | Login/signup UI, Google OAuth, email auth |
| 3952 | `MiniCalendar` | Small month calendar for date picking |
| 4110 | `DayView` | Single day with hourly time slots |
| 5007 | `WeekView` | 7-day grid with hourly time slots |
| 5397 | `MonthView` | Full month calendar grid |
| 5627 | `LinearYearView` | Year heatmap with event density |
| 6400 | `EventListItem` | Memoized event row for lists |
| 6496 | `FocusView` | Timer/goals focus mode |
| 7195 | `EventListPanel` | Side panel event list with filters |
| 7606 | `EventEditor` | Create/edit event modal |
| 8079 | `SubscriptionContent` | Billing plans, Stripe integration |
| 8770 | `SharingContent` | Family/team calendar sharing |
| 9048 | `SettingsModal` | Multi-tab settings (appearance, behavior, data) |
| 10148 | `TrashModal` | Soft-deleted events, restore/permanent delete |
| 10366 | `TagManager` | CRUD for tags with icon/color pickers |
| 11042 | `MetricsView` | Life metrics dashboard (sleep, weight, workouts) |
| 11508 | `MultiLineChart` | Multi-series line chart for metrics |
| 11749 | `LifeView` | Life-in-weeks visualization |
| 12446 | `App` | Default export — ErrorBoundary + React Router |

## Styling

- **Inline styles only** — no CSS modules, no Tailwind, no styled-components
- Two CSS files exist: `App.css` and `LinearCalendar.css` (for keyframes/scrollbars only)
- 12 themes defined in `src/constants/themes.js`: light, dark, midnight, forest, sunset, lavender, barbie, arctic, monochrome, golden, emerald, rose
- Dark theme detection: `isDark = theme.id === 'dark' || theme.id === 'midnight' || theme.id === 'forest'`

### Theme Pitfalls

- `theme.premiumGlass` and similar glass properties are often too transparent — use explicit `rgba()` values instead
- Always test changes against both a light theme (sky/light) and dark theme (midnight)
- Theme properties like `theme.glass`, `theme.liquidGlass` exist but vary significantly per theme

## Tech Stack

- React 19 (CRA, not Next.js)
- Supabase (auth + Postgres database)
- Google OAuth (PKCE flow, verified as "Timeline Solutions")
- Stripe (subscriptions via Vercel serverless API routes)
- Recharts + visx (charts/heatmaps)
- date-fns (date utilities)
- lucide-react (icons)
- Deployed on Vercel at `https://timeline.solutions`

## Environment Variables

### Frontend (REACT_APP_*)
- `REACT_APP_SUPABASE_URL` — Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY` — Supabase anonymous/public key
- `REACT_APP_STRIPE_PRO_PRICE_ID` — Stripe monthly price ID
- `REACT_APP_STRIPE_PRO_YEARLY_PRICE_ID` — Stripe yearly price ID

### Backend (Vercel serverless)
- `STRIPE_SECRET_KEY` — Stripe secret key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-side only)

## Database (Supabase Postgres)

### Core Tables
- **users** — synced from `auth.users` via trigger
- **events** — calendar events (with soft delete, recurrence support)
- **tags** — user-defined categories with colors/icons per context
- **user_preferences** — settings/config per user
- **goals** — user goals for focus mode
- **timers** — focus mode timer sessions
- **subscriptions** — Stripe subscription state

### Telemetry Tables
- **telemetry_habits** — user-defined habits to track
- **telemetry_days** — daily mood scores and notes
- **telemetry_completions** — habit completion records per day
- **telemetry_month_summaries** — monthly aggregated summaries

### Metrics Table
- **life_metrics** — sleep hours, weight, workout data

All tables use RLS with `user_id = auth.uid()` policies. Events use `tag_id` (UUID FK to tags.id) not tag name strings.

## Key Patterns

- **Settings modal**: Vertical sidebar tabs with glassmorphic styling
- **Tag management**: SVG icon buttons with hover-reveal pattern
- **Habit header actions**: Click-to-select pattern with action bar above table (not hover-swap)
- **Auth redirects**: Uses `window.location.origin` (dynamic, works on any domain)
- **Auth storage key**: `timeline-auth` in localStorage

## Branding

- **App name**: Timeline OS (in-app, og-image)
- **Company name**: Timeline Solutions (domain, legal, Google OAuth)
- **Domain**: `https://timeline.solutions`
- **Supabase project**: `zywodfjarbppgdgmvfxw.supabase.co`
