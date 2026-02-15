-- Telemetry system tables
-- Personal telemetry dashboard for habit tracking, mood logging, and monthly reflection

-- Table: telemetry_habits
-- User-defined habits to track (meditation, workout, etc.)
CREATE TABLE IF NOT EXISTS telemetry_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_telemetry_habits_user ON telemetry_habits(user_id, active, display_order);

-- Table: telemetry_days
-- Daily mood/energy scores and optional notes
CREATE TABLE IF NOT EXISTS telemetry_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  mood_score INTEGER CHECK (mood_score >= 0 AND mood_score <= 10),
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_telemetry_days_user_date ON telemetry_days(user_id, date DESC);

-- Table: telemetry_completions
-- Binary habit completion records (X marks in grid)
CREATE TABLE IF NOT EXISTS telemetry_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  habit_id UUID NOT NULL REFERENCES telemetry_habits(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, habit_id)
);

CREATE INDEX idx_telemetry_completions_user_date ON telemetry_completions(user_id, date DESC);
CREATE INDEX idx_telemetry_completions_habit ON telemetry_completions(habit_id);

-- Table: telemetry_month_summaries
-- Monthly "memorable moments" narrative
CREATE TABLE IF NOT EXISTS telemetry_month_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  memorable_moments TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year, month)
);

CREATE INDEX idx_telemetry_summaries_user_month ON telemetry_month_summaries(user_id, year DESC, month DESC);

-- Disable RLS for now (will add later)
ALTER TABLE telemetry_habits DISABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_days DISABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_completions DISABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_month_summaries DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON telemetry_habits TO postgres, anon, authenticated, service_role;
GRANT ALL ON telemetry_days TO postgres, anon, authenticated, service_role;
GRANT ALL ON telemetry_completions TO postgres, anon, authenticated, service_role;
GRANT ALL ON telemetry_month_summaries TO postgres, anon, authenticated, service_role;
