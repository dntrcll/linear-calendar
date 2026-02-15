# Timeline OS - Project Structure

**Last Updated:** 2026-02-03  
**Restructured:** Feature-based architecture

---

## 📁 Root Directory Structure

```
timeline-os/
├── src/                    # Source code
├── database/               # Database layer
├── docs/                   # Documentation
├── public/                 # Static assets
├── tests/                  # Test suites
├── config/                 # Configuration files
├── .claude/                # Claude Code AI skills
├── .planning/              # Project planning (symlinked to docs/planning)
├── node_modules/           # Dependencies (gitignored)
├── build/                  # Production build (gitignored)
└── [root config files]     # package.json, .gitignore, etc.
```

---

## 🎯 src/ - Source Code (Feature-Based)

### Core App
```
src/
├── App.js                  # Main application (2300+ lines)
├── App.css                 # Main styles
├── index.js                # React entry point
├── index.css               # Global styles & animations
├── logo.svg                # App logo
├── supabaseClient.js       # Supabase SDK initialization
└── reportWebVitals.js      # Performance monitoring
```

### Features (Domain-Driven Design)

#### 1. Authentication (`src/features/auth/`)
```
auth/
├── authService.js              # Google OAuth, email auth, sessions
└── userPreferencesService.js   # User settings & preferences
```

**Responsibilities:**
- Google OAuth integration
- Email/password authentication
- Session management
- User preferences CRUD

---

#### 2. Events & Calendar (`src/features/events/`)
```
events/
├── eventService.js         # Event CRUD, Supabase integration
├── tagService.js           # Categories/tags management
├── LinearCalendar.jsx      # Calendar grid component
├── LinearCalendar.css      # Calendar styles
├── eventUtils.js           # Event helper functions
└── tagUtils.js             # Tag utility functions
```

**Responsibilities:**
- Event creation, editing, deletion
- Calendar rendering (Day/Week/Month/Year views)
- Tag/category system
- Recurring events
- Event search & filtering

---

#### 3. Analytics & Insights (`src/features/analytics/`)
```
analytics/
├── InsightsDashboard.js            # Main dashboard container
├── MetricsTab.js                   # Metrics visualization
├── TelemetryPage.js                # Usage tracking dashboard
├── metricsService.js               # Metrics data management
├── productivityMetricsService.js   # Productivity calculations
├── telemetryService.js             # Usage tracking
├── metricsCalculations.js          # Calculation logic
└── charts/                         # Chart widgets
    ├── AreaChartWidget.js          # Area charts
    ├── BarChartWidget.js           # Bar charts
    ├── LineChartWidget.js          # Line charts
    ├── HeatmapWidget.js            # Heatmap visualization
    └── index.js                    # Barrel exports
```

**Responsibilities:**
- Year insights visualization
- Productivity metrics tracking
- Event analytics & trends
- Custom chart widgets (Recharts)
- Telemetry & usage tracking

---

#### 4. Subscription (`src/features/subscription/`)
```
subscription/
└── subscriptionService.js      # Stripe payments, subscription logic
```

**Responsibilities:**
- Stripe checkout integration
- Subscription status management
- Payment webhooks (future)
- Plan upgrades/downgrades

---

### Shared Resources

#### Components (`src/components/`)
```
components/
├── ui/                 # Reusable UI components (future)
└── layouts/            # Layout components (future)
```

**Note:** Most components are currently in App.js. Future refactor will extract:
- Modal components
- Form components
- Settings panels
- Common UI elements

---

#### Constants (`src/constants/`)
```
constants/
├── themes.js           # 9 premium themes (Jade, Sapphire, etc.)
├── icons.js            # SVG icon library (16KB)
├── quotes.js           # 365+ motivational quotes
├── tags.js             # Default event categories
├── config.js           # App configuration
├── layout.js           # Layout constants
└── index.js            # Barrel exports
```

---

#### Utilities (`src/utils/`)
```
utils/
├── dateUtils.js                # Date formatting & calculations
├── agentLoop.js                # AI agent integration
├── debugConsole.js             # Debug helpers
├── instrumentation.js          # Performance monitoring
├── migrateToSupabase.js        # Migration utilities
├── runtimeGuards.js            # Type safety guards
└── index.js                    # Barrel exports
```

---

#### Types (`src/types/`)
```
types/
└── metrics.js          # Metrics type definitions
```

---

#### Pages (`src/pages/`)
```
pages/
├── PrivacyPolicy.js    # Privacy policy page
└── TermsOfService.js   # Terms of service page
```

---

## 🗄️ database/ - Database Layer

```
database/
├── migrations/                             # Schema migrations
│   ├── 001_create_life_metrics.sql
│   ├── 002_update_life_metrics.sql
│   ├── 003-009_metrics_fixes.sql
│   ├── 010_subscriptions_table.sql
│   ├── 010_telemetry_improvements.sql
│   ├── add_recurring_events.sql
│   ├── fix-tags-*.sql
│   └── README.md (coming)
│
├── scripts/                                # Database utilities
│   ├── RUN_THIS_IN_SUPABASE.sql           # Initial setup
│   ├── check-tables.sql                   # Verification
│   ├── complete-fix.sql                   # Comprehensive fixes
│   ├── drop-all-tables.sql                # Reset
│   ├── force-drop-everything.sql          # Hard reset
│   ├── migrate-console.js                 # Console migration
│   ├── migrate.html                       # Browser migration
│   └── [various fix scripts]
│
└── schemas/                                # Schema documentation (future)
```

**Tables:**
- `events` - Calendar events
- `tags` - Event categories
- `users` - User profiles
- `life_metrics` - Productivity tracking
- `telemetry_events` - Usage analytics
- `subscriptions` - Stripe subscriptions

---

## 📚 docs/ - Documentation

```
docs/
├── guides/                         # How-to guides
│   ├── LAUNCH_GUIDE.md             # Complete deployment guide
│   ├── DEBUG_GUIDE.md              # Debugging procedures
│   ├── OAUTH_BRANDING_GUIDE.md     # Google OAuth setup
│   ├── DATABASE_SCHEMA.md          # Schema documentation
│   ├── PREMIUM_FONTS_COMPLETE.md   # Typography guide
│   ├── THEME_FIXES.md              # Theme consistency
│   └── [15+ other guides]
│
├── fixes/                          # Bug fix documentation
│   ├── COMPLETE_FIX_GUIDE.md       # Comprehensive fixes
│   ├── METRICS_FIX_GUIDE.md        # Metrics fixes
│   ├── ARCHITECTURE_FIX_*.md       # Architecture fixes
│   └── [10+ fix docs]
│
├── launch/                         # Deployment docs
│   ├── LAUNCH_GUIDE.md             # Step-by-step launch
│   └── LAUNCH_CHECKLIST.md         # Pre-launch checklist
│
└── planning/                       # Project planning
    ├── PROJECT.md                  # Project overview
    ├── REQUIREMENTS.md             # Requirements spec
    ├── ROADMAP.md                  # Development roadmap
    ├── STATE.md                    # Current state
    ├── config.json                 # Planning config
    ├── codebase/                   # Codebase analysis
    │   ├── ARCHITECTURE.md
    │   ├── STACK.md
    │   ├── STRUCTURE.md
    │   ├── CONVENTIONS.md
    │   ├── INTEGRATIONS.md
    │   ├── TESTING.md
    │   └── CONCERNS.md
    └── intel/                      # AI-generated intelligence
        ├── index.json
        ├── conventions.json
        ├── summary.md
        ├── graph.db
        └── entities/               # 16 entity files
```

---

## 🧪 tests/ - Test Suites

```
tests/
├── metricsCalculations.test.js     # Metrics unit tests
├── performance.test.js             # Performance tests
├── run-performance-tests.js        # Test runner
├── browser-performance-test.html   # Browser tests
└── README.md
```

---

## ⚙️ config/ - Configuration

```
config/
├── vercel.json         # Vercel deployment settings
├── .npmrc              # npm configuration
└── README.md           # Config documentation
```

**Root config files** (kept in root for tooling):
- `package.json` - Dependencies & scripts
- `.gitignore` - Git exclusions
- `.env.local` - Environment variables
- `.claudeignore` - Claude exclusions

---

## 🤖 .claude/ - AI Development Skills

```
.claude/
├── skills/                         # 15 specialized AI skills
│   ├── code-reviewer/              # Code review automation
│   ├── senior-architect/           # Architecture planning
│   ├── senior-backend/             # Backend development
│   ├── senior-frontend/            # Frontend development
│   ├── frontend-design/            # UI/UX design
│   ├── ui-design-system/           # Design systems
│   ├── theme-factory/              # Theme generation
│   ├── git-commit-helper/          # Git standards
│   ├── docx/                       # Word processing
│   ├── pdf-anthropic/              # PDF processing
│   ├── pdf-processing-pro/         # Advanced PDF
│   ├── excel-analysis/             # Excel analysis
│   ├── webapp-testing/             # Web testing
│   └── skill-creator/              # Create new skills
└── settings.local.json             # Local settings
```

---

## 📦 public/ - Static Assets

```
public/
├── index.html          # HTML template
├── manifest.json       # PWA manifest
├── robots.txt          # SEO config
├── favicon.ico         # Browser icon
├── favicon.svg         # SVG icon
├── icon-192.png        # PWA icon (192x192)
├── icon-512.png        # PWA icon (512x512)
├── logo192.png         # Legacy logo
├── logo512.png         # Legacy logo
└── og-image.png        # Social preview image
```

---

## 🔍 Import Path Guide

### Before Restructure
```javascript
// Old imports
import { eventService } from '../services/eventService';
import InsightsDashboard from './components/InsightsDashboard';
```

### After Restructure (Future)
```javascript
// New feature-based imports
import { eventService } from '@features/events/eventService';
import { authService } from '@features/auth/authService';
import { MetricsTab } from '@features/analytics/MetricsTab';
import { BarChartWidget } from '@features/analytics/charts';

// Shared resources
import { THEMES } from '@constants/themes';
import { formatDate } from '@utils/dateUtils';
import Button from '@components/ui/Button';
```

**Note:** Current imports still use old paths. Path alias migration pending.

---

## 📊 Code Statistics

| Directory | Files | Purpose |
|-----------|-------|---------|
| `src/features/auth/` | 2 | Authentication & user management |
| `src/features/events/` | 6 | Calendar & event system |
| `src/features/analytics/` | 11 | Insights & metrics |
| `src/features/subscription/` | 1 | Payments & billing |
| `src/constants/` | 7 | Themes, icons, config |
| `src/utils/` | 7 | Helper functions |
| `src/components/` | 2 dirs | Shared UI (future) |
| `database/migrations/` | 15+ | Schema versions |
| `database/scripts/` | 15+ | DB utilities |
| `docs/guides/` | 20+ | Documentation |
| `tests/` | 4 | Test suites |

**Total:** 200+ files organized into clear domains

---

## 🎯 Benefits of This Structure

### 1. **Feature-Based Organization**
- Code grouped by business domain
- Easy to locate related files
- Clear ownership boundaries

### 2. **Scalability**
- New features = new folder
- Minimal cross-feature dependencies
- Easy to split into microservices later

### 3. **Developer Experience**
- Predictable file locations
- Clear import paths (future)
- Self-documenting structure

### 4. **Maintainability**
- Documentation organized by type
- Database files centralized
- Config files grouped

---

## 🚀 Next Steps

### Phase 1: Update Import Paths ✅ (Pending)
- [ ] Set up path aliases in `jsconfig.json`
- [ ] Update all imports to use `@features/*`, `@utils/*`, etc.
- [ ] Test all imports resolve correctly

### Phase 2: Extract Shared Components
- [ ] Move modal components from App.js to `src/components/ui/`
- [ ] Create layout components in `src/components/layouts/`
- [ ] Extract form components

### Phase 3: Add Feature Index Files
- [ ] Create `index.js` in each feature for clean exports
- [ ] Document public API for each feature
- [ ] Hide internal implementation details

### Phase 4: Type Safety
- [ ] Add JSDoc types or TypeScript
- [ ] Create type definitions for each feature
- [ ] Add runtime validation

---

## 📖 Related Documentation

- [Project Overview](docs/planning/PROJECT.md)
- [Architecture](docs/planning/codebase/ARCHITECTURE.md)
- [Database Schema](docs/guides/DATABASE_SCHEMA.md)
- [Launch Guide](docs/launch/LAUNCH_GUIDE.md)
- [Fix History](docs/fixes/)

---

*This structure follows modern React best practices with feature-based organization, clear separation of concerns, and scalability in mind.*
