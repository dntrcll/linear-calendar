---
path: /Users/apple/Desktop/linear-calendar/src/components/charts/AreaChartWidget.js
type: component
updated: 2026-01-26
status: active
---

# AreaChartWidget.js

## Purpose

Renders a themed area chart visualization using Recharts library. Provides a configurable area chart component that accepts theming props for consistent visual styling across the application.

## Exports

- `AreaChartWidget`: React component that renders a responsive area chart with customizable data, styling, and dimensions

## Dependencies

- recharts (external: AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer)

## Used By

TBD

## Notes

The component has a syntax error in the Tooltip contentStyle border property (missing value). Default height is 200px but can be overridden via props. Chart styling is fully theme-aware through the theme prop object.