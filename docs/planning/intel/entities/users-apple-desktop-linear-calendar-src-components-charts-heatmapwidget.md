---
path: /Users/apple/Desktop/linear-calendar/src/components/charts/HeatmapWidget.js
type: component
updated: 2026-01-26
status: active
---

# HeatmapWidget.js

## Purpose

Renders a themed circular heatmap visualization for activity data using visx. Provides a customizable widget that adapts to theme colors and displays data density through circle fills.

## Exports

- `HeatmapWidget`: React component that renders activity data as a circular heatmap with dynamic color scaling based on data values

## Dependencies

- @visx/heatmap (HeatmapCircle)
- @visx/scale (scaleLinear)

## Used By

TBD

## Notes

Uses circular bins instead of rectangular cells. Color scale dynamically adapts from theme card color to accent color based on maximum count value in dataset. Grid dimensions calculated based on width/height and assumption of 7 columns.