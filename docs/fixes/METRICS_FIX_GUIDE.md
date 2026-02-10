# Metrics Tab Fix Guide

## Issues Fixed

### 1. Database Setup Error - "Policy Already Exists"
**Problem**: The table and policies were already partially created, causing errors when running the setup script again.

**Solution**: Created a new SQL script that safely drops and recreates everything.

### 2. Save Button Not Working
**Problem**: No error handling or user feedback when save fails.

**Solution**: Added comprehensive error handling, loading states, and user feedback.

---

## How to Fix

### Step 1: Reset and Setup Database

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open the file `reset_and_setup_metrics.sql` in this directory
5. Copy the **entire contents** of that file
6. Paste into the Supabase SQL Editor
7. Click **Run** or press Ctrl+Enter

**What this does:**
- Safely drops existing table, policies, triggers (if they exist)
- Creates a fresh `life_metrics` table
- Sets up all Row Level Security policies
- Creates indexes for performance
- Adds auto-updating timestamp triggers

⚠️ **Warning**: This will delete any existing data in the `life_metrics` table!

### Step 2: Test the Save Button

1. Reload your app in the browser
2. Navigate to the **Metrics** tab
3. Click **+ Add Entry**
4. Fill in:
   - Date (defaults to today)
   - At least one metric (sleep, weight, or workouts)
5. Click **Save**

**What to expect:**
- Button shows "Saving..." while processing
- Button is disabled during save
- Success: Alert says "Metric saved successfully!" and form closes
- Error: Alert shows detailed error message with troubleshooting tips
- All errors are also logged to browser console (F12)

### Step 3: Check Browser Console

Open browser console (F12 or Right-click → Inspect → Console) and look for:

**Successful save:**
```
[MetricsView] Saving metric: {date: "2026-01-24", sleep: "7.5", ...}
[MetricsView] Prepared data: {user_id: "...", date: "2026-01-24", ...}
[MetricsView] Supabase response: {data: [...], error: null}
[MetricsView] Successfully saved metric
```

**Failed save:**
```
[MetricsView] Saving metric: ...
[MetricsView] Supabase error: {...}
Error saving metric: ...
```

---

## Improvements Made to Save Function

### Error Handling
- Validates user is signed in
- Checks date is selected
- Ensures at least one metric is filled
- Shows specific error messages

### User Feedback
- Loading state on button ("Saving...")
- Disabled button during save
- Success alert after save
- Detailed error alerts with troubleshooting steps
- Visual error message box below form

### Debugging
- Console logs at each step
- Detailed error messages
- Shows exactly what data is being sent
- Displays Supabase response

### Data Validation
- Converts empty strings to null (not zero)
- Validates numeric inputs
- Prevents duplicate dates (upserts existing entries)

---

## Troubleshooting

### If save still fails after database setup:

1. **Check RLS Policies**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'life_metrics';
   ```
   Should show 4 policies (SELECT, INSERT, UPDATE, DELETE)

2. **Verify Table Exists**
   ```sql
   SELECT * FROM life_metrics LIMIT 1;
   ```
   Should show empty result or data (not an error)

3. **Test Permissions**
   ```sql
   INSERT INTO life_metrics (user_id, date, sleep_hours)
   VALUES (auth.uid(), CURRENT_DATE, 7.5);
   ```
   Should insert successfully

4. **Check Browser Console**
   - Press F12
   - Go to Console tab
   - Look for errors in red
   - Check Network tab for failed requests

5. **Verify User ID**
   Open console and run:
   ```javascript
   console.log(window.supabase?.auth?.user());
   ```
   Should show your user object with an `id` field

---

## Files Modified

- `src/App.js` - Enhanced saveMetric function with error handling and logging
- `reset_and_setup_metrics.sql` - Clean database setup script with DROP IF EXISTS
- `METRICS_FIX_GUIDE.md` - This file

---

## Next Steps

After successfully saving your first metric:

1. Add more entries over time
2. Use time range selector (Week/Month/Year/All)
3. Watch the multi-line chart update
4. Check stats cards for insights
5. Track trends over time

---

## Support

If issues persist:
1. Check browser console for specific errors
2. Verify Supabase project is active
3. Confirm you're signed in
4. Check RLS policies are enabled
5. Test with simple values first (e.g., sleep: 8, weight: 70, workouts: 1)
