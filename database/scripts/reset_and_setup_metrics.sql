-- RESET AND SETUP LIFE METRICS TABLE
-- This script safely drops existing table and recreates everything from scratch

-- Drop existing trigger first
DROP TRIGGER IF EXISTS update_life_metrics_updated_at ON public.life_metrics;

-- Drop existing function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own metrics" ON public.life_metrics;
DROP POLICY IF EXISTS "Users can insert their own metrics" ON public.life_metrics;
DROP POLICY IF EXISTS "Users can update their own metrics" ON public.life_metrics;
DROP POLICY IF EXISTS "Users can delete their own metrics" ON public.life_metrics;

-- Drop existing index
DROP INDEX IF EXISTS public.life_metrics_user_date_idx;

-- Drop existing table (this will cascade delete all data)
DROP TABLE IF EXISTS public.life_metrics;

-- Create life_metrics table
CREATE TABLE public.life_metrics (
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
CREATE INDEX life_metrics_user_date_idx ON public.life_metrics(user_id, date DESC);

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
CREATE FUNCTION update_updated_at_column()
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
