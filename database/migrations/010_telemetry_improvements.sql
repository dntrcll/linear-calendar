-- Telemetry improvements: habit types, daily memorable moments, mood emojis

-- Add habit_type column to distinguish build vs eliminate habits
ALTER TABLE telemetry_habits ADD COLUMN IF NOT EXISTS habit_type TEXT DEFAULT 'build' CHECK (habit_type IN ('build', 'eliminate'));

-- Add memorable_moment to daily entries (moved from monthly summary)
ALTER TABLE telemetry_days ADD COLUMN IF NOT EXISTS memorable_moment TEXT DEFAULT '';

-- Add mood_emoji to daily entries (in addition to mood_score)
ALTER TABLE telemetry_days ADD COLUMN IF NOT EXISTS mood_emoji TEXT DEFAULT '';

-- Update existing habits to have default type
UPDATE telemetry_habits SET habit_type = 'build' WHERE habit_type IS NULL;
