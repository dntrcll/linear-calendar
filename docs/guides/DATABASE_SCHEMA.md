# Database Schema for Life Metrics

## Table: life_metrics

### SQL Creation Script

```sql
-- Create life_metrics table
CREATE TABLE IF NOT EXISTS public.life_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sleep_hours DECIMAL(4,2),
  weight_kg DECIMAL(5,2),
  workouts_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS life_metrics_user_date_idx ON public.life_metrics(user_id, date DESC);

-- Enable Row Level Security
ALTER TABLE public.life_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own metrics"
  ON public.life_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics"
  ON public.life_metrics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metrics"
  ON public.life_metrics
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own metrics"
  ON public.life_metrics
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
CREATE TRIGGER update_life_metrics_updated_at
  BEFORE UPDATE ON public.life_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Fields Description

- **id**: Unique identifier for each metric entry
- **user_id**: Reference to the user who owns this metric
- **date**: The date this metric is for (unique per user)
- **sleep_hours**: Hours of sleep for that day (decimal, e.g., 7.5)
- **weight_kg**: Weight in kilograms (decimal, e.g., 75.5)
- **workouts_count**: Number of workouts that day (integer)
- **created_at**: Timestamp when the record was created
- **updated_at**: Timestamp when the record was last updated

## Future Extensions

Can add more metric columns as needed:
- mood_rating (1-10)
- water_intake_liters
- steps_count
- calories_consumed
- productivity_score
- etc.

## Usage

Run this SQL in your Supabase SQL Editor to create the table and set up proper security policies.
