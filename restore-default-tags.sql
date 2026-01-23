-- Restore default tags for your user
-- Run this in Supabase SQL Editor

-- First, get your user ID
-- Replace 'YOUR_EMAIL_HERE' with your actual email
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user ID from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  LIMIT 1;

  -- Delete existing tags for this user (to avoid duplicates)
  DELETE FROM tags WHERE user_id = v_user_id;

  -- Insert default Personal tags
  INSERT INTO tags (user_id, tag_id, name, icon_name, context, color, bg_color, text_color, border_color)
  VALUES
    (v_user_id, 'work', 'Work', 'Briefcase', 'personal', '#EA580C', '#FFF7ED', '#EA580C', '#FDBA74'),
    (v_user_id, 'personal', 'Personal', 'Home', 'personal', '#8B5CF6', '#F5F3FF', '#8B5CF6', '#C4B5FD'),
    (v_user_id, 'health', 'Health', 'Heart', 'personal', '#10B981', '#ECFDF5', '#10B981', '#6EE7B7'),
    (v_user_id, 'finance', 'Finance', 'DollarSign', 'personal', '#F59E0B', '#FFFBEB', '#F59E0B', '#FCD34D'),
    (v_user_id, 'social', 'Social', 'Users', 'personal', '#EC4899', '#FDF2F8', '#EC4899', '#F9A8D4'),
    (v_user_id, 'learning', 'Learning', 'BookOpen', 'personal', '#3B82F6', '#EFF6FF', '#3B82F6', '#93C5FD'),
    (v_user_id, 'fitness', 'Fitness', 'Dumbbell', 'personal', '#14B8A6', '#F0FDFA', '#14B8A6', '#5EEAD4'),
    (v_user_id, 'food', 'Food', 'Coffee', 'personal', '#F97316', '#FFF7ED', '#F97316', '#FDBA74'),
    (v_user_id, 'travel', 'Travel', 'Plane', 'personal', '#6366F1', '#EEF2FF', '#6366F1', '#A5B4FC'),
    (v_user_id, 'entertainment', 'Entertainment', 'Film', 'personal', '#A855F7', '#FAF5FF', '#A855F7', '#D8B4FE');

  -- Insert default Family tags
  INSERT INTO tags (user_id, tag_id, name, icon_name, context, color, bg_color, text_color, border_color)
  VALUES
    (v_user_id, 'family-time', 'Family Time', 'Home', 'family', '#EC4899', '#FDF2F8', '#EC4899', '#F9A8D4'),
    (v_user_id, 'kids', 'Kids', 'Baby', 'family', '#F59E0B', '#FFFBEB', '#F59E0B', '#FCD34D'),
    (v_user_id, 'household', 'Household', 'Home', 'family', '#8B5CF6', '#F5F3FF', '#8B5CF6', '#C4B5FD'),
    (v_user_id, 'family-health', 'Family Health', 'Heart', 'family', '#10B981', '#ECFDF5', '#10B981', '#6EE7B7'),
    (v_user_id, 'events', 'Events', 'Calendar', 'family', '#3B82F6', '#EFF6FF', '#3B82F6', '#93C5FD');

  RAISE NOTICE 'Default tags created for user %', v_user_id;
END $$;

-- Verify tags were created
SELECT tag_id, name, icon_name, context, color
FROM tags
ORDER BY context, created_at;
