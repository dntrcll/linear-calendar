-- Create life_metrics table for health and productivity tracking
CREATE TABLE life_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('manual', 'auto')),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  metric_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_life_metrics_user_date ON life_metrics(user_id, recorded_at);
CREATE INDEX idx_life_metrics_type ON life_metrics(metric_type);

-- Enable RLS
ALTER TABLE life_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own metrics" ON life_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metrics" ON life_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metrics" ON life_metrics
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own metrics" ON life_metrics
  FOR DELETE USING (auth.uid() = user_id);
