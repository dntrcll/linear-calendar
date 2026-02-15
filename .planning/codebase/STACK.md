# Technology Stack

**Analysis Date:** 2026-02-08

## Languages

**Primary:**
- JavaScript (ES6+) - Frontend application code in `src/`
- JSX - React component markup in `*.jsx` files

**Secondary:**
- SQL - Database schema and migrations in `database/migrations/`

## Runtime

**Environment:**
- Node.js v24.12.0 (detected at analysis time)

**Package Manager:**
- npm v11.6.2
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- React 19.2.3 - UI framework and component system
- React Router DOM 6.28.0 - Client-side routing in `src/App.js`
- React DOM 19.2.3 - DOM rendering entry point in `src/index.js`

**Testing:**
- Jest (via react-scripts 5.0.1) - Test runner and assertion library
- React Testing Library 16.3.1 - Component testing utilities
- Testing Library DOM 10.4.1 - DOM testing utilities
- Testing Library User Event 13.5.0 - User interaction simulation

**Build/Dev:**
- react-scripts 5.0.1 - Create React App toolchain (webpack, Babel, ESLint)

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.90.1 - Supabase client for PostgreSQL database and auth
  - Initialized in `src/supabaseClient.js` with PKCE OAuth flow
  - Used across all services: `src/services/authService.js`, `src/services/eventService.js`, `src/services/subscriptionService.js`, `src/services/telemetryService.js`

**Visualization & Charts:**
- recharts 3.7.0 - React chart library for metrics visualization in `src/features/analytics/charts/`
- @visx/heatmap 3.12.0 - Heatmap visualization components
- @visx/scale 3.12.0 - D3 scale utilities for chart axes
- @visx/group 3.12.0 - SVG grouping utilities
- @visx/responsive 3.12.0 - Responsive wrapper components
- d3 7.9.0 - Data transformation utilities
- lucide-react 0.562.0 - Icon library for UI

**Date & Time:**
- date-fns 4.1.0 - Date manipulation and formatting in calendar and event logic

**Utilities:**
- uuid 13.0.0 - UUID generation for entity IDs
- web-vitals 2.1.4 - Performance monitoring

**Dev Dependencies:**
- sharp 0.34.5 - Image processing (used in build pipeline)

## Configuration

**Environment:**
- `.env.local` - Local development variables (not committed)
- Required variables:
  - `REACT_APP_SUPABASE_URL` - Supabase API endpoint
  - `REACT_APP_SUPABASE_ANON_KEY` - Supabase public anonymous key
  - `REACT_APP_STRIPE_PRO_PRICE_ID` (optional) - Stripe monthly price ID for subscriptions
  - `REACT_APP_STRIPE_PRO_YEARLY_PRICE_ID` (optional) - Stripe yearly price ID for subscriptions

**Build:**
- `.npmrc` - npm configuration with `legacy-peer-deps=true` to resolve dependency conflicts
- ESLint: `react-app` preset from react-scripts
- Prettier: Default CRA configuration (no explicit config file found)
- No TypeScript - plain JavaScript project with JSDoc type hints

## Platform Requirements

**Development:**
- Node.js v18+ (tested with v24.12.0)
- npm v11+
- Modern browser with ES6 support
- `.env.local` file with Supabase and optional Stripe credentials

**Production:**
- Static hosting (SPA artifact from react-scripts build)
- Browser-based runtime - no backend server required
- Deployment targets: Vercel, Netlify, or any static host
- Internet access to Supabase API endpoints and optional Stripe API

---

*Stack analysis: 2026-02-08*
