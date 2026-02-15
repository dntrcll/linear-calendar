-- Complete database fix
-- Run this in Supabase SQL Editor

-- Step 1: Ensure tag_id column exists and is populated
ALTER TABLE tags
ADD COLUMN IF NOT EXISTS tag_id TEXT;

-- Step 2: Populate tag_id for existing tags based on name
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
    ELSE LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g'))
  END
)
WHERE tag_id IS NULL OR tag_id = '';

-- Step 3: Show current state
SELECT 
  'Tags' as table_name,
  id,
  tag_id,
  name,
  context,
  user_id
FROM tags
ORDER BY created_at;

-- Step 4: Show current events
SELECT 
  'Events' as table_name,
  e.id,
  e.title,
  e.start_time,
  e.end_time,
  e.tag_id as tag_uuid,
  t.tag_id as tag_string,
  t.name as tag_name,
  e.context,
  e.deleted
FROM events e
LEFT JOIN tags t ON e.tag_id = t.id
WHERE e.deleted = false
ORDER BY e.start_time DESC
LIMIT 20;
