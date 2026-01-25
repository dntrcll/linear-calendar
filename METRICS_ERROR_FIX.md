# Metrics RLS Error - Complete Fix Guide

## Problem
Still seeing: `Error: new row violates row-level security policy for table "life_metrics"`

## Root Cause
The issue is likely one of these:
1. ❌ You're not authenticated (user object is null)
2. ❌ Browser cached the old error
3. ❌ Policies weren't created properly
4. ❌ User ID mismatch

---

## Solution 1: Check Authentication (MOST LIKELY)

**The error appears because you're not signed in yet!**

### Steps:
1. **Sign out completely**
   - Click your profile picture → Sign Out

2. **Clear browser cache**
   - Or use Incognito/Private mode

3. **Sign in again with Google**
   - Complete the OAuth flow

4. **Try the Metrics tab again**
   - Click "+ Add Entry"
   - Fill in data
   - Click Save

---

## Solution 2: Run New SQL Fix

If still getting errors after signing in, run this new SQL script:

**File:** `fix_metrics_policies.sql`

1. Go to Supabase → SQL Editor
2. Copy the entire content from `fix_metrics_policies.sql`
3. Run it
4. Hard refresh your app (Cmd+Shift+R / Ctrl+Shift+R)

This script:
- ✅ Uses `TO authenticated` (more explicit)
- ✅ Adds `WITH CHECK` clauses
- ✅ Shows you the policies at the end for verification

---

## Solution 3: Test Manually in Supabase

1. Go to Supabase → Table Editor
2. Click on `life_metrics` table
3. Click "Insert row" manually
4. Try to insert:
   ```
   user_id: [your user ID from auth.users]
   date: 2026-01-25
   sleep_hours: 8
   weight_kg: 70
   workouts_count: 1
   ```

If manual insert fails → Problem is with policies
If manual insert works → Problem is with the app code

---

## Solution 4: Temporary Workaround (Testing Only)

**ONLY FOR LOCAL TESTING - DON'T USE IN PRODUCTION!**

Temporarily disable RLS to test if everything else works:

```sql
ALTER TABLE public.life_metrics DISABLE ROW LEVEL SECURITY;
```

Try saving metrics. If it works → Problem confirmed to be RLS policies.

Then re-enable RLS:
```sql
ALTER TABLE public.life_metrics ENABLE ROW LEVEL SECURITY;
```

And fix the policies properly using Solution 2.

---

## About the Insights Tab

The Insights tab should work - it's just a modal showing event statistics.

**If it's not working:**
1. What error do you see in browser console (F12)?
2. Does clicking "Insights" button do nothing?
3. Screenshot the error message

---

## Debug Checklist

Run these in browser console (F12):

```javascript
// 1. Check if you're signed in
console.log('User:', user);

// 2. Check Supabase session
supabase.auth.getSession().then(({data}) => console.log('Session:', data));

// 3. Check user ID
supabase.auth.getUser().then(({data}) => console.log('User ID:', data.user?.id));
```

Share the output and I can help diagnose further!

---

## Quick Summary

**Most likely fix:**
1. ✅ Sign out completely
2. ✅ Clear browser cache (or use incognito)
3. ✅ Sign in again with Google
4. ✅ Try Metrics tab

If that doesn't work, run `fix_metrics_policies.sql` in Supabase.
