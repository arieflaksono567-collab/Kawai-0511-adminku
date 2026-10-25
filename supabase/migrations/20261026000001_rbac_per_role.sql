-- ==============================================================================
-- MIGRATION 20261026000001: HAK AKSES DIPISAH PER PERAN (RBAC least-privilege)
-- Target: Supabase PostgreSQL (KAWAI 0511)
-- Prasyarat: 20261025000002_security_audit_fixes.sql sudah dijalankan.
--
-- Perubahan perilaku:
--   * is_admin() kini HANYA superadmin & admin aktif (akses penuh).
--     Semua policy lama "Admins ..." yang memakai is_admin() otomatis menjadi
--     khusus superadmin/admin.
--   * Peran terbatas (dispatcher, finance, support) mendapat policy sendiri
--     sesuai matriks di shared/rbac.ts → DB_PERMISSIONS.
--   * Peran terbatas tidak pernah mendapat DELETE.
--   * Kolom sensitif (tarif, pelanggan, rute, saldo) tidak bisa diubah peran
--     terbatas walaupun mereka boleh UPDATE barisnya.
--   * Hanya superadmin/admin yang bisa mengubah peran/status pengguna
--     (trigger anti self-promotion memakai is_admin()).
--
-- Aman dijalankan ulang. Tabel/kolom yang tidak ada dilewati.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Fungsi bantu
-- ------------------------------------------------------------------------------

-- Akses penuh: superadmin & admin aktif
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
          AND is_active = true
          AND status = 'active'
          AND role::TEXT IN ('superadmin', 'admin')
    );
$$;

-- Semua staf aktif (untuk login panel)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
          AND is_active = true
          AND status = 'active'
          AND role::TEXT IN ('superadmin', 'admin', 'dispatcher', 'finance', 'support')
    );
$$;

-- Staf aktif dengan salah satu peran yang diminta (superadmin/admin selalu lolos)
CREATE OR REPLACE FUNCTION public.has_staff_role(allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
          AND is_active = true
          AND status = 'active'
          AND (
              role::TEXT IN ('superadmin', 'admin')
              OR role::TEXT = ANY (allowed_roles)
          )
    );
$$;

-- Staf terbatas yang aktif (dispatcher/finance/support)
CREATE OR REPLACE FUNCTION public.is_limited_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
          AND is_active = true
          AND status = 'active'
          AND role::TEXT IN ('dispatcher', 'finance', 'support')
    );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_staff_role(TEXT[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_limited_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_staff_role(TEXT[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_limited_staff() TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 2. Policy per peran (matriks = shared/rbac.ts → DB_PERMISSIONS)
-- ------------------------------------------------------------------------------
DO $do$
DECLARE
    r RECORD;
    pname TEXT;
    has_actor BOOLEAN;
BEGIN
    -- Hapus policy rbac_ lama agar matriks selalu persis
    FOR r IN
        SELECT tablename, policyname FROM pg_policies
        WHERE schemaname = 'public' AND policyname LIKE 'rbac\_%'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
    END LOOP;

    FOR r IN
        SELECT * FROM (VALUES
            ('orders',               'SELECT', ARRAY['dispatcher', 'finance', 'support']),
            ('orders',               'UPDATE', ARRAY['dispatcher']),
            ('order_status_history', 'SELECT', ARRAY['dispatcher', 'finance', 'support']),
            ('order_status_history', 'INSERT', ARRAY['dispatcher']),
            ('user_profiles',        'SELECT', ARRAY['dispatcher', 'finance', 'support']),
            ('driver_profiles',      'SELECT', ARRAY['dispatcher', 'finance', 'support']),
            ('driver_profiles',      'INSERT', ARRAY['dispatcher']),
            ('driver_profiles',      'UPDATE', ARRAY['dispatcher']),
            ('driver_documents',     'SELECT', ARRAY['dispatcher', 'support']),
            ('driver_documents',     'UPDATE', ARRAY['dispatcher']),
            ('service_zones',        'SELECT', ARRAY['dispatcher', 'finance', 'support']),
            ('service_zones',        'UPDATE', ARRAY['dispatcher', 'finance']),
            ('tariff_rules',         'INSERT', ARRAY['finance']),
            ('tariff_rules',         'UPDATE', ARRAY['finance']),
            ('service_types',        'INSERT', ARRAY['finance']),
            ('service_types',        'UPDATE', ARRAY['finance']),
            ('payment_transactions', 'SELECT', ARRAY['finance']),
            ('payment_transactions', 'INSERT', ARRAY['finance']),
            ('payment_transactions', 'UPDATE', ARRAY['finance']),
            ('support_tickets',      'SELECT', ARRAY['support']),
            ('support_tickets',      'INSERT', ARRAY['support']),
            ('support_tickets',      'UPDATE', ARRAY['support'])
        ) AS m(tbl, op, roles)
    LOOP
        IF to_regclass('public.' || r.tbl) IS NULL THEN
            RAISE NOTICE 'Tabel public.% tidak ada, dilewati', r.tbl;
            CONTINUE;
        END IF;
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tbl);
        pname := 'rbac_' || r.tbl || '_' || lower(r.op);

        IF r.op = 'SELECT' THEN
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.has_staff_role(%L::TEXT[]))',
                pname, r.tbl, r.roles);
        ELSIF r.op = 'INSERT' THEN
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_staff_role(%L::TEXT[]))',
                pname, r.tbl, r.roles);
        ELSIF r.op = 'UPDATE' THEN
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.has_staff_role(%L::TEXT[])) WITH CHECK (public.has_staff_role(%L::TEXT[]))',
                pname, r.tbl, r.roles, r.roles);
        END IF;
    END LOOP;

    -- audit_logs: semua staf boleh mencatat, hanya atas nama dirinya sendiri.
    -- Membaca audit log tetap hanya superadmin/admin (policy is_admin() yang ada).
    IF to_regclass('public.audit_logs') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY';
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'actor_id'
        ) INTO has_actor;
        IF has_actor THEN
            EXECUTE 'CREATE POLICY rbac_audit_logs_insert ON public.audit_logs FOR INSERT TO authenticated
                     WITH CHECK (public.is_staff() AND (actor_id IS NULL OR actor_id = auth.uid()))';
        ELSE
            EXECUTE 'CREATE POLICY rbac_audit_logs_insert ON public.audit_logs FOR INSERT TO authenticated
                     WITH CHECK (public.is_staff())';
        END IF;
    END IF;
END
$do$;

-- ------------------------------------------------------------------------------
-- 3. Kolom terlindungi untuk peran terbatas
-- (= shared/rbac.ts → PROTECTED_COLUMNS)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_limited_staff_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    col TEXT;
BEGIN
    -- Hanya berlaku untuk dispatcher/finance/support. Admin, pelanggan, driver,
    -- dan service_role (backend) tidak terpengaruh.
    IF auth.uid() IS NULL OR NOT public.is_limited_staff() THEN
        RETURN NEW;
    END IF;

    FOREACH col IN ARRAY TG_ARGV LOOP
        IF (to_jsonb(NEW) -> col) IS DISTINCT FROM (to_jsonb(OLD) -> col) THEN
            RAISE EXCEPTION 'Akses ditolak: peran Anda tidak boleh mengubah kolom %.%', TG_TABLE_NAME, col
            USING ERRCODE = '42501';
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$;

DO $do$
BEGIN
    IF to_regclass('public.orders') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_guard_limited_staff_orders ON public.orders;
        CREATE TRIGGER trg_guard_limited_staff_orders
            BEFORE UPDATE ON public.orders
            FOR EACH ROW EXECUTE FUNCTION public.guard_limited_staff_columns(
                'customer_id', 'service_type_id', 'idempotency_key',
                'pickup_address', 'pickup_lat', 'pickup_lng',
                'dropoff_address', 'dropoff_lat', 'dropoff_lng',
                'estimated_distance_km', 'estimated_fare_idr', 'final_fare_idr',
                'tariff_version', 'calculation_details', 'created_at'
            );
    END IF;
    IF to_regclass('public.driver_profiles') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_guard_limited_staff_driver_profiles ON public.driver_profiles;
        CREATE TRIGGER trg_guard_limited_staff_driver_profiles
            BEFORE UPDATE ON public.driver_profiles
            FOR EACH ROW EXECUTE FUNCTION public.guard_limited_staff_columns(
                'user_id', 'wallet_balance', 'rating', 'total_trips', 'created_at'
            );
    END IF;
END
$do$;
