-- ==============================================================================
-- MIGRATION 20261014000003: RBAC & ROW LEVEL SECURITY (RLS) POLICIES
-- Target: PostgreSQL / Supabase
-- Purpose: Complete Data Isolation & RBAC Access Enforcement
-- ==============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Security Definer Helper Function to verify active admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE id = auth.uid()
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Security Definer Helper Function to verify specific admin role
CREATE OR REPLACE FUNCTION public.has_admin_role(required_role admin_role_type)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE id = auth.uid()
        AND is_active = true
        AND (role = required_role OR role = 'superadmin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Admin Users Policies
DROP POLICY IF EXISTS "Admins can view admin directory" ON public.admin_users;
CREATE POLICY "Admins can view admin directory"
    ON public.admin_users FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Superadmins can manage admin users" ON public.admin_users;
CREATE POLICY "Superadmins can manage admin users"
    ON public.admin_users FOR ALL
    TO authenticated
    USING (public.has_admin_role('superadmin'))
    WITH CHECK (public.has_admin_role('superadmin'));

-- 5. Drivers Policies
DROP POLICY IF EXISTS "Admins have full access to drivers" ON public.drivers;
CREATE POLICY "Admins have full access to drivers"
    ON public.drivers FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 6. Driver Documents Policies
DROP POLICY IF EXISTS "Admins can read driver documents" ON public.driver_documents;
CREATE POLICY "Admins can read driver documents"
    ON public.driver_documents FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update driver document status" ON public.driver_documents;
CREATE POLICY "Admins can update driver document status"
    ON public.driver_documents FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 7. Orders Policies
DROP POLICY IF EXISTS "Admins have full access to orders" ON public.orders;
CREATE POLICY "Admins have full access to orders"
    ON public.orders FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 8. Operational Zones Policies
DROP POLICY IF EXISTS "Admins have full access to operational zones" ON public.operational_zones;
CREATE POLICY "Admins have full access to operational zones"
    ON public.operational_zones FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 9. Audit Logs Policies (Append-only; no modification or deletion)
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());
