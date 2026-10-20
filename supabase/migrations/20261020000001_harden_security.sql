-- ==============================================================================
-- MIGRATION 20261020000001: SECURITY HARDENING (RLS & FUNCTION SECURITY)
-- Target: Supabase PostgreSQL (Shared Database KAWAI 0511)
-- ==============================================================================

-- 1. Fix SECURITY DEFINER function vulnerabilities (Missing search_path)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.prevent_user_self_promotion()
RETURNS TRIGGER AS $$
BEGIN
    -- If updater is not an active admin, block changes to administrative columns
    IF NOT public.is_admin() THEN
        IF NEW.role IS DISTINCT FROM OLD.role OR
           NEW.status IS DISTINCT FROM OLD.status OR
           NEW.is_active IS DISTINCT FROM OLD.is_active THEN
            RAISE EXCEPTION 'Akses ditolak: Pengguna biasa tidak diizinkan mengubah hak akses atau peran administratif.'
            USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Enhance user_profiles RLS policies
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile"
    ON public.user_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 3. Ensure orders RLS policies exist
DROP POLICY IF EXISTS "Customers can view their own orders" ON public.orders;
CREATE POLICY "Customers can view their own orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Drivers can view assigned orders" ON public.orders;
CREATE POLICY "Drivers can view assigned orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (driver_id = auth.uid());

-- 4. Audit tables RLS (Prevent data tampering)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());
