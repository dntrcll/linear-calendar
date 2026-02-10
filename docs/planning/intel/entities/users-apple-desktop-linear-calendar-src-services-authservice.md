---
path: /Users/apple/Desktop/linear-calendar/src/services/authService.js
type: service
updated: 2026-02-02
status: active
---

# authService.js

## Purpose

Provides authentication services for the application using Supabase Auth. Handles Google OAuth, email magic link, and email/password authentication flows.

## Exports

- `signInWithGoogle` - Initiates Google OAuth sign-in flow with offline access and consent prompt
- `signOut` - Signs out the current user from Supabase auth
- `signInWithEmail` - Sends a magic link (OTP) to the specified email for passwordless sign-in
- `signUpWithEmail` - Creates a new user account with email and password
- `signInWithPassword` - Authenticates an existing user with email and password
- `onAuthStateChange` - Subscribes to authentication state changes with a callback

## Dependencies

- [[supabaseClient]] - Supabase client instance for auth operations

## Used By

TBD

## Notes

- All auth functions return consistent `{ data, error }` response objects
- Google OAuth configured with `access_type: 'offline'` and `prompt: 'consent'` for refresh tokens
- Magic link sign-in auto-creates users with `shouldCreateUser: true`
- Email inputs are trimmed before processing
- Comprehensive console logging with `[Auth]` prefix for debugging