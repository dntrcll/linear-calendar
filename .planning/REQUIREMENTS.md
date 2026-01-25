# Requirements: Timeline OS Improvements

**Defined:** 2026-01-26
**Core Value:** Effortless visibility into how you spend your time and how you're progressing toward your goals

## v1 Requirements

### Insights Tab Redesign

- [ ] **INS-01**: User sees dense 2-column grid layout that fits entire dashboard without scrolling
- [ ] **INS-02**: User sees total hours tracked today in overview widget
- [ ] **INS-03**: User sees goals completed today (X/Y format with percentage)
- [ ] **INS-04**: User sees active time vs idle time breakdown
- [ ] **INS-05**: User sees number of focus sessions completed today
- [ ] **INS-06**: User sees current streak indicator (days of consistent tracking)
- [ ] **INS-07**: User sees weekly time by category in compact bar chart
- [ ] **INS-08**: User sees daily activity heatmap showing 7-day view
- [ ] **INS-09**: User sees productivity curve chart (time-of-day performance)
- [ ] **INS-10**: User sees context split visualization (Personal vs Work donut chart)
- [ ] **INS-11**: User sees category breakdown with horizontal bars and percentages
- [ ] **INS-12**: User sees longest focus session today
- [ ] **INS-13**: User sees best day this week metric
- [ ] **INS-14**: User sees most-used category
- [ ] **INS-15**: User sees average daily hours this week
- [ ] **INS-16**: User sees auto-calculated productivity score (0-100 with color coding)
- [ ] **INS-17**: User sees productivity trend arrow (up/down/stable)
- [ ] **INS-18**: Dashboard layout is responsive for mobile/tablet breakpoints
- [ ] **INS-19**: All charts use Recharts library with Material-UI theme integration
- [ ] **INS-20**: Heatmap uses Visx library for calendar-style visualization

### Metrics Tab - Architecture

- [ ] **MET-01**: Metrics tab has three sub-tabs: Dashboard, Log, Add Entry
- [ ] **MET-02**: Supabase table `life_metrics` exists with proper schema
- [ ] **MET-03**: RLS policies configured for `life_metrics` table (user can only see own data)
- [ ] **MET-04**: System distinguishes between manual entries and auto-calculated metrics

### Metrics Tab - Manual Health Tracking

- [ ] **MET-05**: User can enter sleep hours (number input, decimal allowed)
- [ ] **MET-06**: User can enter weight (number input with kg/lbs unit toggle)
- [ ] **MET-07**: User can log workout (boolean + optional type/duration/sets/reps/weight)
- [ ] **MET-08**: User can mark if they ate healthy meals today (yes/no boolean)
- [ ] **MET-09**: User can optionally rate mood/energy level (1-5 scale)
- [ ] **MET-10**: Add Entry modal pre-fills with today's date
- [ ] **MET-11**: Add Entry modal provides smart defaults based on recent patterns
- [ ] **MET-12**: User can bulk enter metrics for multiple days at once

### Metrics Tab - Auto-Calculated Productivity

- [ ] **MET-13**: System auto-calculates focus time per day from timeline events
- [ ] **MET-14**: System auto-calculates productivity score from goals + focus time
- [ ] **MET-15**: System auto-calculates context switching frequency (switches per day)
- [ ] **MET-16**: System auto-calculates goal completion rate (percentage)
- [ ] **MET-17**: System auto-calculates category balance (time distribution across tags)
- [ ] **MET-18**: System auto-calculates weekly velocity (trend comparison week-over-week)

### Metrics Tab - Dashboard View

- [ ] **MET-19**: Dashboard displays grid of compact chart cards using Recharts
- [ ] **MET-20**: User sees sleep trend line chart (30-day view)
- [ ] **MET-21**: User sees weight progress line chart with goal line overlay
- [ ] **MET-22**: User sees workout frequency bar chart (grouped by week)
- [ ] **MET-23**: User sees healthy eating streak visual indicator
- [ ] **MET-24**: User sees productivity score trend line chart
- [ ] **MET-25**: User sees focus time breakdown stacked area chart
- [ ] **MET-26**: Dashboard shows correlation insights (e.g., "Best productivity after 7+ hrs sleep")
- [ ] **MET-27**: All charts are compact and fit dashboard view without scrolling
- [ ] **MET-28**: Charts use Material-UI dark theme colors

### Metrics Tab - Log View

- [ ] **MET-29**: Log displays chronological list of all entries (newest first)
- [ ] **MET-30**: User can filter log by type (health/productivity/all)
- [ ] **MET-31**: User can select date range for log view
- [ ] **MET-32**: User can edit existing log entries inline
- [ ] **MET-33**: User can delete log entries with confirmation
- [ ] **MET-34**: Log visually distinguishes auto-calculated vs manual entries
- [ ] **MET-35**: Log shows entry timestamps

### Metrics Tab - Data Management

- [ ] **MET-36**: User can export metrics data to CSV
- [ ] **MET-37**: Dashboard displays weekly summary card
- [ ] **MET-38**: Dashboard displays monthly summary card
- [ ] **MET-39**: System validates metric entries (reasonable ranges for sleep/weight/etc)
- [ ] **MET-40**: System shows error messages for invalid entries

### Technical Infrastructure

- [ ] **TECH-01**: Install Recharts library (~139 KB)
- [ ] **TECH-02**: Install Visx heatmap package (~8 KB)
- [ ] **TECH-03**: Create reusable chart wrapper components with Material-UI theming
- [ ] **TECH-04**: Implement lazy loading for chart components to optimize performance
- [ ] **TECH-05**: Create database migration for `life_metrics` table
- [ ] **TECH-06**: Create Supabase RLS policies for `life_metrics`
- [ ] **TECH-07**: Create metrics calculation service/utility functions
- [ ] **TECH-08**: Implement responsive grid system for dashboard layouts
- [ ] **TECH-09**: Add proper TypeScript types for metrics data structures
- [ ] **TECH-10**: Write unit tests for metric calculation algorithms

## v2 Requirements

### Advanced Analytics

- **ADV-01**: Machine learning predictions for productivity patterns
- **ADV-02**: Goal recommendation engine based on historical data
- **ADV-03**: Anomaly detection (unusual patterns flagged)
- **ADV-04**: Multi-week/month/year trend comparisons

### Integrations

- **INT-01**: Import sleep data from Apple Health / Google Fit
- **INT-02**: Import workout data from fitness apps
- **INT-03**: Export to Apple Health / Google Fit

### Social Features

- **SOC-01**: Share anonymized productivity insights
- **SOC-02**: Compare against aggregate anonymous benchmarks

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time collaborative dashboards | Personal tool, no collaboration needed |
| Mobile native apps | Web-first, mobile-responsive is sufficient |
| Paid tier / monetization | Personal project, not commercial product |
| Third-party dashboard builders | Custom dashboards meet specific needs better |
| Video/audio attachments to metrics | Unnecessary complexity, text notes sufficient |

## Traceability

*Will be populated during roadmap creation*

| Requirement | Phase | Status |
|-------------|-------|--------|
| (Empty - to be filled by roadmapper) | | |

**Coverage:**
- v1 requirements: 60 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 60 ⚠️

---
*Requirements defined: 2026-01-26*
*Last updated: 2026-01-26 after initial definition*
