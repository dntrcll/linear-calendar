-- COMPLETE FIX for life_metrics table
-- Run this entire script to fix everything

-- 1. Drop everything and start fresh
DROP TABLE IF EXISTS life_metrics CASCADE;

-- 2. Create table with correct structure
CREATE TABLE life_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  sleep_hours NUMERIC,
  weight_kg NUMERIC,
  workouts_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 3. Create indexes
CREATE INDEX idx_life_metrics_user_date ON life_metrics(user_id, date);

-- 4. Enable RLS
ALTER TABLE life_metrics ENABLE ROW LEVEL SECURITY;

-- 5. Create policies with PERMISSIVE (default) mode
CREATE POLICY "Enable read access for users to own metrics"
ON life_metrics FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Enable insert access for users to own metrics"
ON life_metrics FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Enable update access for users to own metrics"
ON life_metrics FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Enable delete access for users to own metrics"
ON life_metrics FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 6. Grant permissions
GRANT ALL ON life_metrics TO authenticated;
GRANT ALL ON life_metrics TO service_role;

-- 7. Verify everything is set up
SELECT
    'Table exists' as check_name,
    EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'life_metrics') as result
UNION ALL
SELECT
    'RLS enabled' as check_name,
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'life_metrics') as result
UNION ALL
SELECT
    'Policies count' as check_name,
    COUNT(*)::boolean as result
FROM pg_policies
WHERE tablename = 'life_metrics';
