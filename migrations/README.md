# Database Migrations

This folder contains SQL migration files for the Linear Calendar database schema.

## Running Migrations

### Method 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the migration file you want to run
4. Copy and paste the SQL into the editor
5. Click **Run** to execute the migration

### Method 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db push
```

Or apply a specific migration:

```bash
supabase db execute --file migrations/add_recurring_events.sql
```

## Available Migrations

### add_recurring_events.sql

Adds support for recurring events to the events table.

**Adds columns:**
- `recurrence_pattern` (TEXT): Pattern type (none, daily, weekly, fortnightly, monthly, yearly)
- `recurrence_end_date` (TIMESTAMPTZ): Optional end date for recurrence
- `parent_event_id` (UUID): Reference to parent event for instances

**Adds indexes:**
- `events_parent_event_id_idx`: For efficient parent-child queries
- `events_recurrence_pattern_idx`: For filtering recurring events

**Safe to run:** This migration uses `IF NOT EXISTS` clauses and will not affect existing data.

## Rollback

To rollback the recurring events migration:

```sql
-- Remove indexes
DROP INDEX IF EXISTS events_parent_event_id_idx;
DROP INDEX IF EXISTS events_recurrence_pattern_idx;

-- Remove columns
ALTER TABLE events
DROP COLUMN IF EXISTS recurrence_pattern,
DROP COLUMN IF EXISTS recurrence_end_date,
DROP COLUMN IF EXISTS parent_event_id;
```
