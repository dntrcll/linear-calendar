# Fixes Applied to Calendar App

## Problem
Events were not showing in calendar views (day/week/month/year) even though they appeared in the "All Events" sidebar.

## Root Cause
The `category` field in events was storing the UUID from the `tag_id` column in the database, but the app expects it to be the tag identifier string (like "work", "health", "social").

## Fix Applied

### 1. Updated Event Loading (eventService.js)
**File:** `/Users/apple/Desktop/linear-calendar/src/services/eventService.js`

**Changed:**
```javascript
// BEFORE - Was loading just the UUID
const { data, error } = await supabase
  .from('events')
  .select('*')
  ...

category: event.tag_id, // This was the UUID
```

**To:**
```javascript
// AFTER - Now joins with tags table to get tag_id string
const { data, error } = await supabase
  .from('events')
  .select(`
    *,
    tags (
      tag_id,
      name,
      icon_name,
      color,
      bg_color,
      text_color,
      border_color
    )
  `)
  ...

category: event.tags?.tag_id || 'other', // Now gets the string like "health"
```

## What to Do Now

### Step 1: Run Database Fix (if tags don't have tag_id populated)
Open Supabase SQL Editor and run:

```sql
-- Populate tag_id for existing tags
UPDATE tags
SET tag_id = LOWER(
  CASE
    WHEN name ILIKE '%work%' THEN 'work'
    WHEN name ILIKE '%personal%' THEN 'personal'
    WHEN name ILIKE '%health%' THEN 'health'
    WHEN name ILIKE '%finance%' THEN 'finance'
    WHEN name ILIKE '%social%' THEN 'social'
    WHEN name ILIKE '%code%' THEN 'code'
    WHEN name ILIKE '%learning%' THEN 'learning'
    ELSE LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g'))
  END
)
WHERE tag_id IS NULL OR tag_id = '';
```

### Step 2: Refresh Your App
1. Refresh the browser (Cmd+R or F5)
2. The "Swimming" event should now appear on January 21, 2026 in all views
3. Try switching between Day/Week/Month/Year views - events should appear in all of them

### Step 3: Verify Everything Works
- ✅ Create new event → Should appear immediately in all views
- ✅ Edit event → Should update in all views
- ✅ Delete event → Should disappear from all views
- ✅ Switch views → Events should persist across views
- ✅ Filter by tag → Should work correctly

## Database Schema Status

### Tags Table
```
id (UUID) - Primary key
user_id (UUID) - Foreign key to users
tag_id (TEXT) - String identifier like "work", "health"
name (TEXT) - Display name like "Work", "Health"
icon_name (TEXT)
context (TEXT) - "personal" or "family"
color, bg_color, text_color, border_color (TEXT)
created_at, updated_at (TIMESTAMPTZ)
```

### Events Table
```
id (UUID) - Primary key
user_id (UUID) - Foreign key to users
tag_id (UUID) - Foreign key to tags.id
title, description, location (TEXT)
context (TEXT) - "personal" or "family"
start_time, end_time (TIMESTAMPTZ)
deleted (BOOLEAN)
deleted_at (TIMESTAMPTZ)
created_at, updated_at (TIMESTAMPTZ)
```

## How the Fix Works

1. **Before:** Events stored `category: <UUID>` but app filtered by `category: "health"`
   - Result: No matches, events didn't appear

2. **After:** Events load with JOIN to get `category: "health"` from `tags.tag_id`
   - Result: Matches work, events appear correctly

## Testing Checklist

After refresh:
- [ ] "Swimming" event appears on Jan 21 in Year view grid
- [ ] Click on Jan 21 → Should show day view with event
- [ ] Switch to Week view → Should show event
- [ ] Switch to Month view → Should show event
- [ ] Create new event → Should appear immediately
- [ ] Filter tags in sidebar → Events filter correctly
- [ ] All Events sidebar → Shows correct count and list

## If Still Not Working

1. **Check browser console** (F12 → Console tab)
   - Look for errors related to event loading
   - Should see "Loaded events from Supabase: 1" or similar

2. **Check Supabase** (Run this query)
   ```sql
   SELECT
     e.id,
     e.title,
     e.start_time,
     t.tag_id,
     t.name
   FROM events e
   LEFT JOIN tags t ON e.tag_id = t.id
   WHERE e.deleted = false
   ```
   - Verify tag_id column is populated for all tags
   - Verify events are linked to tags correctly

3. **Hard refresh** the app
   - Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - This clears cached JavaScript

## Status
✅ **Fix applied and app recompiled successfully**
⏳ **Waiting for database update and app refresh**
