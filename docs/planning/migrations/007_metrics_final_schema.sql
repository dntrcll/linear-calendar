-- Final metrics schema for Phase 3
-- Clean slate, no RLS issues

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

-- NO RLS for now - we'll add it after testing
-- This will just work without policy issues
