-- ============================================
-- COMPLETE FIX - RUN THIS ENTIRE SCRIPT
-- Copy everything and paste into Supabase SQL Editor
-- ============================================

-- Step 1: Check your current tags (should see 15 tags)
SELECT 'Your Tags:' as info, tag_id, name, context FROM tags ORDER BY context, name;

-- Step 2: Check your current events
SELECT 'Your Events:' as info, COUNT(*) as total_events FROM events WHERE deleted = false;

-- Step 3: Create a test event for TODAY
DO $$
DECLARE
  v_user_id UUID;
  v_tag_id UUID;
BEGIN
  -- Get your user ID
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  -- Get the health tag (or any available tag)
  SELECT id INTO v_tag_id FROM tags
  WHERE user_id = v_user_id AND tag_id = 'health'
  LIMIT 1;

  -- If no health tag, use any tag
  IF v_tag_id IS NULL THEN
    SELECT id INTO v_tag_id FROM tags
    WHERE user_id = v_user_id
    LIMIT 1;
  END IF;

  -- Delete any old test events
  DELETE FROM events
  WHERE user_id = v_user_id
  AND title LIKE 'Test Event%';

  -- Create test event for 2 hours from now
  INSERT INTO events (
    user_id,
    title,
    description,
    start_time,
    end_time,
    tag_id,
    context,
    deleted
  ) VALUES (
    v_user_id,
    'Test Event - Working!',
    'This proves the calendar is working correctly',
    NOW() + INTERVAL '2 hours',
    NOW() + INTERVAL '3 hours',
    v_tag_id,
    'personal',
    false
  );

  RAISE NOTICE '✅ SUCCESS! Test event created for % with tag %', v_user_id, v_tag_id;
END $$;

-- Step 4: Verify the test event was created
SELECT
  'Verification:' as info,
  e.title,
  e.start_time,
  e.end_time,
  t.name as tag_name,
  t.tag_id
FROM events e
LEFT JOIN tags t ON e.tag_id = t.id
WHERE e.title LIKE 'Test Event%'
ORDER BY e.created_at DESC
LIMIT 1;

-- Step 5: Show all your events with tags
SELECT
  'All Your Events:' as info,
  e.title,
  e.start_time::date as date,
  e.start_time::time as time,
  t.name as tag,
  t.tag_id
FROM events e
LEFT JOIN tags t ON e.tag_id = t.id
WHERE e.deleted = false
ORDER BY e.start_time DESC
LIMIT 10;
