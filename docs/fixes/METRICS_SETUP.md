# Life Metrics Setup Guide

## 🎯 Overview

The Life Metrics tab allows you to track and visualize important health and performance metrics over time with beautiful multi-line graphs.

## 📊 What You Can Track

### Current Metrics:
- **Sleep Hours** - Track your daily sleep (e.g., 7.5 hours)
- **Weight (kg)** - Monitor weight changes over time
- **Workouts** - Count daily/weekly workouts

### Coming Soon (Easily Extensible):
- Mood ratings
- Water intake
- Steps count
- Calories
- Productivity scores
- Custom metrics

## 🗄️ Database Setup

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

### Step 2: Run the SQL Script

Copy and paste the entire SQL script from `DATABASE_SCHEMA.md` and execute it. This will:

- Create the `life_metrics` table
- Set up proper indexes for performance
- Enable Row Level Security (RLS)
- Create policies so users only see their own data
- Add auto-updating timestamp triggers

### Step 3: Verify Installation

Run this query to verify:

```sql
SELECT * FROM life_metrics LIMIT 1;
```

You should see the table structure (even if empty).

## 🎨 Features

### Premium Multi-Line Chart
- **Smooth Bezier Curves** - Elegant line interpolation
- **Gradient Fills** - Beautiful area fills under curves
- **Multiple Metrics** - Track 3+ metrics on same graph
- **Color Coded** - Each metric has unique color:
  - Purple (#8B5CF6) - Sleep
  - Cyan (#06B6D4) - Weight
  - Amber (#F59E0B) - Workouts
- **Interactive** - Hover to see data points
- **Responsive** - Scales beautifully

### Time Range Filters
- **Week** - Last 7 days
- **Month** - Last 30 days
- **Year** - Last 365 days
- **All** - Complete history

### Quick Stats Dashboard
- Average sleep over period
- Current weight
- Weight change (gain/loss)
- Total workouts

### Easy Data Entry
- Date picker (defaults to today)
- Number inputs for each metric
- Save/Cancel buttons
- Upsert logic (updates existing entries for same date)

## 📈 Usage

1. **Navigate to Metrics Tab**
   - Click "metrics" in the top navigation

2. **Add Your First Entry**
   - Click "+ Add Entry" button
   - Fill in the date and metrics
   - Click "Save"

3. **View Your Data**
   - Chart updates automatically
   - Use time range buttons to zoom
   - Stats cards show summaries

4. **Track Over Time**
   - Add entries daily/weekly
   - Watch trends emerge
   - Monitor progress toward goals

## 🔒 Security

- **Row Level Security (RLS)** - Enabled by default
- **User Isolation** - You only see your own data
- **Secure Policies** - CRUD operations restricted to data owner
- **No Data Leaks** - Queries filtered at database level

## 🚀 Performance

- **Indexed Queries** - Fast data retrieval
- **Optimized Joins** - Efficient user_id + date lookups
- **Client-side Caching** - React state management
- **Lazy Loading** - Only fetch when needed

## 🎨 Design

- **Premium Aesthetics** - Solid backgrounds, no blur
- **Theme Aware** - Adapts to light/dark mode
- **Consistent** - Matches app design language
- **Responsive** - Works on all screen sizes

## 🔧 Extending

Want to add more metrics? Simply:

1. Add column to database:
```sql
ALTER TABLE life_metrics ADD COLUMN mood_rating INTEGER;
```

2. Update the component to include the new field in:
   - Form inputs
   - Chart data
   - Stats calculations

## 💡 Tips

- **Consistency** - Track at the same time daily
- **Honesty** - Accurate data = better insights
- **Regular Review** - Check trends weekly
- **Set Goals** - Use insights to improve

## 🐛 Troubleshooting

**"Please sign in to track metrics"**
- You need to be logged in to use this feature

**"No metrics yet"**
- Add your first entry with the "+ Add Entry" button

**Chart not showing**
- Ensure you have at least 2 data points
- Check that metrics have values (not null)

**Data not saving**
- Verify database is set up correctly
- Check browser console for errors
- Ensure RLS policies are created

Enjoy tracking your life metrics! 📊✨
