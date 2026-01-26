import { lazy } from 'react';

// Lazy load chart components to reduce initial bundle
export const LineChartWidget = lazy(() => import('./LineChartWidget').then(m => ({ default: m.LineChartWidget })));
export const BarChartWidget = lazy(() => import('./BarChartWidget').then(m => ({ default: m.BarChartWidget })));
export const AreaChartWidget = lazy(() => import('./AreaChartWidget').then(m => ({ default: m.AreaChartWidget })));
export const HeatmapWidget = lazy(() => import('./HeatmapWidget').then(m => ({ default: m.HeatmapWidget })));
