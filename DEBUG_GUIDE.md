# Debug Guide - Why Tags Aren't Showing

## Quick Fix - Get Tags Working Now

Run this SQL in Supabase SQL Editor to create 15 tags immediately:

```sql
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get your user ID
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  -- Delete existing tags
  DELETE FROM tags WHERE user_id = v_user_id;

  -- Insert Personal tags
  INSERT INTO tags (user_id, tag_id, name, icon_name, context, color, bg_color, text_color, border_color)
  VALUES
    (v_user_id, 'work', 'Work', 'Briefcase', 'personal', '#F97316', '#FFF7ED', '#C2410C', '#FFEDD5'),
    (v_user_id, 'personal', 'Personal', 'Home', 'personal', '#A855F7', '#FAF5FF', '#7C3AED', '#F3E8FF'),
    (v_user_id, 'health', 'Health', 'Heart', 'personal', '#10B981', '#ECFDF5', '#047857', '#D1FAE5'),
    (v_user_id, 'finance', 'Finance', 'DollarSign', 'personal', '#F59E0B', '#FFFBEB', '#B45309', '#FEF3C7'),
    (v_user_id, 'social', 'Social', 'Users', 'personal', '#F43F5E', '#FFF1F2', '#BE123C', '#FFE4E6'),
    (v_user_id, 'learning', 'Learning', 'BookOpen', 'personal', '#3B82F6', '#EFF6FF', '#1E40AF', '#DBEAFE'),
    (v_user_id, 'fitness', 'Fitness', 'Dumbbell', 'personal', '#14B8A6', '#F0FDFA', '#115E59', '#CCFBF1'),
    (v_user_id, 'food', 'Food', 'Coffee', 'personal', '#F97316', '#FFF7ED', '#C2410C', '#FFEDD5'),
    (v_user_id, 'travel', 'Travel', 'Plane', 'personal', '#6366F1', '#EEF2FF', '#4338CA', '#E0E7FF'),
    (v_user_id, 'entertainment', 'Entertainment', 'Film', 'personal', '#A855F7', '#FAF5FF', '#7C3AED', '#F3E8FF');

  -- Insert Family tags
  INSERT INTO tags (user_id, tag_id, name, icon_name, context, color, bg_color, text_color, border_color)
  VALUES
    (v_user_id, 'family-time', 'Family Time', 'Home', 'family', '#F43F5E', '#FFF1F2', '#BE123C', '#FFE4E6'),
    (v_user_id, 'kids', 'Kids', 'Baby', 'family', '#F59E0B', '#FFFBEB', '#B45309', '#FEF3C7'),
    (v_user_id, 'household', 'Household', 'Home', 'family', '#A855F7', '#FAF5FF', '#7C3AED', '#F3E8FF'),
    (v_user_id, 'family-health', 'Family Health', 'Heart', 'family', '#10B981', '#ECFDF5', '#047857', '#D1FAE5'),
    (v_user_id, 'events', 'Events', 'Calendar', 'family', '#3B82F6', '#EFF6FF', '#1E40AF', '#DBEAFE');
END $$;

-- Verify
SELECT tag_id, name, context FROM tags ORDER BY context, name;
```

After running this SQL, **refresh your browser** and you should see all 15 tags!

---

## If Tags Still Don't Show - Run These Diagnostics

### Step 1: Open Browser Console

1. Open your app in browser
2. Press F12 to open DevTools
3. Go to the "Console" tab
4. Log in to your app
5. Look for these messages:

**What you SHOULD see:**
```
Loading tags for user: <some-uuid>
Loaded tags from Supabase: 15
Tags loaded successfully: 15
```

**What might indicate a problem:**
```
Error loading tags: <error message>
Supabase tags query error: <error>
Tags loaded successfully: 0
```

**Copy and send me any errors you see in the console!**

### Step 2: Verify Database Schema

Run this SQL to check if all columns exist:

```sql
-- Check tags table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tags'
ORDER BY ordinal_position;
```

**Required columns:**
- `id` (uuid)
- `user_id` (uuid)
- `tag_id` (text)
- `name` (text)
- `icon_name` (text)
- `context` (text)
- `color` (text)
- `bg_color` (text)
- `text_color` (text)
- `border_color` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**If any columns are missing, run:**
```sql
ALTER TABLE tags ADD COLUMN IF NOT EXISTS tag_id TEXT;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS icon_name TEXT;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS context TEXT DEFAULT 'personal';
ALTER TABLE tags ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS bg_color TEXT;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS text_color TEXT;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS border_color TEXT;
```

### Step 3: Check RLS Policies

Run this SQL to verify Row Level Security policies:

```sql
-- Check RLS policies on tags table
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'tags';
```

**You should see policies like:**
- `Enable read access for users to their own tags`
- `Enable insert for users to their own tags`
- `Enable update for users to their own tags`
- `Enable delete for users to their own tags`

**If RLS policies are missing or wrong, create them:**
```sql
-- Enable RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Enable read access for users to their own tags" ON tags;
DROP POLICY IF EXISTS "Enable insert for users to their own tags" ON tags;
DROP POLICY IF EXISTS "Enable update for users to their own tags" ON tags;
DROP POLICY IF EXISTS "Enable delete for users to their own tags" ON tags;

-- Create new policies
CREATE POLICY "Enable read access for users to their own tags"
  ON tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for users to their own tags"
  ON tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users to their own tags"
  ON tags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for users to their own tags"
  ON tags FOR DELETE
  USING (auth.uid() = user_id);
```

### Step 4: Check User Record Exists

Run this SQL to verify your user exists:

```sql
-- Check if user record exists
SELECT id, email FROM auth.users LIMIT 5;

-- Check if users table exists (might not be needed)
SELECT COUNT(*) as user_count FROM users;
```

If you see an error about "users table doesn't exist", that's OK - the app uses `auth.users` not `public.users`.

### Step 5: Test Database Connection

Run this SQL to test if you can manually create a tag:

```sql
-- Get your user ID
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  -- Try to create one test tag
  INSERT INTO tags (user_id, tag_id, name, icon_name, context, color, bg_color, text_color, border_color)
  VALUES (v_user_id, 'test', 'Test Tag', 'Star', 'personal', '#F97316', '#FFF7ED', '#C2410C', '#FFEDD5');

  RAISE NOTICE 'Successfully created test tag for user %', v_user_id;
END $$;

-- Check if it was created
SELECT * FROM tags WHERE tag_id = 'test';
```

If this works, the database is fine and the issue is in the app code.

---

## Common Issues and Solutions

### Issue 1: "Could not find the 'tag_id' column"
**Solution:** Run the ALTER TABLE commands in Step 2 above.

### Issue 2: "violates foreign key constraint"
**Solution:** Make sure your user record exists in auth.users. You should be logged in.

### Issue 3: Tags show "0" or empty array in console
**Possible causes:**
- RLS policies blocking access (fix in Step 3)
- Wrong user_id in tags table
- Tags exist but not for your user

**Debug SQL:**
```sql
-- Check what user_ids exist in tags
SELECT DISTINCT user_id FROM tags;

-- Check your actual user_id
SELECT id, email FROM auth.users;

-- See if there's a mismatch
SELECT
  'Your user ID:' as info,
  (SELECT id FROM auth.users LIMIT 1) as your_id,
  'Tag user IDs:' as info2,
  array_agg(DISTINCT user_id) as tag_users
FROM tags;
```

### Issue 4: App shows only 2 tags (Work and Health)
This might be because:
- Previous partial creation left 2 tags
- Auto-initialization failed after creating 2
- Database transaction partially committed

**Solution:** Run the "Quick Fix" SQL at the top of this file to reset and create all 15 tags.

### Issue 5: Browser console shows no errors but tags still don't appear
**Check:**
1. Are you looking at the correct context (Personal vs Family)?
2. Is the sidebar collapsed or hidden?
3. Did you hard refresh (Cmd+Shift+R)?
4. Try clearing browser cache completely

**Nuclear option:**
```javascript
// In browser console, run:
localStorage.clear();
sessionStorage.clear();
location.reload(true);
```

---

## Rebuild Checklist

If you modified any code, make sure to:

1. ✅ Save all files in your editor
2. ✅ Run `npm run build` successfully
3. ✅ Hard refresh browser (Cmd+Shift+R)
4. ✅ Check browser console for errors
5. ✅ Verify you're logged in
6. ✅ Check you're viewing the correct context (Personal/Family)

---

## Send Me This Info

If it's still not working, please send me:

1. **Browser console output** - Copy everything from the Console tab
2. **SQL diagnostic results** - Run this and send results:
```sql
SELECT 'Tags count:' as info, COUNT(*) as count FROM tags
UNION ALL
SELECT 'Your user ID:', (SELECT id::text FROM auth.users LIMIT 1)
UNION ALL
SELECT 'Tags for your user:', COUNT(*)::text FROM tags WHERE user_id = (SELECT id FROM auth.users LIMIT 1);
```

3. **Network tab** - In DevTools Network tab, filter by "tags" and show me any failed requests

This will help me pinpoint exactly what's wrong!
