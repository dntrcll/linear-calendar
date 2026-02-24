-- Migration 011: Enable RLS on telemetry and life_metrics tables
-- These tables previously had RLS disabled, exposing user data cross-account.
-- This migration enables RLS and creates proper user-scoped policies.
--
-- IMPORTANT: Run this in the Supabase SQL Editor.
-- This is a SECURITY-CRITICAL migration.

-- ============================================================
-- 1. TELEMETRY_HABITS
-- ============================================================
ALTER TABLE telemetry_habits ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive policies
DROP POLICY IF EXISTS "Users can view own habits" ON telemetry_habits;
DROP POLICY IF EXISTS "Users can create habits" ON telemetry_habits;
DROP POLICY IF EXISTS "Users can update own habits" ON telemetry_habits;
DROP POLICY IF EXISTS "Users can delete own habits" ON telemetry_habits;

CREATE POLICY "Users can view own habits"
  ON telemetry_habits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create habits"
  ON telemetry_habits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits"
  ON telemetry_habits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits"
  ON telemetry_habits FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 2. TELEMETRY_DAYS
-- ============================================================
ALTER TABLE telemetry_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own days" ON telemetry_days;
DROP POLICY IF EXISTS "Users can create days" ON telemetry_days;
DROP POLICY IF EXISTS "Users can update own days" ON telemetry_days;
DROP POLICY IF EXISTS "Users can delete own days" ON telemetry_days;

CREATE POLICY "Users can view own days"
  ON telemetry_days FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create days"
  ON telemetry_days FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own days"
  ON telemetry_days FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own days"
  ON telemetry_days FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 3. TELEMETRY_COMPLETIONS
-- ============================================================
ALTER TABLE telemetry_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own completions" ON telemetry_completions;
DROP POLICY IF EXISTS "Users can create completions" ON telemetry_completions;
DROP POLICY IF EXISTS "Users can update own completions" ON telemetry_completions;
DROP POLICY IF EXISTS "Users can delete own completions" ON telemetry_completions;

CREATE POLICY "Users can view own completions"
  ON telemetry_completions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create completions"
  ON telemetry_completions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own completions"
  ON telemetry_completions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own completions"
  ON telemetry_completions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 4. TELEMETRY_MONTH_SUMMARIES
-- ============================================================
ALTER TABLE telemetry_month_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own summaries" ON telemetry_month_summaries;
DROP POLICY IF EXISTS "Users can create summaries" ON telemetry_month_summaries;
DROP POLICY IF EXISTS "Users can update own summaries" ON telemetry_month_summaries;
DROP POLICY IF EXISTS "Users can delete own summaries" ON telemetry_month_summaries;

CREATE POLICY "Users can view own summaries"
  ON telemetry_month_summaries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create summaries"
  ON telemetry_month_summaries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own summaries"
  ON telemetry_month_summaries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own summaries"
  ON telemetry_month_summaries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 5. LIFE_METRICS
-- ============================================================
ALTER TABLE life_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own metrics" ON life_metrics;
DROP POLICY IF EXISTS "Users can create metrics" ON life_metrics;
DROP POLICY IF EXISTS "Users can update own metrics" ON life_metrics;
DROP POLICY IF EXISTS "Users can delete own metrics" ON life_metrics;

CREATE POLICY "Users can view own metrics"
  ON life_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create metrics"
  ON life_metrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metrics"
  ON life_metrics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own metrics"
  ON life_metrics FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 6. Revoke overly permissive grants from anon role
-- ============================================================
REVOKE ALL ON telemetry_habits FROM anon;
REVOKE ALL ON telemetry_days FROM anon;
REVOKE ALL ON telemetry_completions FROM anon;
REVOKE ALL ON telemetry_month_summaries FROM anon;
REVOKE ALL ON life_metrics FROM anon;

-- Grant only to authenticated users (service_role always has access)
GRANT SELECT, INSERT, UPDATE, DELETE ON telemetry_habits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON telemetry_days TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON telemetry_completions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON telemetry_month_summaries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON life_metrics TO authenticated;
