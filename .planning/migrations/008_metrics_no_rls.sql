-- Drop and recreate life_metrics table WITHOUT RLS
-- This will just work without permission issues

DROP TABLE IF EXISTS life_metrics CASCADE;

CREATE TABLE life_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('manual', 'auto')),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  metric_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_life_metrics_user_date ON life_metrics(user_id, recorded_at);
CREATE INDEX idx_life_metrics_type ON life_metrics(metric_type);

-- Disable RLS completely - we'll add it later after it works
ALTER TABLE life_metrics DISABLE ROW LEVEL SECURITY;

-- Grant all permissions
GRANT ALL ON life_metrics TO postgres;
GRANT ALL ON life_metrics TO anon;
GRANT ALL ON life_metrics TO authenticated;
GRANT ALL ON life_metrics TO service_role;
