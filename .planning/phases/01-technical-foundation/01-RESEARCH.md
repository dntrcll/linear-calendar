# Phase 1: Technical Foundation - Research

**Researched:** 2026-01-26
**Domain:** Chart libraries, Supabase database schema, metrics calculation, TypeScript types
**Confidence:** HIGH

## Summary

Phase 1 establishes the technical infrastructure for the Insights and Metrics features. This involves installing two charting libraries (Recharts for general charts, Visx for heatmaps), creating the `life_metrics` database table with RLS policies in Supabase, building reusable chart wrapper components, implementing metric calculation utilities, and establishing type definitions.

The codebase uses React 19 with vanilla JavaScript (.js files, not TypeScript). The app has a custom theme system (not Material-UI as stated in PROJECT.md - MUI is not actually installed). D3 is already a dependency. The app uses CSS-in-JS inline styles extensively.

**Primary recommendation:** Install Recharts (for line/bar/area charts) and @visx/heatmap (for calendar heatmap). Create chart wrappers that use the existing theme system's CSS variables. Use JSDoc annotations for type safety without converting to TypeScript.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^2.15.0 | Line, bar, area, pie charts | React-native, composable, 40K+ weekly downloads, works with React 19 |
| @visx/heatmap | ^3.12.0 | Calendar-style heatmap | Airbnb's low-level viz library, 41K weekly downloads, flexible |
| @visx/scale | ^3.12.0 | Scale functions for visx | Required peer for heatmap data mapping |
| @visx/group | ^3.12.0 | SVG grouping for visx | Required peer for heatmap layout |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @visx/responsive | ^3.12.0 | Responsive chart sizing | Wrap visx heatmap for auto-resize |
| d3 | ^7.9.0 (existing) | Utility functions | Already installed - use for scales if needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Chart.js | Chart.js not React-native, requires wrapper |
| Recharts | Victory | Victory larger bundle, less documentation |
| @visx/heatmap | Nivo calendar | Nivo heavier, less customizable |

**Installation:**
```bash
npm install recharts @visx/heatmap @visx/scale @visx/group @visx/responsive
```

**Bundle Impact (estimated):**
- Recharts: ~40KB gzipped (tree-shakeable)
- Visx packages: ~8KB gzipped total
- Total addition: ~48KB gzipped

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    charts/
      ChartWrapper.js       # Base wrapper with theme integration
      LineChartWidget.js    # Recharts LineChart wrapper
      BarChartWidget.js     # Recharts BarChart wrapper
      AreaChartWidget.js    # Recharts AreaChart wrapper
      HeatmapWidget.js      # Visx heatmap wrapper
      index.js              # Exports all chart components
  services/
    metricsService.js       # CRUD for life_metrics table
  utils/
    metricsCalculations.js  # Focus time, productivity score, etc.
  types/
    metrics.js              # JSDoc type definitions
```

### Pattern 1: Chart Wrapper with Theme Integration

**What:** Reusable chart components that consume the existing theme system
**When to use:** Every chart component should use this pattern
**Example:**
```javascript
// Source: Project theme system + Recharts docs
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * @typedef {Object} LineChartWidgetProps
 * @property {Array<Object>} data - Chart data array
 * @property {string} dataKey - Key for Y-axis values
 * @property {string} xDataKey - Key for X-axis values
 * @property {Object} theme - Theme object from app context
 */

/**
 * Themed line chart widget
 * @param {LineChartWidgetProps} props
 */
export const LineChartWidget = ({ data, dataKey, xDataKey, theme, height = 200 }) => {
  const isDark = theme?.id === 'dark' || theme?.id === 'midnight';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <XAxis
          dataKey={xDataKey}
          stroke={theme.textMuted}
          tick={{ fill: theme.textSec, fontSize: 11 }}
        />
        <YAxis
          stroke={theme.textMuted}
          tick={{ fill: theme.textSec, fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            color: theme.text
          }}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={theme.accent}
          strokeWidth={2}
          dot={{ fill: theme.accent, r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

### Pattern 2: Lazy Loading Chart Components

**What:** Code-split chart components to reduce initial bundle
**When to use:** All chart components should be lazy loaded
**Example:**
```javascript
// Source: React docs + Recharts GitHub discussions
import { lazy, Suspense } from 'react';

const LineChartWidget = lazy(() => import('./charts/LineChartWidget'));

// Usage with fallback
const ChartSection = ({ data, theme }) => (
  <Suspense fallback={
    <div style={{
      height: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: theme.card,
      borderRadius: 12
    }}>
      Loading chart...
    </div>
  }>
    <LineChartWidget data={data} theme={theme} />
  </Suspense>
);
```

**Note:** There's a known issue with ResponsiveContainer + Suspense showing width/height warnings. The fallback should have matching dimensions to prevent layout shift.

### Pattern 3: Metrics Service Pattern

**What:** Service layer for database operations following existing eventService.js pattern
**When to use:** All database operations for life_metrics
**Example:**
```javascript
// Source: Existing eventService.js pattern
import { supabase } from '../supabaseClient';

/**
 * Load metrics for date range
 * @param {string} userId - User ID
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {Promise<{data: Array, error: any}>}
 */
export const loadMetrics = async (userId, startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from('life_metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('recorded_at', startDate)
      .lte('recorded_at', endDate)
      .order('recorded_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error loading metrics:', error);
    return { data: [], error };
  }
};
```

### Anti-Patterns to Avoid
- **Importing entire Recharts:** Import specific components `import { LineChart } from 'recharts'` not `import * as Recharts`
- **Hardcoded colors:** Always use theme variables, never hardcode `#3b82f6`
- **Blocking chart loads:** Always lazy load charts, never import synchronously in main bundle
- **Mixed metric types in single column:** Keep manual/auto metrics distinguishable at database level

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Responsive charts | Custom resize listeners | Recharts ResponsiveContainer | Handles ResizeObserver, debouncing |
| Scale calculations | Manual min/max/tick math | @visx/scale or Recharts auto | Edge cases with zero, negatives, dates |
| Heatmap color scales | Manual color interpolation | @visx/scale scaleLinear with color range | Proper color interpolation |
| Date formatting in charts | Manual date string parsing | date-fns (already installed) | Timezone handling, localization |
| UUID generation | Custom ID functions | uuid (already installed) | Collision-free, RFC compliant |
| Chart tooltips | Custom hover state management | Recharts Tooltip component | Positioning, portal rendering |

**Key insight:** Recharts and visx handle many edge cases (negative values, empty data, responsive sizing) that are easy to get wrong when building custom solutions.

## Common Pitfalls

### Pitfall 1: ResponsiveContainer Needs Parent Height
**What goes wrong:** Chart renders with 0 height, console warnings about dimensions
**Why it happens:** ResponsiveContainer uses parent's height, but parent has no explicit height
**How to avoid:** Always ensure parent container has explicit height (px, vh, or flex with min-height)
**Warning signs:** Console warning "The width(0) and height(0) of chart should be greater than 0"

### Pitfall 2: Visx Heatmap Data Structure
**What goes wrong:** Heatmap renders empty or throws errors
**Why it happens:** Visx expects nested bin structure, not flat array
**How to avoid:** Transform data to `[{ bin: colIndex, bins: [{ bin: rowIndex, count: value }] }]` format
**Warning signs:** Empty SVG, undefined errors in scale functions

### Pitfall 3: RLS Policy Missing for New Tables
**What goes wrong:** Users can't read/write their metrics, or worse, can see other users' data
**Why it happens:** Forgetting to enable RLS or create policies after table creation
**How to avoid:** Always create table with `ALTER TABLE life_metrics ENABLE ROW LEVEL SECURITY;` and add policies immediately
**Warning signs:** Empty data despite successful inserts, or seeing unexpected records

### Pitfall 4: Recharts + React 19 Peer Dependency
**What goes wrong:** npm install warnings about peer dependencies
**Why it happens:** Recharts 2.13.x doesn't declare React 19 compatibility
**How to avoid:** Use Recharts 2.15.0+ which has React 19 in peer dependencies
**Warning signs:** npm WARN during install about react peer dependency

### Pitfall 5: Supabase Timestamps Without Timezone
**What goes wrong:** Metrics appear on wrong dates for users in different timezones
**Why it happens:** Using `timestamp` instead of `timestamptz`
**How to avoid:** Always use `TIMESTAMPTZ` for recorded_at column, store in UTC
**Warning signs:** Off-by-one-day errors that vary by user location

## Code Examples

Verified patterns from official sources:

### life_metrics Table Schema
```sql
-- Source: Supabase docs best practices
CREATE TABLE life_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('manual', 'auto')),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  metric_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_life_metrics_user_date ON life_metrics(user_id, recorded_at);
CREATE INDEX idx_life_metrics_type ON life_metrics(metric_type);

-- Enable RLS
ALTER TABLE life_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own metrics" ON life_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metrics" ON life_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metrics" ON life_metrics
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own metrics" ON life_metrics
  FOR DELETE USING (auth.uid() = user_id);
```

### Productivity Score Calculation
```javascript
// Source: Industry patterns + requirements analysis
/**
 * @typedef {Object} ProductivityInputs
 * @property {number} focusTimeMinutes - Total focused work time
 * @property {number} goalCompletionRate - Percentage 0-100
 * @property {number} contextSwitches - Number of context switches
 * @property {number} totalTrackedMinutes - Total tracked time
 */

/**
 * Calculate productivity score (0-100)
 * Formula: (focusRatio * 0.4) + (goalCompletion * 0.4) + (contextPenalty * 0.2)
 * @param {ProductivityInputs} inputs
 * @returns {number} Score 0-100
 */
export const calculateProductivityScore = ({
  focusTimeMinutes,
  goalCompletionRate,
  contextSwitches,
  totalTrackedMinutes
}) => {
  // Focus ratio: percentage of tracked time that was focused work
  const focusRatio = totalTrackedMinutes > 0
    ? Math.min(100, (focusTimeMinutes / totalTrackedMinutes) * 100)
    : 0;

  // Goal completion is already 0-100
  const goalScore = Math.min(100, Math.max(0, goalCompletionRate));

  // Context switch penalty: fewer switches = higher score
  // Assume 0-3 switches is excellent, >10 is poor
  const switchPenalty = Math.max(0, 100 - (contextSwitches * 10));

  // Weighted combination
  const score = (focusRatio * 0.4) + (goalScore * 0.4) + (switchPenalty * 0.2);

  return Math.round(Math.min(100, Math.max(0, score)));
};
```

### Visx Heatmap Data Transformation
```javascript
// Source: @visx/heatmap npm docs
/**
 * Transform daily data into visx heatmap bin structure
 * @param {Array<{date: string, value: number}>} dailyData
 * @returns {Array} Visx-compatible bin structure
 */
export const transformToHeatmapBins = (dailyData) => {
  // Group by week (7 columns for days of week)
  const weeks = [];
  let currentWeek = [];

  dailyData.forEach((day, index) => {
    currentWeek.push({ bin: currentWeek.length, count: day.value });
    if (currentWeek.length === 7 || index === dailyData.length - 1) {
      weeks.push({ bin: weeks.length, bins: currentWeek });
      currentWeek = [];
    }
  });

  return weeks;
};
```

### JSDoc Type Definitions
```javascript
// src/types/metrics.js
// Source: TypeScript JSDoc reference

/**
 * @typedef {'manual' | 'auto'} MetricType
 */

/**
 * @typedef {Object} LifeMetric
 * @property {string} id - UUID
 * @property {string} user_id - User UUID
 * @property {string} recorded_at - ISO timestamp
 * @property {MetricType} metric_type - manual or auto-calculated
 * @property {string} metric_name - e.g., 'sleep_hours', 'productivity_score'
 * @property {number} [metric_value] - Numeric value if applicable
 * @property {Object} [metric_data] - Additional JSON data
 */

/**
 * @typedef {Object} ManualHealthEntry
 * @property {number} [sleep_hours] - 0-24
 * @property {number} [weight] - kg or lbs
 * @property {boolean} [worked_out]
 * @property {string} [workout_type]
 * @property {boolean} [ate_healthy]
 * @property {number} [mood] - 1-5 scale
 * @property {number} [energy] - 1-5 scale
 */

/**
 * @typedef {Object} AutoProductivityMetrics
 * @property {number} focus_time_minutes
 * @property {number} productivity_score - 0-100
 * @property {number} context_switches
 * @property {number} goal_completion_rate - 0-100
 * @property {Object} category_distribution - time per category
 */
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| D3 direct DOM manipulation | React wrapper libraries (Recharts, visx) | 2020+ | Better React integration, no DOM conflicts |
| Full visx bundle | Individual @visx/* packages | Current | Smaller bundles, tree-shaking |
| Recharts peerDependencies only | Recharts 3.x with deps included | 3.0-beta | Simpler install, larger bundle |
| timestamp columns | timestamptz columns | Supabase best practice | Correct timezone handling |

**Deprecated/outdated:**
- `vx` package: Renamed to `@visx/*`, use scoped packages
- Recharts 2.13.x with React 19: Use 2.15.0+ for proper peer dependency

## Responsive Grid System

For dashboard layouts, use CSS Grid (native, no library needed):

```javascript
// 2-column responsive grid pattern
const dashboardGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 16,
  // Collapse to 1 column on mobile
  '@media (max-width: 768px)': {
    gridTemplateColumns: '1fr'
  }
};

// Note: For inline styles, use a helper or media query hook
// The app already uses this pattern in FocusMode component (line 6521-6527 of App.js)
```

The existing codebase already uses `gridTemplateColumns: 'repeat(2, 1fr)'` pattern for 2-column layouts.

## Unit Testing for Calculations

Following existing test patterns in `/tests/`:

```javascript
// tests/metricsCalculations.test.js
// Source: Jest best practices + existing performance.test.js pattern
import { calculateProductivityScore } from '../src/utils/metricsCalculations';

describe('calculateProductivityScore', () => {
  test('returns 0 for no tracked time', () => {
    const result = calculateProductivityScore({
      focusTimeMinutes: 0,
      goalCompletionRate: 0,
      contextSwitches: 0,
      totalTrackedMinutes: 0
    });
    expect(result).toBe(0);
  });

  test('returns 100 for perfect inputs', () => {
    const result = calculateProductivityScore({
      focusTimeMinutes: 480,
      goalCompletionRate: 100,
      contextSwitches: 0,
      totalTrackedMinutes: 480
    });
    expect(result).toBe(100);
  });

  test('penalizes context switches', () => {
    const noSwitches = calculateProductivityScore({
      focusTimeMinutes: 240,
      goalCompletionRate: 50,
      contextSwitches: 0,
      totalTrackedMinutes: 480
    });
    const manySwitches = calculateProductivityScore({
      focusTimeMinutes: 240,
      goalCompletionRate: 50,
      contextSwitches: 10,
      totalTrackedMinutes: 480
    });
    expect(noSwitches).toBeGreaterThan(manySwitches);
  });

  test('clamps values between 0 and 100', () => {
    const result = calculateProductivityScore({
      focusTimeMinutes: 1000,
      goalCompletionRate: 200,
      contextSwitches: -5,
      totalTrackedMinutes: 100
    });
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });
});
```

## Open Questions

Things that couldn't be fully resolved:

1. **Material-UI Integration Requirement**
   - What we know: PROJECT.md mentions Material-UI theming, but MUI is NOT installed in package.json
   - What's unclear: Should we install MUI, or integrate with existing theme system?
   - Recommendation: Use existing theme system (it's comprehensive). Only install MUI if explicitly required later.

2. **Supabase Migration Workflow**
   - What we know: No /supabase directory exists, migrations may be managed via Dashboard
   - What's unclear: Is there a local Supabase setup, or only production?
   - Recommendation: Create migration SQL file in `.planning/` for documentation, apply via Supabase Dashboard

3. **TypeScript vs JSDoc**
   - What we know: Project uses .js files with vanilla JavaScript
   - What's unclear: Is there appetite for TypeScript conversion?
   - Recommendation: Use JSDoc type annotations (TECH-09) without full conversion. Provides IDE support without refactoring.

## Sources

### Primary (HIGH confidence)
- [Recharts GitHub](https://github.com/recharts/recharts) - Installation, React 19 compatibility
- [Recharts Guide](https://recharts.github.io/en-US/guide/installation/) - Component architecture
- [@visx/heatmap npm](https://www.npmjs.com/package/@visx/heatmap) - Data structure, required packages
- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) - Policy patterns
- [Supabase Tables Docs](https://supabase.com/docs/guides/database/tables) - Schema design

### Secondary (MEDIUM confidence)
- [Recharts dark mode discussion](https://github.com/recharts/recharts/actions/runs/20560782224) - CSS variable theming
- [Visx heatmap examples](https://codesandbox.io/examples/package/@visx/heatmap) - Data transformation patterns
- [JavaScript Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices) - AAA pattern, Jest patterns

### Tertiary (LOW confidence)
- WebSearch results for productivity score algorithms - General patterns, no authoritative source
- Bundle size estimates - Based on Bundlephobia reports, may vary with tree-shaking

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official documentation consulted, versions verified
- Architecture: HIGH - Based on existing codebase patterns + official docs
- Pitfalls: MEDIUM - Gathered from GitHub issues + community reports
- Database schema: HIGH - Supabase official docs
- Calculation algorithms: MEDIUM - Industry patterns, no single authoritative source

**Research date:** 2026-01-26
**Valid until:** 2026-02-26 (30 days - libraries are stable)
