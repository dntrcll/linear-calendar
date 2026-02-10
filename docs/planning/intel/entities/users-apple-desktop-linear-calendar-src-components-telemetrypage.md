---
path: /Users/apple/Desktop/linear-calendar/src/components/TelemetryPage.js
type: component
updated: 2026-01-27
status: active
---

# TelemetryPage.js

## Purpose

Single-page flashcard-style telemetry/journal view that displays a monthly calendar grid with habit tracking, mood logging, sleep tracking, memorable moments, and metrics visualization. Serves as the main Journal page combining daily check-ins with monthly summary charts.

## Exports

- `TelemetryPage` — Main React component rendering the monthly telemetry dashboard with habit completions, mood/sleep editors, and Recharts-based metric graphs.

## Dependencies

- [[telemetryService]] (`loadMonthTelemetry`, `toggleHabitCompletion`, `updateDayTelemetry`, `createHabit`, `archiveHabit`, `updateHabit`)
- [[supabaseClient]] (`supabase`)
- [[icons]] (`ICONS`)
- `react` (useState, useEffect, useMemo)
- `recharts` (LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer)

## Used By

TBD

## Notes

- Uses responsive breakpoints (mobile < 768, tablet < 1024, desktop >= 1024) via window resize listener.
- Habits support two types: `build` (positive) and `break` (negative).
- Mood tracked via 5-level emoji scale; sleep tracked as numeric input.
- Manages significant local state for inline editing of mood, sleep, memorable moments, and habit names.
- Loads metrics from Supabase for monthly summary chart rendering.