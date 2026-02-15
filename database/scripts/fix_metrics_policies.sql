-- Fix RLS Policies for life_metrics table
-- Run this if you're still getting RLS errors

-- First, disable RLS temporarily to check if that's the issue
ALTER TABLE public.life_metrics DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.life_metrics ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own metrics" ON public.life_metrics;
DROP POLICY IF EXISTS "Users can insert their own metrics" ON public.life_metrics;
DROP POLICY IF EXISTS "Users can update their own metrics" ON public.life_metrics;
DROP POLICY IF EXISTS "Users can delete their own metrics" ON public.life_metrics;

-- Create more permissive policies for testing
CREATE POLICY "Enable read for authenticated users"
  ON public.life_metrics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for authenticated users"
  ON public.life_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for authenticated users"
  ON public.life_metrics
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for authenticated users"
  ON public.life_metrics
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'life_metrics';
