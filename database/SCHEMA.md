# Timeline OS — Database Schema

Current state of the Supabase Postgres database. Tables listed with columns, constraints, and RLS policies.

## Core Tables

### users

Synced from `auth.users` via trigger on signup.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, FK → auth.users(id) ON DELETE CASCADE |
| email | TEXT | |
| full_name | TEXT | |
| avatar_url | TEXT | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

**RLS**: Enabled. Users can SELECT own row (`auth.uid() = id`).
**Trigger**: `on_auth_user_created` → `handle_new_user()` auto-creates row on signup.

---

### events

Calendar events with soft delete and recurrence support.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| user_id | UUID | NOT NULL, FK → auth.users(id) |
| title | TEXT | NOT NULL |
| description | TEXT | DEFAULT '' |
| location | TEXT | DEFAULT '' |
| tag_id | UUID | FK → tags(id) |
| context | TEXT | 'work' or 'personal' |
| start_time | TIMESTAMPTZ | NOT NULL |
| end_time | TIMESTAMPTZ | NOT NULL |
| deleted | BOOLEAN | DEFAULT false |
| deleted_at | TIMESTAMPTZ | |
| recurrence_pattern | TEXT | DEFAULT 'none' (none/daily/weekly/fortnightly/monthly/yearly) |
| recurrence_end_date | TIMESTAMPTZ | |
| parent_event_id | UUID | FK → events(id) ON DELETE CASCADE |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

**RLS**: Enabled. Users can CRUD own events (`auth.uid() = user_id`).
**Indexes**: `events_parent_event_id_idx`, `events_recurrence_pattern_idx`, user_id + start_time.
**Note**: `tag_id` is a UUID foreign key to `tags.id`, not a tag name string. The app maps tag UUIDs to tag_id strings via lookup.

---

### tags

User-defined event categories with per-context colors and icons.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| user_id | UUID | NOT NULL, FK → auth.users(id) |
| tag_id | TEXT | Slug identifier (e.g., 'work', 'health') |
| name | TEXT | NOT NULL, display name |
| icon_name | TEXT | Lucide icon name |
| context | TEXT | 'work' or 'personal' |
| color | TEXT | Hex color |
| bg_color | TEXT | Background hex color |
| text_color | TEXT | Text hex color |
| border_color | TEXT | Border hex color |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

**RLS**: Enabled. Users can CRUD own tags.

---

### user_preferences

Per-user settings and configuration.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | NOT NULL, FK → auth.users(id) |
| preferences | JSONB | Settings data |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

**RLS**: Enabled. Users can SELECT/INSERT/UPDATE own preferences.

---

### goals

Focus mode goals.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | NOT NULL |
| title | TEXT | |
| completed | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

**RLS**: Enabled. Users can CRUD own goals.

---

### timers

Focus mode timer sessions.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | NOT NULL |
| duration | INTEGER | Duration in seconds |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

**RLS**: Enabled. Users can CRUD own timers.

---

## Billing

### subscriptions

Stripe subscription state, auto-created on signup.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| user_id | UUID | NOT NULL, FK → auth.users(id) ON DELETE CASCADE, UNIQUE |
| plan | TEXT | NOT NULL, DEFAULT 'free', CHECK IN ('free', 'pro') |
| status | TEXT | NOT NULL, DEFAULT 'active', CHECK IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete') |
| trial_ends_at | TIMESTAMPTZ | |
| current_period_start | TIMESTAMPTZ | |
| current_period_end | TIMESTAMPTZ | |
| cancel_at_period_end | BOOLEAN | DEFAULT false |
| stripe_customer_id | TEXT | |
| stripe_subscription_id | TEXT | |
| stripe_price_id | TEXT | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

**RLS**: Enabled. Users can SELECT/INSERT/UPDATE own. Service role has full access (for webhooks).
**Indexes**: `idx_subscriptions_user_id`, `idx_subscriptions_stripe_customer`, `idx_subscriptions_stripe_subscription`.
**Triggers**: `trigger_subscriptions_updated_at` auto-updates `updated_at`. `on_auth_user_created_subscription` auto-creates free subscription on signup.

---

## Telemetry (Habits Tracking)

### telemetry_habits

User-defined habits to track daily.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| user_id | UUID | NOT NULL |
| name | TEXT | NOT NULL |
| display_order | INTEGER | NOT NULL, DEFAULT 0 |
| active | BOOLEAN | NOT NULL, DEFAULT true |
| habit_type | TEXT | DEFAULT 'build', CHECK IN ('build', 'eliminate') |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

**RLS**: Disabled (grants to all roles).
**Index**: `idx_telemetry_habits_user(user_id, active, display_order)`.

### telemetry_days

Daily mood scores and notes.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| user_id | UUID | NOT NULL |
| date | DATE | NOT NULL, UNIQUE(user_id, date) |
| mood_score | INTEGER | CHECK 0-10 |
| note | TEXT | DEFAULT '' |
| memorable_moment | TEXT | DEFAULT '' |
| mood_emoji | TEXT | DEFAULT '' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

**RLS**: Disabled.
**Index**: `idx_telemetry_days_user_date(user_id, date DESC)`.

### telemetry_completions

Binary habit completion records per day.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| user_id | UUID | NOT NULL |
| date | DATE | NOT NULL |
| habit_id | UUID | NOT NULL, FK → telemetry_habits(id) ON DELETE CASCADE |
| completed | BOOLEAN | NOT NULL, DEFAULT false |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

**Unique**: (user_id, date, habit_id).
**RLS**: Disabled.
**Indexes**: `idx_telemetry_completions_user_date`, `idx_telemetry_completions_habit`.

### telemetry_month_summaries

Monthly "memorable moments" narrative text.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| user_id | UUID | NOT NULL |
| year | INTEGER | NOT NULL |
| month | INTEGER | NOT NULL, CHECK 1-12 |
| memorable_moments | TEXT | DEFAULT '' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

**Unique**: (user_id, year, month).
**RLS**: Disabled.

---

## Metrics

### life_metrics

Flexible key-value metrics storage (sleep, weight, workouts, etc.).

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| user_id | UUID | NOT NULL |
| recorded_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| metric_type | TEXT | NOT NULL, CHECK IN ('manual', 'auto') |
| metric_name | TEXT | NOT NULL |
| metric_value | NUMERIC | |
| metric_data | JSONB | DEFAULT '{}' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

**RLS**: Disabled.
**Indexes**: `idx_life_metrics_user_date(user_id, recorded_at)`, `idx_life_metrics_type(metric_type)`.

---

## Functions

| Function | Purpose |
|----------|---------|
| `handle_new_user()` | Auto-create users row on auth signup |
| `update_updated_at_column()` | Generic updated_at trigger |
| `update_subscription_updated_at()` | Subscription updated_at trigger |
| `create_subscription_on_signup()` | Auto-create free subscription on signup |
