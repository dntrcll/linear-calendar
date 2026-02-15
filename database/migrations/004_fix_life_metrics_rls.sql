-- Fix RLS policies for life_metrics table
-- Drop existing policies and recreate them correctly

DROP POLICY IF EXISTS "Users can view own metrics" ON life_metrics;
DROP POLICY IF EXISTS "Users can insert own metrics" ON life_metrics;
DROP POLICY IF EXISTS "Users can update own metrics" ON life_metrics;
DROP POLICY IF EXISTS "Users can delete own metrics" ON life_metrics;

-- Recreate policies with correct syntax
CREATE POLICY "Users can view own metrics"
ON life_metrics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metrics"
ON life_metrics FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metrics"
ON life_metrics FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own metrics"
ON life_metrics FOR DELETE
USING (auth.uid() = user_id);

-- Verify RLS is enabled
ALTER TABLE life_metrics ENABLE ROW LEVEL SECURITY;
