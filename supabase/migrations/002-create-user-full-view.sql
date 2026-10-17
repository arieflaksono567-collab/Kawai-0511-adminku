-- 002-create-user-full-view.sql
-- Create a read-only view that combines public.user_profiles with auth.users to expose email & profile data
CREATE OR REPLACE VIEW public.user_full_profiles AS
SELECT
  up.id,
  up.display_name,
  up.phone,
  au.email,
  up.role,
  up.created_at,
  up.updated_at,
  up.status,
  up.is_active
FROM public.user_profiles up
LEFT JOIN auth.users au ON au.id = up.id;

-- Add a policy so authenticated users can select either their own row or admins can select all
DROP POLICY IF EXISTS "Authenticated can select their profile or admins" ON public.user_full_profiles;
CREATE POLICY "Authenticated can select their profile or admins" ON public.user_full_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin() OR auth.uid() = id);
