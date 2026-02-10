---
path: /Users/apple/Desktop/linear-calendar/src/App.js
type: component
updated: 2026-01-26
status: active
---

# App.js

## Purpose

Main application component that serves as the root of the Linear Calendar app. Handles routing, authentication state, event management, tag management, theme switching, focus modes, and integrates instrumentation/telemetry tracking across the entire application lifecycle.

## Exports

- `default` (App): Main application component with routing, authentication, and calendar functionality
- `App`: Named export of the same component

## Dependencies

**External:**
- react, react-router-dom

**Internal:**
- [[PrivacyPolicy]]
- [[TermsOfService]]
- [[constants]]
- [[utils]]
- [[authService]]
- [[eventService]]
- [[tagService]]
- [[userPreferencesService]]
- [[supabaseClient]]
- [[instrumentation]]
- [[InsightsDashboard]]
- [[MetricsTab]]
- [[TelemetryPage]]
- [[icons]]

## Used By

TBD

## Notes

- Contains ErrorBoundary class component for error handling
- Implements comprehensive state management for events, tags, themes, focus modes, and timers
- Integrates performance monitoring via `recordPerformance` and `runAnalysisCycle`
- Uses `runAllGuards` for data integrity validation
- Provides routing for /privacy and /terms pages
- Manages real-time Supabase subscriptions for events and tags