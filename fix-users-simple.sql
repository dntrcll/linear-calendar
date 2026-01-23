-- Simple fix: Just insert your user record
-- Run this in Supabase SQL Editor

-- Insert your current user (minimal version)
INSERT INTO public.users (id, email, created_at, updated_at)
SELECT
  au.id,
  au.email,
  NOW(),
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;
