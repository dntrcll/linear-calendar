---
path: /Users/apple/Desktop/linear-calendar/src/components/charts/index.js
type: module
updated: 2026-01-26
status: active
---

# index.js

## Purpose

Barrel export file that provides lazy-loaded chart components to optimize initial bundle size by code-splitting visualization widgets.

## Exports

- `LineChartWidget` - Lazy-loaded line chart component for time-series data visualization
- `BarChartWidget` - Lazy-loaded bar chart component for categorical comparisons
- `AreaChartWidget` - Lazy-loaded area chart component for cumulative or stacked data
- `HeatmapWidget` - Lazy-loaded heatmap component for intensity-based visualizations

## Dependencies

- react (lazy)
- [[LineChartWidget]]
- [[BarChartWidget]]
- [[AreaChartWidget]]
- [[HeatmapWidget]]

## Used By

TBD

## Notes

Uses React.lazy() with custom import transformations to ensure proper named export handling from child components.