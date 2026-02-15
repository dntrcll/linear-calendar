-- Migration: Add recurring events support
-- Description: Adds columns to events table to support recurring events
-- Date: 2026-01-27

-- Add columns for recurrence support
ALTER TABLE events
ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS parent_event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- Add index for parent_event_id for performance
CREATE INDEX IF NOT EXISTS events_parent_event_id_idx ON events(parent_event_id);

-- Add index for recurrence queries
CREATE INDEX IF NOT EXISTS events_recurrence_pattern_idx ON events(recurrence_pattern);

-- Add comment for documentation
COMMENT ON COLUMN events.recurrence_pattern IS 'Recurrence pattern: none, daily, weekly, fortnightly, monthly, yearly';
COMMENT ON COLUMN events.recurrence_end_date IS 'Date when recurrence ends (null = no end date)';
COMMENT ON COLUMN events.parent_event_id IS 'Reference to parent event for recurring instances';
