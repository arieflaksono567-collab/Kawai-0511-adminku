-- 001-add-user-status.sql
-- Adds status/is_active columns to public.user_profiles and policy for admin updates
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Ensure only admins can update these fields
DROP POLICY IF EXISTS "Admins can update user status" ON public.user_profiles;
CREATE POLICY "Admins can update user status" ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
