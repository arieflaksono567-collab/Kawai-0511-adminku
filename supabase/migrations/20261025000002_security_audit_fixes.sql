-- ==============================================================================
-- MIGRATION 20261025000002: SECURITY AUDIT FIXES
-- Target: Supabase PostgreSQL (KAWAI 0511 - Shared Database)
--
--   K1. is_admin() kembali mewajibkan akun aktif (is_active + status = 'active').
--       Migrasi 20261020000001 sempat menghapus syarat ini sehingga admin yang
--       di-suspend tetap lolos RLS. Flag is_admin TIDAK lagi dipercaya; peran
--       ditentukan hanya dari kolom role.
--   K1b. Trigger anti self-promotion kembali menjaga kolom is_admin.
--   K2. View admin_users & operational_zones dijalankan sebagai pemanggil
--       (security_invoker) agar tidak melewati RLS, dan dicabut dari anon.
--   K3. Idempotency order disimpan di database, unik per (customer_id, key).
--   T2. has_admin_role() diselaraskan ke user_profiles.
--   T3. Policy RLS untuk tabel yang sebelumnya deny-all.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- K1. is_admin(): hanya staf aktif
-- ------------------------------------------------------------------------------
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
          AND role::TEXT IN ('superadmin', 'admin', 'dispatcher', 'finance', 'support')
    );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- T2. has_admin_role(): superadmin & admin mewarisi semua peran staf
-- Signature lama (admin_role_type) dipertahankan agar policy yang bergantung tetap
-- valid. Dilewati bila tipe enum tersebut tidak ada di database.
-- ------------------------------------------------------------------------------
DO $do$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role_type') THEN
        EXECUTE $fn$
            CREATE OR REPLACE FUNCTION public.has_admin_role(required_role admin_role_type)
            RETURNS BOOLEAN
            LANGUAGE sql
            STABLE
            SECURITY DEFINER
            SET search_path = public
            AS $body$
                SELECT EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE id = auth.uid()
                      AND is_active = true
                      AND status = 'active'
                      AND (
                          role::TEXT = required_role::TEXT
                          OR role::TEXT IN ('superadmin', 'admin')
                      )
                );
            $body$;
        $fn$;
        EXECUTE 'REVOKE EXECUTE ON FUNCTION public.has_admin_role(admin_role_type) FROM PUBLIC, anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.has_admin_role(admin_role_type) TO authenticated, service_role';
    END IF;
END
$do$;

-- ------------------------------------------------------------------------------
-- K1b. Trigger anti self-promotion (termasuk kolom is_admin bila ada)
-- Memakai to_jsonb agar tetap aman bila kolom is_admin tidak ada di skema.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_user_self_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- service_role (backend tepercaya) tidak memiliki auth.uid()
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    IF NOT public.is_admin() THEN
        IF (to_jsonb(NEW) -> 'role')      IS DISTINCT FROM (to_jsonb(OLD) -> 'role')
        OR (to_jsonb(NEW) -> 'status')    IS DISTINCT FROM (to_jsonb(OLD) -> 'status')
        OR (to_jsonb(NEW) -> 'is_active') IS DISTINCT FROM (to_jsonb(OLD) -> 'is_active')
        OR (to_jsonb(NEW) -> 'is_admin')  IS DISTINCT FROM (to_jsonb(OLD) -> 'is_admin')
        THEN
            RAISE EXCEPTION 'Akses ditolak: Pengguna biasa tidak diizinkan mengubah hak akses atau peran administratif.'
            USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_user_self_promotion ON public.user_profiles;
CREATE TRIGGER trg_prevent_user_self_promotion
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_user_self_promotion();

-- ------------------------------------------------------------------------------
-- K2. View tidak boleh melewati RLS
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'admin_users') THEN
        EXECUTE 'ALTER VIEW public.admin_users SET (security_invoker = true)';
        EXECUTE 'REVOKE ALL ON public.admin_users FROM anon';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'operational_zones') THEN
        EXECUTE 'ALTER VIEW public.operational_zones SET (security_invoker = true)';
        EXECUTE 'REVOKE ALL ON public.operational_zones FROM anon';
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- K3. Idempotency order (unik per pelanggan)
-- ------------------------------------------------------------------------------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS orders_customer_idempotency_key_uidx
    ON public.orders (customer_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- ------------------------------------------------------------------------------
-- T3. Policy untuk tabel yang sebelumnya tanpa policy (deny-all)
-- Tabel/kolom yang tidak ada di database dilewati agar migrasi tidak gagal.
-- ------------------------------------------------------------------------------
DO $do$
DECLARE
    t TEXT;
    has_col BOOLEAN;
BEGIN
    -- Admin: akses penuh
    FOREACH t IN ARRAY ARRAY['tariff_rules', 'service_types', 'order_status_history', 'payment_transactions', 'support_tickets']
    LOOP
        IF to_regclass('public.' || t) IS NULL THEN
            RAISE NOTICE 'Tabel public.% tidak ada, dilewati', t;
            CONTINUE;
        END IF;
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Admins have full access to ' || t, t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
            'Admins have full access to ' || t, t
        );
    END LOOP;

    -- tariff_rules & service_types: pengguna login boleh membaca (dibutuhkan aplikasi pelanggan/driver)
    FOREACH t IN ARRAY ARRAY['tariff_rules', 'service_types']
    LOOP
        IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated can read ' || t, t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', 'Authenticated can read ' || t, t);
    END LOOP;

    -- order_status_history: pelanggan/driver membaca riwayat order miliknya
    IF to_regclass('public.order_status_history') IS NOT NULL THEN
        DROP POLICY IF EXISTS "Participants can read order_status_history" ON public.order_status_history;
        CREATE POLICY "Participants can read order_status_history"
            ON public.order_status_history FOR SELECT TO authenticated
            USING (EXISTS (
                SELECT 1 FROM public.orders o
                WHERE o.id = order_status_history.order_id
                  AND (o.customer_id = auth.uid() OR o.driver_id = auth.uid())
            ));
    END IF;

    -- payment_transactions: pengguna membaca transaksinya sendiri
    SELECT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'payment_transactions' AND column_name = 'user_id')
      INTO has_col;
    IF has_col THEN
        DROP POLICY IF EXISTS "Users can read own payment_transactions" ON public.payment_transactions;
        CREATE POLICY "Users can read own payment_transactions"
            ON public.payment_transactions FOR SELECT TO authenticated
            USING (user_id = auth.uid());
    END IF;

    -- support_tickets: pengguna membuat & membaca tiketnya sendiri
    SELECT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'support_tickets' AND column_name = 'user_id')
      INTO has_col;
    IF has_col THEN
        DROP POLICY IF EXISTS "Users can read own support_tickets" ON public.support_tickets;
        CREATE POLICY "Users can read own support_tickets"
            ON public.support_tickets FOR SELECT TO authenticated
            USING (user_id = auth.uid());
        DROP POLICY IF EXISTS "Users can create own support_tickets" ON public.support_tickets;
        CREATE POLICY "Users can create own support_tickets"
            ON public.support_tickets FOR INSERT TO authenticated
            WITH CHECK (user_id = auth.uid());
    END IF;
END
$do$;
