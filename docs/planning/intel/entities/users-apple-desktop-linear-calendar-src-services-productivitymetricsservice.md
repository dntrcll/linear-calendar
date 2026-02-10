---
path: /Users/apple/Desktop/linear-calendar/src/services/productivityMetricsService.js
type: service
updated: 2026-01-26
status: active
---

# productivityMetricsService.js

## Purpose

Calculates and persists productivity metrics derived from timeline events, including focus time, context switches, goal completion rates, and productivity scores. Provides both single-day and date-range metric calculation capabilities.

## Exports

- `calculateAndSaveProductivityMetrics` - Calculates and saves productivity metrics for a specific date from timeline events
- `calculateProductivityMetricsRange` - Calculates and saves productivity metrics across a date range

## Dependencies

- [[supabaseClient]] - Database client for persisting metrics
- [[metricsCalculations]] - Utility functions for calculating productivity scores, focus time, and context switches
- External: None

## Used By

TBD

## Notes

Calculates multiple metric types including focus_time, context_switches, goal_completion_rate, productivity_score, total_tracked_time, category_balance, and weekly_velocity. Uses upsert strategy to handle duplicate metrics for the same date.