# Roadmap: Timeline OS Improvements

## Overview

Timeline OS improvements transform the existing insights dashboard into a dense, information-rich analytics experience and rebuild the metrics system to combine manual health tracking with auto-calculated productivity metrics. The journey begins with foundational infrastructure (chart libraries, database tables, RLS policies), redesigns the Insights tab with compact visualizations, then builds out the complete Metrics system with manual entry forms, auto-calculated productivity metrics, dashboard charts, chronological logs, and data export.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Technical Foundation** - Install chart libraries, create database infrastructure, configure RLS policies
- [ ] **Phase 2: Insights Dashboard Redesign** - Transform insights tab into dense 2-column layout with compact charts
- [ ] **Phase 3: Metrics Architecture** - Build metrics tab structure with sub-tabs and data model
- [ ] **Phase 4: Metrics Core Features** - Implement manual health tracking and auto-calculated productivity metrics
- [ ] **Phase 5: Metrics Dashboard** - Create chart-based dashboard with trend visualizations and correlations
- [ ] **Phase 6: Metrics Log & Data Management** - Build chronological log view and data export functionality

## Phase Details

### Phase 1: Technical Foundation
**Goal**: Chart libraries installed, database tables created, and infrastructure ready for insights and metrics features
**Depends on**: Nothing (first phase)
**Requirements**: TECH-01, TECH-02, TECH-03, TECH-04, TECH-05, TECH-06, TECH-07, TECH-08, TECH-09, TECH-10
**Success Criteria** (what must be TRUE):
  1. Recharts and Visx libraries are installed and importable in components
  2. `life_metrics` table exists in Supabase with proper schema and RLS policies
  3. Chart wrapper components render with Material-UI dark theme styling
  4. Metric calculation utility functions correctly compute focus time and productivity scores from timeline data
  5. TypeScript types exist for metrics data structures with proper validation
**Plans**: TBD

Plans:
- [ ] TBD during plan-phase

### Phase 2: Insights Dashboard Redesign
**Goal**: Insights tab displays dense 2-column dashboard with all metrics visible without scrolling
**Depends on**: Phase 1
**Requirements**: INS-01, INS-02, INS-03, INS-04, INS-05, INS-06, INS-07, INS-08, INS-09, INS-10, INS-11, INS-12, INS-13, INS-14, INS-15, INS-16, INS-17, INS-18, INS-19, INS-20
**Success Criteria** (what must be TRUE):
  1. User sees entire insights dashboard without scrolling on desktop (1920x1080 viewport)
  2. User sees today's overview metrics (hours tracked, goals completed, active time, focus sessions, current streak) in compact cards
  3. User sees weekly trend visualizations (time by category bar chart, 7-day activity heatmap, productivity curve line chart)
  4. User sees context split donut chart comparing Personal vs Work time distribution
  5. User sees auto-calculated productivity score (0-100) with color coding and trend arrow
  6. Dashboard layout adapts responsively for mobile and tablet viewports
**Plans**: TBD

Plans:
- [ ] TBD during plan-phase

### Phase 3: Metrics Architecture
**Goal**: Metrics tab has three sub-tabs (Dashboard, Log, Add Entry) with working navigation and data model
**Depends on**: Phase 1
**Requirements**: MET-01, MET-02, MET-03, MET-04
**Success Criteria** (what must be TRUE):
  1. Metrics tab displays three sub-tabs (Dashboard, Log, Add Entry) with working navigation
  2. System correctly distinguishes between manual entries and auto-calculated metrics in database
  3. User can only view and edit their own metrics data (RLS policies enforce user isolation)
  4. Metrics components can read from and write to `life_metrics` table
**Plans**: TBD

Plans:
- [ ] TBD during plan-phase

### Phase 4: Metrics Core Features
**Goal**: Users can manually enter health metrics and system auto-calculates productivity metrics from timeline data
**Depends on**: Phase 3
**Requirements**: MET-05, MET-06, MET-07, MET-08, MET-09, MET-10, MET-11, MET-12, MET-13, MET-14, MET-15, MET-16, MET-17, MET-18
**Success Criteria** (what must be TRUE):
  1. User can enter sleep hours, weight, workout details, and healthy eating status through Add Entry modal
  2. Add Entry modal pre-fills with today's date and provides smart defaults based on recent patterns
  3. User can optionally rate mood/energy level (1-5 scale) and bulk enter metrics for multiple days
  4. System automatically calculates focus time, productivity score, context switching frequency, goal completion rate, category balance, and weekly velocity from timeline events
  5. Auto-calculated metrics appear in database alongside manual entries with proper type distinction
**Plans**: TBD

Plans:
- [ ] TBD during plan-phase

### Phase 5: Metrics Dashboard
**Goal**: Dashboard displays grid of compact chart cards showing health and productivity trends with correlation insights
**Depends on**: Phase 4
**Requirements**: MET-19, MET-20, MET-21, MET-22, MET-23, MET-24, MET-25, MET-26, MET-27, MET-28, MET-37, MET-38, MET-39, MET-40
**Success Criteria** (what must be TRUE):
  1. User sees sleep trend line chart, weight progress chart with goal overlay, workout frequency bars, and healthy eating streak in compact grid
  2. User sees productivity score trend line chart and focus time breakdown stacked area chart
  3. Dashboard displays correlation insights (e.g., "Best productivity after 7+ hrs sleep")
  4. All charts fit dashboard view without scrolling and use Material-UI dark theme colors
  5. Dashboard displays weekly and monthly summary cards with validation for metric entry ranges
**Plans**: TBD

Plans:
- [ ] TBD during plan-phase

### Phase 6: Metrics Log & Data Management
**Goal**: Users can view chronological log of all metrics entries and export data to CSV
**Depends on**: Phase 5
**Requirements**: MET-29, MET-30, MET-31, MET-32, MET-33, MET-34, MET-35, MET-36
**Success Criteria** (what must be TRUE):
  1. Log displays chronological list of all entries (newest first) with timestamps
  2. User can filter log by type (health/productivity/all) and select custom date ranges
  3. User can edit existing log entries inline and delete entries with confirmation dialog
  4. Log visually distinguishes auto-calculated vs manual entries with clear indicators
  5. User can export all metrics data to CSV file for external analysis
**Plans**: TBD

Plans:
- [ ] TBD during plan-phase

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Technical Foundation | 0/TBD | Not started | - |
| 2. Insights Dashboard Redesign | 0/TBD | Not started | - |
| 3. Metrics Architecture | 0/TBD | Not started | - |
| 4. Metrics Core Features | 0/TBD | Not started | - |
| 5. Metrics Dashboard | 0/TBD | Not started | - |
| 6. Metrics Log & Data Management | 0/TBD | Not started | - |

---
*Created: 2026-01-26*
*Last updated: 2026-01-26*
