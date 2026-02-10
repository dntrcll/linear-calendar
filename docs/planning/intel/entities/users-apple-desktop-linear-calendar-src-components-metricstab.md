---
path: /Users/apple/Desktop/linear-calendar/src/components/MetricsTab.js
type: component
updated: 2026-01-26
status: active
---

# MetricsTab.js

## Purpose

Implements a 3-tab metrics system (Dashboard, Log, Add Entry) for tracking and visualizing personal health and productivity metrics. Provides functionality to view metric trends, log entries, add new metrics, and calculate productivity metrics from calendar events.

## Exports

- `MetricsTab` - Main component that renders the metrics interface with dashboard analytics, metric log, and entry form tabs

## Dependencies

- [[metricsService]] - CRUD operations for metric data
- [[productivityMetricsService]] - Calculates productivity metrics from calendar events
- [[icons]] - Icon constants for UI elements
- React - UI framework with hooks (useState, useEffect, useMemo)

## Used By

TBD

## Notes

Requires authenticated user (user.uid) to load and manage metrics. Loads last 3 months of data by default. Productivity calculation uses last 30 days of calendar events.