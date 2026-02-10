---
path: /Users/apple/Desktop/linear-calendar/src/components/InsightsDashboard.js
type: component
updated: 2026-01-26
status: active
---

# InsightsDashboard.js

## Purpose

Renders a dense 2-column dashboard displaying personal productivity insights and metrics visualizations. Calculates and presents today's metrics (hours tracked, goals completed, focus sessions, streak) and weekly trend charts based on calendar events and goals data.

## Exports

- `InsightsDashboard` - React component that accepts events, goals, tags, theme, config, accentColor, and onClose props to render the insights dashboard UI

## Dependencies

- react (external)
- [[charts]] - LineChartWidget, BarChartWidget, AreaChartWidget components
- [[metricsCalculations]] - calculateProductivityScore, calculateFocusTime, calculateContextSwitches, calculateGoalCompletionRate utilities
- [[icons]] - ICONS constants

## Used By

TBD

## Notes

Uses useMemo for performance optimization when calculating today's metrics and weekly data from potentially large event/goal datasets. Implements streak calculation by checking for events in previous days up to 365 days back.