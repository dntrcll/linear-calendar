# Timeline OS

## What This Is

Timeline OS is a personal operating system for managing time and life. It combines time tracking, goal management, context switching (Personal/Work), and smart calendar integration into a unified interface. The app is fully functional with daily goals, timers, tags, insights dashboard, and Google Calendar sync. This project focuses on fixing technical debt and significantly improving the Insights and Metrics experiences.

## Core Value

**Effortless visibility into how you spend your time and how you're progressing toward your goals.**

If everything else fails, users must be able to track their time, see their patterns, and understand their productivity at a glance.

## Requirements

### Validated

- ✓ Timeline event tracking with start/end times — existing
- ✓ Daily goals system with timer integration — existing
- ✓ Context switching (Personal/Work) — existing
- ✓ Category/tag system for events — existing
- ✓ Google Calendar sync — existing
- ✓ Basic insights dashboard — existing
- ✓ Supabase backend with real-time sync — existing
- ✓ Material-UI component library — existing
- ✓ Responsive layout — existing

### Active

**Insights Tab Redesign:**
- [ ] Dense dashboard layout - everything visible without scrolling
- [ ] Today's overview metrics (hours tracked, goals completed, active time, focus sessions)
- [ ] Weekly trend visualizations (compact charts for time by category, daily activity heatmap, productivity curve)
- [ ] Context split visualization (Personal vs Work comparison)
- [ ] Top categories widget with time percentages
- [ ] Auto-calculated productivity score (based on goals, focus time, consistency)
- [ ] Quick stats cards (longest focus, best day, current streak)
- [ ] 2-column grid layout optimized for info density

**Metrics Tab Complete Rebuild:**
- [ ] Manual health tracking with form entry (sleep hours, weight, workouts, healthy eating)
- [ ] Workout progression tracking (sets/reps/weight trends)
- [ ] Graph dashboard view with compact visualization cards
- [ ] Chronological log view of all entries (manual + auto-calculated)
- [ ] Auto-calculated productivity metrics from timeline data (focus quality, context switching frequency, goal consistency, energy patterns, category balance, weekly velocity)
- [ ] Line charts for trends (sleep, weight, productivity score)
- [ ] Bar charts for workouts and category distribution
- [ ] Correlation insights (e.g., productivity vs sleep)
- [ ] Weekly/monthly summary snapshots
- [ ] Quick daily entry modal
- [ ] Fix Supabase RLS policies for life_metrics table
- [ ] Data export functionality

### Out of Scope

- Mobile app — web-first approach, defer native apps
- Social features / sharing — personal tool, no collaboration needed
- AI-powered insights — focus on clear visualizations first, AI can come later
- Third-party integrations beyond Google Calendar — keep scope focused
- Gamification / achievements — not aligned with professional tool aesthetic

## Context

**Current State:**
- Timeline OS is production-ready and in active use
- Insights tab exists but requires scrolling and lacks info density
- Metrics tab has broken RLS policies and outdated health-only tracking
- Codebase uses React, Material-UI, Supabase, and is well-structured
- App has ~390KB bundle size (large) with some performance concerns noted in codebase mapping

**Technical Environment:**
- React 18 with functional components and hooks
- Material-UI v5 for components
- Supabase for backend (PostgreSQL + real-time + auth)
- Google OAuth for authentication
- Firebase was partially migrated from (some legacy code remains)
- Jest for testing (minimal coverage currently)

**Known Issues from Codebase Mapping:**
- Large App.js file (needs eventual refactoring but not blocking)
- RLS policies need configuration for metrics
- Some unused Firebase code should be cleaned up
- Bundle size could be optimized

**User Preferences:**
- Wants info-dense, compact layouts (not spacious modern design)
- Values data visualization and graphs
- Prefers snapshot views over paginated/scrolling interfaces
- Uses both manual tracking and auto-calculated insights

## Constraints

- **Tech stack**: React + Material-UI + Supabase — no framework changes
- **Timeline**: Want improvements working soon, prioritize shipping over perfection
- **Database**: Supabase PostgreSQL — work within existing schema, add tables as needed
- **Authentication**: Google OAuth already configured — don't break existing auth flow
- **Design**: Match existing Timeline OS aesthetic (dark theme, teal accents, clean but dense)
- **Performance**: Keep bundle size reasonable, app should feel fast
- **Browser**: Chrome/Brave primary target (incognito mode for development due to cache issues)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Rebuild Metrics vs Fix RLS | Metrics feature was underutilized and health-only; rebuilding with auto-calculated productivity metrics + manual health tracking provides more value | — Pending |
| Dense layout over spacious | User explicitly wants more info visible without scrolling; matches power-user tool aesthetic | — Pending |
| Manual + Auto hybrid in Metrics | Combines best of both: manual health tracking for data app can't infer, auto-calculated productivity from existing timeline events | — Pending |
| Keep existing tech stack | App is working well with React + MUI + Supabase; no need to introduce new frameworks | — Pending |

---
*Last updated: 2026-01-25 after initialization*
