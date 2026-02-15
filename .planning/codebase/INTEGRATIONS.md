# External Integrations

**Analysis Date:** 2026-02-08

## APIs & External Services

**Authentication:**
- Google OAuth via Supabase Auth
  - SDK/Client: @supabase/supabase-js 2.90.1
  - Implementation: `src/services/authService.js` - `signInWithGoogle()` function
  - Flow: OAuth with PKCE for security
  - Redirect: Post-auth returns to application root

**Payment Processing:**
- Stripe integration for subscriptions (backend API calls via fetch)
  - SDK/Client: Backend endpoints `/api/create-checkout-session` and `/api/create-portal-session`
  - Implementation: `src/services/subscriptionService.js` and `src/features/subscription/subscriptionService.js`
  - Price IDs: Configured via `REACT_APP_STRIPE_PRO_PRICE_ID` and `REACT_APP_STRIPE_PRO_YEARLY_PRICE_ID` env vars
  - Endpoints:
    - `POST /api/create-checkout-session` - Creates Stripe checkout session for purchases
    - `POST /api/create-portal-session` - Creates Stripe portal session for subscription management
  - Customer data: Stored in `subscriptions` table with `stripe_customer_id` and `stripe_subscription_id` fields

**External APIs:**
- Google Fonts - Typography integration via `https://fonts.googleapis.com/css2`
  - Usage: Inter and Playfair Display fonts loaded in `src/App.js`
  - Applied globally in CSS

## Data Storage

**Primary Database:**
- Supabase (PostgreSQL)
  - Connection: `REACT_APP_SUPABASE_URL` - https://zywodfjarbppgdgmvfxw.supabase.co
  - Client: @supabase/supabase-js 2.90.1
  - Authentication: Anonymous key via `REACT_APP_SUPABASE_ANON_KEY`

**Database Tables:**
- `users` - User accounts (created via Supabase auth trigger)
- `events` - Calendar events with timestamps, descriptions, tags, context
- `tags` - Event categories with color coding and context (personal/family/work)
- `user_preferences` - User settings, theme preferences, feature flags
- `subscriptions` - Subscription plans, trial status, Stripe customer IDs
- `life_metrics` - Manual and automated health/productivity metrics
- `telemetry_habits` - User habits for tracking (build/eliminate)
- `telemetry_days` - Daily mood scores, notes, memorable moments
- `telemetry_completions` - Daily habit completion tracking
- `telemetry_month_summaries` - Monthly narrative summaries

**File Storage:**
- Local filesystem only - No cloud file storage (S3, GCS, etc.)
- Images served from `public/` directory

**Caching:**
- Browser localStorage - Auth session stored with key `timeline-auth`
- Subscription data cached in localStorage via `localSubscriptionManager` in `src/services/subscriptionService.js`
- No Redis or external caching service

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (PostgreSQL-backed)
  - OAuth: Google provider with PKCE flow
  - Email/Password: Support for password authentication
  - Magic Links: OTP-based email authentication
  - Session persistence: localStorage with key `timeline-auth`
  - Auto-refresh tokens: Enabled for seamless auth

**Key Functions in `src/services/authService.js`:**
- `signInWithGoogle()` - OAuth with Google
- `signInWithEmail()` - Magic link (OTP) authentication
- `signInWithPassword()` - Email + password authentication
- `signUpWithEmail()` - User registration with email/password
- `signOut()` - Logout and session cleanup
- `onAuthStateChange()` - Listen for auth events and sync user records

**User Record Creation:**
- Triggered automatically when user signs in via database trigger
- Fallback sync in `ensureUserRecord()` if trigger is delayed

## Monitoring & Observability

**Error Tracking:**
- Not implemented - No Sentry, Bugsnag, or similar service

**Logs:**
- Browser console: `console.log()` and `console.error()` throughout codebase
- Development-only instrumentation: `src/utils/instrumentation.js`
- Labeled logs: `[Auth]`, `[Subscription]`, `[Event]` prefixes for debugging

**Performance Metrics:**
- web-vitals 2.1.4 - Web performance metrics collection
- Metrics reported via `reportWebVitals()` in `src/index.js`

## CI/CD & Deployment

**Hosting:**
- Static deployment (Create React App SPA)
- Likely deployed to Vercel (inferred from deployment patterns in commits)

**CI Pipeline:**
- Not detected in codebase
- Likely configured in Vercel dashboard or GitHub Actions

## Environment Configuration

**Required env vars:**
- `REACT_APP_SUPABASE_URL` - Supabase project endpoint
- `REACT_APP_SUPABASE_ANON_KEY` - Supabase anonymous public key

**Optional env vars:**
- `REACT_APP_STRIPE_PRO_PRICE_ID` - Stripe monthly price ID (defaults to 'price_pro_monthly' if not set)
- `REACT_APP_STRIPE_PRO_YEARLY_PRICE_ID` - Stripe yearly price ID (defaults to 'price_pro_yearly' if not set)
- `NODE_ENV` - Automatically set to 'development' or 'production' by build system

**Secrets Location:**
- Local development: `.env.local` file (git-ignored)
- Production: Vercel environment variables dashboard

## Webhooks & Callbacks

**Incoming:**
- OAuth callback from Google during authentication
- Supabase auth state change events via `supabase.auth.onAuthStateChange()`
- RLS policy enforcement by Supabase for row-level access control

**Outgoing:**
- Stripe checkout redirect URLs:
  - Success: `{origin}/subscription/success`
  - Cancel: `{origin}/subscription/cancel`
- Stripe portal return URL: `{origin}/settings`

## Data Access & Security

**Row-Level Security (RLS):**
- Enabled on all Supabase tables
- All queries filtered by `user_id` via Supabase RLS policies
- Implementation pattern: All service queries include `.eq('user_id', userId)` filter
  - `src/services/eventService.js` - Events isolated by user
  - `src/services/tagService.js` - Tags isolated by user
  - `src/services/telemetryService.js` - Telemetry isolated by user
  - `src/services/subscriptionService.js` - Subscriptions isolated by user

**API Key Security:**
- Anonymous key used for frontend (safe for browser)
- Service role key stored only in backend API (not visible in frontend code)

---

*Integration audit: 2026-02-08*
