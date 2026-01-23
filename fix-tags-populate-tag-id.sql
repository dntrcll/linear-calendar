-- Fix tags by populating tag_id based on name
-- Run this in Supabase SQL Editor

-- Update existing tags to have tag_id based on their name
UPDATE tags
SET tag_id = LOWER(
  CASE 
    WHEN name ILIKE '%work%' THEN 'work'
    WHEN name ILIKE '%personal%' THEN 'personal'
    WHEN name ILIKE '%health%' THEN 'health'
    WHEN name ILIKE '%finance%' THEN 'finance'
    WHEN name ILIKE '%social%' THEN 'social'
    WHEN name ILIKE '%code%' THEN 'code'
    WHEN name ILIKE '%learning%' THEN 'learning'
    WHEN name ILIKE '%other%' THEN 'other'
    ELSE LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g'))
  END
)
WHERE tag_id IS NULL OR tag_id = '';

-- Or simpler: just delete all tags and recreate them
-- Uncomment this if you want to start fresh:
/*
DELETE FROM tags;
*/
