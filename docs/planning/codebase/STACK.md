# Technology Stack

**Analysis Date:** 2026-01-25

## Languages

**Primary:**
- JavaScript (ES6+) - Frontend application code
- JSX - React component templates

**Secondary:**
- SQL - Database schema and functions (Supabase)

## Runtime

**Environment:**
- Node.js (version not specified in package.json, uses standard Node environment)

**Package Manager:**
- npm - Defined in package.json
- Lockfile: Present (package-lock.json)

## Frameworks

**Core:**
- React 19.2.3 - UI framework and component system
- React Router DOM 6.28.0 - Client-side routing

**Testing:**
- Jest (via react-scripts) - Test runner and assertion library
- React Testing Library 16.3.1 - Component testing utilities
- Testing Library DOM 10.4.1 - DOM testing utilities
- Testing Library User Event 13.5.0 - User interaction simulation

**Build/Dev:**
- react-scripts 5.0.1 - Build tooling (Create React App wrapper)
- webpack (managed by react-scripts) - Module bundling
- Babel (managed by react-scripts) - JavaScript transpilation

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.90.1 - Supabase client library for database and auth
- d3 7.9.0 - Data visualization library (timeline visualization)
- date-fns 4.1.0 - Date manipulation and formatting utilities
- lucide-react 0.562.0 - Icon library and React components

**Infrastructure:**
- uuid 13.0.0 - UUID generation for unique identifiers
- web-vitals 2.1.4 - Web performance metrics collection
- sharp 0.34.5 (dev) - Image processing library

## Configuration

**Environment:**
- `.env.local` - Local environment configuration file containing:
  - `REACT_APP_SUPABASE_URL` - Supabase project URL
  - `REACT_APP_SUPABASE_ANON_KEY` - Supabase anonymous API key
- Environment variables validated in `src/supabaseClient.js` at initialization

**Build:**
- ESLint configuration via `package.json` extending `react-app` preset
- Default Create React App configuration (no custom webpack/babel configs exposed)

## Platform Requirements

**Development:**
- Node.js with npm
- Modern browser with ES6+ support
- .env.local file with Supabase credentials

**Production:**
- Static hosting (Create React App produces static build output)
- Runtime: Browser-based, no backend server required
- Deployment targets: Vercel, Netlify, or any static host
- Requires internet access to Supabase API

## Authentication

**Provider:** Supabase Auth
- OAuth flow via Google provider
- PKCE flow enabled for security
- Session persistence via localStorage with key `timeline-auth`
- Auto-refresh tokens configured

---

*Stack analysis: 2026-01-25*
