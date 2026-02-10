# External Integrations

**Analysis Date:** 2026-01-25

## APIs & External Services

**Quote Service:**
- Quotable.io API - Fetches random inspirational quotes
  - SDK/Client: Native fetch API
  - Endpoint: `https://api.quotable.io/random?tags=inspirational|motivational|success|wisdom`
  - Fallback: Local hardcoded quotes in constants if API fails
  - Usage: `src/App.js` - `fetchLiveQuote()` function, refreshes every 4 hours

## Data Storage

**Primary Database:**
- Supabase (PostgreSQL)
  - Connection: `REACT_APP_SUPABASE_URL` - https://zywodfjarbppgdgmvfxw.supabase.co
  - Client: @supabase/supabase-js 2.90.1
  - Tables: users, events, tags, user_preferences
  - Auth: Supabase Auth with JWT tokens

**Database Schemas:**
- `users` - User account records (created via auth trigger)
- `events` - Calendar events with soft-delete support
- `tags` - Event categories/tags with context separation (personal/family)
- `user_preferences` - User settings and UI preferences

**File Storage:**
- Not detected - Application does not use cloud file storage

**Caching:**
- Browser localStorage - Stores auth session with key `timeline-auth`
- No Redis or external caching service detected

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (PostgreSQL-backed)
  - Google OAuth flow via `signInWithGoogle()` function
  - PKCE flow enabled for OAuth security
  - Session management: Auto-refresh tokens enabled
  - Redirect: Returns to application root after auth
  - Implementation location: `src/services/authService.js`
  - Client config: `src/supabaseClient.js`

**Key Functions:**
- `signInWithGoogle()` - Initiates OAuth flow with Google
- `signOut()` - Logs out user and clears session
- `onAuthStateChange()` - Listens for auth state changes and syncs user records

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, Bugsnag, or similar service

**Logs:**
- Browser console logging via `console.log()` and `console.error()`
- Dev-only instrumentation via `src/utils/instrumentation.js`
- Web Vitals reporting to analytics (configured but endpoint not specified)

## CI/CD & Deployment

**Hosting:**
- Vercel (inferred from commit messages mentioning "Trigger Vercel deployment")
- Supports static build output from Create React App

**CI Pipeline:**
- Not detected in codebase - Likely configured in Vercel dashboard

## Environment Configuration

**Required env vars:**
- `REACT_APP_SUPABASE_URL` - Supabase project endpoint
- `REACT_APP_SUPABASE_ANON_KEY` - Supabase anonymous API key (public, safe for frontend)

**Optional env vars:**
- `NODE_ENV` - Set to 'development' or 'production' by build system

**Secrets location:**
- `.env.local` file (local development)
- Vercel environment variables dashboard (production)

## Webhooks & Callbacks

**Incoming:**
- OAuth callback from Google during sign-in
- Supabase auth state callbacks via `onAuthStateChange()`
- No custom webhook endpoints in frontend

**Outgoing:**
- None detected

## Data Sync Patterns

**Real-time:**
- Not implemented - Application uses request-response pattern

**Row-Level Security (RLS):**
- Enabled in Supabase - All queries filtered by `user_id` in services
- Implementation: `src/services/eventService.js`, `src/services/tagService.js`, `src/services/userPreferencesService.js`
- All Supabase queries include `.eq('user_id', userId)` filters

---

*Integration audit: 2026-01-25*
