-- Update life_metrics table to support existing MetricsView code
-- This supports the current simple metrics view while we rebuild it in Phase 3-4

DROP TABLE IF EXISTS life_metrics CASCADE;

-- Create life_metrics table with columns that match existing MetricsView
CREATE TABLE life_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sleep_hours NUMERIC,
  weight_kg NUMERIC,
  workouts_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Indexes for common queries
CREATE INDEX idx_life_metrics_user_date ON life_metrics(user_id, date);

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
