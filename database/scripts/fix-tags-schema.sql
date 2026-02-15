-- Fix tags table schema - Add missing tag_id column
-- Run this in Supabase SQL Editor

-- Add tag_id column to tags table
ALTER TABLE tags
ADD COLUMN IF NOT EXISTS tag_id TEXT;

-- Create index on tag_id for better query performance
CREATE INDEX IF NOT EXISTS idx_tags_tag_id ON tags(tag_id);

-- Create unique constraint on user_id + tag_id + context
-- This prevents duplicate tags with same tag_id in same context for same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_unique_user_tag_context
ON tags(user_id, tag_id, context);
