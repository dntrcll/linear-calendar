# Theme Styling Fixes Required

## Issues Reported

1. **Metrics Database Error** - RLS policy violation
2. **Jade Theme** - Progress bar showing in white
3. **Life Tab** - All content showing in white (ugly/unreadable)
4. **Settings Username Pill** - Weird gradient on top half

## Fix 1: Database Error (URGENT)

**Error:** `Error: new row violates row-level security policy for table "life_metrics"`

**Solution:** Run the SQL setup in Supabase:

1. Go to Supabase Dashboard → SQL Editor
2. Run the file: `reset_and_setup_metrics.sql`
3. This will create the table with proper RLS policies

---

## Fix 2-4: Theme Styling Issues

The issues are caused by hard-coded colors not respecting theme variables. I need to search for:

1. Progress bars using `background: white` or `background: #ffffff`
2. Life/Metrics tab components not using `theme.text` or `theme.textSec`
3. Username pill with gradient overlay issues

### Next Steps:

1. Find progress bar styling
2. Find Life/Metrics tab text colors
3. Find username pill gradient
4. Replace hard-coded colors with theme variables

---

## To User

**For now, to fix the database error:**

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy content from `reset_and_setup_metrics.sql`
4. Paste and run it
5. Refresh your app

The styling issues require code changes which I'll make next.
