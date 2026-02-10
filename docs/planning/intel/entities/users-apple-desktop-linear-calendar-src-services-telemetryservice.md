---
path: /Users/apple/Desktop/linear-calendar/src/services/telemetryService.js
type: service
updated: 2026-01-26
status: active
---

# telemetryService.js

## Purpose

Provides data access layer for the telemetry/health tracking system, managing habits, daily mood scores, habit completions, and monthly summaries. Handles all database operations for the telemetry feature through Supabase.

## Exports

- `loadMonthTelemetry` - Loads all telemetry data (habits, days, completions, summary) for a specific month and user
- `toggleHabitCompletion` - Toggles habit completion status for a specific day using upsert
- `updateDayTelemetry` - Updates or creates daily mood score and notes
- `updateMonthSummary` - Updates or creates monthly summary text
- `createHabit` - Creates a new habit with display order
- `updateHabit` - Updates existing habit name and/or display order
- `archiveHabit` - Soft-deletes a habit by setting active to false

## Dependencies

[[supabaseClient]]

## Used By

TBD

## Notes

Uses upsert pattern with onConflict for completion toggling and day updates to handle create-or-update scenarios. All functions return `{data, error}` tuples for consistent error handling.