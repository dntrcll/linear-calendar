# Timeline OS

A premium calendar and life-tracking app built with React. Visualize your time across day, week, month, and year views. Track habits, metrics, and goals — all in one place.

**Live at [timeline.solutions](https://timeline.solutions)**

## Features

- **Calendar views** — Day, week, month, and linear year heatmap
- **Dual contexts** — Separate work and personal calendars
- **Focus mode** — Pomodoro timer with goals tracking
- **Habits tracking** — Daily habit completion with mood scores
- **Life metrics** — Sleep, weight, workout trends over time
- **Life view** — Visualize your life in weeks
- **12 themes** — Sky, Dark, Midnight, Forest, Sunset, Lavender, Barbie, Arctic, Monochrome, Golden, Emerald, Rose
- **Recurring events** — Daily, weekly, fortnightly, monthly, yearly
- **Tag system** — Custom categories with icons and colors
- **Family sharing** — Share calendars with others
- **Stripe billing** — Free trial with Pro subscription

## Tech Stack

- React 19 (Create React App)
- Supabase (Auth + Postgres)
- Google OAuth (PKCE flow)
- Stripe (subscriptions)
- Recharts + visx (charts/heatmaps)
- date-fns, lucide-react
- Deployed on Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- A Stripe account (for billing features)

### Setup

1. Clone the repo
2. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
3. Fill in your Supabase and Stripe keys in `.env.local`
4. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
5. Start the dev server:
   ```bash
   npm start
   ```
   Open [http://localhost:3000](http://localhost:3000)

### Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Dev server on port 3000 |
| `npm run build` | Production build |
| `npm test` | Run tests |
| `npm run test:perf` | Performance tests |

## Project Structure

```
src/
  App.js                 # Main app (~12,450 lines — all UI components)
  supabaseClient.js      # Supabase client init
  services/              # Supabase CRUD operations
    authService.js       # Google OAuth + email auth
    eventService.js      # Calendar events
    tagService.js        # Tags/categories
    metricsService.js    # Life metrics (sleep, weight, etc.)
    telemetryService.js  # Habits tracking
    subscriptionService.js # Stripe billing
  constants/             # Themes, tags, icons, config
  components/            # Charts, telemetry page, layouts
  utils/                 # Date helpers, event logic, instrumentation
  pages/                 # Privacy policy, terms of service
api/                     # Vercel serverless functions (Stripe)
database/                # SQL migrations and scripts
```

## License

Private. All rights reserved.
