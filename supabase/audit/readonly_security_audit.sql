-- ==============================================================================
-- KAWAI 0511 — AUDIT KEAMANAN & SKEMA (READ-ONLY)
--
-- Aman dijalankan di produksi: hanya SELECT ke katalog sistem. Tidak membuat,
-- mengubah, atau menghapus objek apa pun, dan tidak menampilkan data pribadi
-- (hanya jumlah).
--
-- Cara pakai: Supabase Dashboard → SQL Editor → tempel seluruh isi → Run.
-- Hasil: satu tabel (status, kelompok, cek, objek, detail). Urutkan/filter
-- kolom status: FAIL dulu, lalu WARN.
--
--   FAIL = perlu diperbaiki     WARN = perlu ditinjau
--   OK   = sesuai harapan       INFO = data pendukung
-- ==============================================================================

WITH
-- ------------------------------------------------------------------------------
-- Data dasar
-- ------------------------------------------------------------------------------
pub_tables AS (
    SELECT c.oid, c.relname, c.relrowsecurity AS rls, c.relforcerowsecurity AS force_rls
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
),
pub_views AS (
    SELECT c.relname, coalesce(array_to_string(c.reloptions, ','), '') AS opts
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'v'
),
pol AS (
    SELECT tablename, policyname, cmd, roles::TEXT AS roles,
           coalesce(qual, '') AS qual, coalesce(with_check, '') AS with_check
    FROM pg_policies WHERE schemaname = 'public'
),
definer_fns AS (
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args,
           coalesce(array_to_string(p.proconfig, ','), '') AS config,
           has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
),
is_admin_def AS (
    SELECT pg_get_functiondef(p.oid) AS def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin' AND p.pronargs = 0
    LIMIT 1
),
self_promo_def AS (
    SELECT pg_get_functiondef(p.oid) AS def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'prevent_user_self_promotion'
    LIMIT 1
),
up_cols AS (
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
),
sensitive(relname) AS (
    VALUES ('user_profiles'), ('driver_profiles'), ('orders'), ('payment_transactions'),
           ('support_tickets'), ('audit_logs'), ('admin_settings'), ('order_status_history'),
           ('driver_documents')
),

-- ------------------------------------------------------------------------------
-- A1. is_admin()
-- ------------------------------------------------------------------------------
a1 AS (
    SELECT
        CASE WHEN d.def IS NULL THEN 'FAIL'
             WHEN d.def ILIKE '%is_active%' AND d.def ILIKE '%status%' AND d.def NOT ILIKE '%is_admin = true%' THEN 'OK'
             ELSE 'FAIL' END AS status,
        'A. Hak akses' AS grp,
        'A1 is_admin() wajib cek akun aktif & tidak percaya flag is_admin' AS chk,
        'public.is_admin()' AS obj,
        CASE WHEN d.def IS NULL THEN 'Fungsi tidak ditemukan'
             ELSE 'is_active=' || (d.def ILIKE '%is_active%')::TEXT
                  || ', status=' || (d.def ILIKE '%status%')::TEXT
                  || ', pakai flag is_admin=' || (d.def ILIKE '%is_admin = true%')::TEXT
                  || ', security definer=' || (d.def ILIKE '%SECURITY DEFINER%')::TEXT
                  || ', search_path diset=' || (d.def ILIKE '%search_path%')::TEXT END AS detail
    FROM (SELECT (SELECT def FROM is_admin_def) AS def) d
),
a1_fns AS (
    SELECT
        CASE WHEN config NOT ILIKE '%search_path%' THEN 'FAIL'
             WHEN anon_exec AND proname IN ('is_admin', 'has_admin_role') THEN 'WARN'
             ELSE 'OK' END,
        'A. Hak akses',
        'A1 Fungsi SECURITY DEFINER: search_path terkunci & EXECUTE',
        'public.' || proname || '(' || args || ')',
        'search_path: ' || CASE WHEN config ILIKE '%search_path%' THEN config ELSE 'TIDAK DISET' END
            || ' | anon EXECUTE=' || anon_exec::TEXT || ' | authenticated EXECUTE=' || auth_exec::TEXT
    FROM definer_fns
),

-- ------------------------------------------------------------------------------
-- A3. Self-promotion
-- ------------------------------------------------------------------------------
a3_trigger AS (
    SELECT
        CASE WHEN count(*) = 0 THEN 'FAIL' ELSE 'OK' END,
        'A. Hak akses',
        'A3 Trigger anti self-promotion aktif di user_profiles',
        'public.user_profiles',
        coalesce(string_agg(t.tgname || CASE WHEN t.tgenabled = 'D' THEN ' (NONAKTIF)' ELSE '' END, ', '), 'Tidak ada trigger')
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE n.nspname = 'public' AND c.relname = 'user_profiles' AND NOT t.tgisinternal
      AND p.proname = 'prevent_user_self_promotion' AND t.tgenabled <> 'D'
),
a3_columns AS (
    SELECT
        CASE WHEN x.def IS NULL OR x.missing <> '' THEN 'FAIL' ELSE 'OK' END,
        'A. Hak akses',
        'A3 Trigger menjaga semua kolom hak akses yang ada',
        'prevent_user_self_promotion()',
        CASE WHEN x.def IS NULL THEN 'Fungsi tidak ditemukan'
             WHEN x.missing = '' THEN 'Menjaga: role, status, is_active' || CASE WHEN x.has_flag THEN ', is_admin' ELSE '' END
             ELSE 'Kolom TIDAK dijaga: ' || x.missing END
    FROM (
        SELECT d.def,
               EXISTS (SELECT 1 FROM up_cols WHERE column_name = 'is_admin') AS has_flag,
               concat_ws(', ',
                   CASE WHEN d.def NOT ILIKE '%role%' THEN 'role' END,
                   CASE WHEN EXISTS (SELECT 1 FROM up_cols WHERE column_name = 'status') AND d.def NOT ILIKE '%status%' THEN 'status' END,
                   CASE WHEN EXISTS (SELECT 1 FROM up_cols WHERE column_name = 'is_active') AND d.def NOT ILIKE '%is_active%' THEN 'is_active' END,
                   CASE WHEN EXISTS (SELECT 1 FROM up_cols WHERE column_name = 'is_admin') AND d.def NOT ILIKE '%''is_admin''%' AND d.def NOT ILIKE '%NEW.is_admin%' THEN 'is_admin' END
               ) AS missing
        FROM (SELECT (SELECT def FROM self_promo_def) AS def) d
    ) x
),
a3_insert AS (
    SELECT 'WARN', 'A. Hak akses',
           'A3 Policy INSERT/ALL user_profiles untuk non-admin (bisa daftar sebagai admin?)',
           'public.user_profiles · ' || policyname,
           'cmd=' || cmd || ' roles=' || roles || ' with_check=' || left(with_check, 200)
    FROM pol
    WHERE tablename = 'user_profiles' AND cmd IN ('INSERT', 'ALL')
      AND with_check NOT ILIKE '%is_admin()%' AND qual NOT ILIKE '%is_admin()%'
),

-- ------------------------------------------------------------------------------
-- A4. RLS & policies
-- ------------------------------------------------------------------------------
a4_rls AS (
    SELECT
        CASE WHEN NOT t.rls THEN 'FAIL'
             WHEN count(p.policyname) = 0 THEN 'WARN'
             ELSE 'OK' END,
        'A. Hak akses',
        'A4 RLS aktif & punya policy',
        'public.' || t.relname,
        'RLS=' || t.rls::TEXT || ' | jumlah policy=' || count(p.policyname)
            || CASE WHEN t.rls AND count(p.policyname) = 0 THEN ' (deny-all: panel tidak bisa akses)' ELSE '' END
    FROM pub_tables t LEFT JOIN pol p ON p.tablename = t.relname
    GROUP BY t.relname, t.rls
),
a4_open AS (
    SELECT
        CASE WHEN p.tablename IN (SELECT relname FROM sensitive) THEN 'FAIL'
             -- Baca tarif/jenis layanan oleh pengguna login memang disengaja
             WHEN p.tablename IN ('tariff_rules', 'service_types') AND p.cmd = 'SELECT' AND p.roles = '{authenticated}' THEN 'INFO'
             ELSE 'WARN' END,
        'A. Hak akses',
        'A4 Policy terbuka (USING true / anon / public)',
        'public.' || p.tablename || ' · ' || p.policyname,
        'cmd=' || p.cmd || ' roles=' || p.roles || ' using=' || left(p.qual, 120) || ' check=' || left(p.with_check, 120)
    FROM pol p
    WHERE (btrim(p.qual) = 'true' OR btrim(p.with_check) = 'true' OR p.roles ~ '(anon|public)')
),
a4_flag AS (
    SELECT 'FAIL', 'A. Hak akses',
           'A4 Policy memakai flag is_admin yang bisa diubah pengguna',
           'public.' || tablename || ' · ' || policyname,
           left(qual || ' ' || with_check, 240)
    FROM pol
    WHERE (qual || with_check) ~* 'is_admin\s*=\s*true'
),
a4_grants AS (
    SELECT
        CASE WHEN t.relname IN (SELECT relname FROM sensitive) AND NOT t.rls THEN 'FAIL' ELSE 'INFO' END,
        'A. Hak akses',
        'A4 Hak tabel untuk anon',
        'public.' || t.relname,
        'anon: select=' || has_table_privilege('anon', t.oid, 'SELECT')::TEXT
            || ' insert=' || has_table_privilege('anon', t.oid, 'INSERT')::TEXT
            || ' update=' || has_table_privilege('anon', t.oid, 'UPDATE')::TEXT
            || ' delete=' || has_table_privilege('anon', t.oid, 'DELETE')::TEXT
            || ' | RLS=' || t.rls::TEXT
    FROM pub_tables t
    WHERE has_table_privilege('anon', t.oid, 'SELECT,INSERT,UPDATE,DELETE')
),
a4_views AS (
    SELECT
        CASE WHEN v.opts ILIKE '%security_invoker=true%' OR v.opts ILIKE '%security_invoker=on%' THEN 'OK'
             WHEN has_table_privilege('anon', ('public.' || quote_ident(v.relname))::regclass, 'SELECT') THEN 'FAIL'
             ELSE 'WARN' END,
        'A. Hak akses',
        'A4 View memakai security_invoker (tidak melewati RLS)',
        'public.' || v.relname,
        'opsi=' || CASE WHEN v.opts = '' THEN '(kosong)' ELSE v.opts END
            || ' | anon SELECT=' || has_table_privilege('anon', ('public.' || quote_ident(v.relname))::regclass, 'SELECT')::TEXT
    FROM pub_views v
),
a4_matrix AS (
    SELECT 'INFO', 'A. Hak akses', 'A4 Matriks policy (tabel × operasi × peran)',
           'public.' || tablename,
           string_agg(cmd || ' → ' || roles || ' [' ||
               CASE WHEN (qual || with_check) ILIKE '%is_admin()%' THEN 'admin'
                    WHEN (qual || with_check) ILIKE '%auth.uid()%' THEN 'pemilik'
                    WHEN btrim(qual) = 'true' THEN 'semua'
                    ELSE 'lainnya' END || '] ' || policyname, ' | ' ORDER BY cmd, policyname)
    FROM pol GROUP BY tablename
),

-- ------------------------------------------------------------------------------
-- A2. Distribusi peran (jumlah saja, tanpa data pribadi)
-- ------------------------------------------------------------------------------
a2_roles AS (
    SELECT 'INFO', 'A. Hak akses', 'A2 Distribusi peran user_profiles', 'public.user_profiles',
           (xpath('/row/r/text()', query_to_xml(
               'SELECT coalesce(string_agg(role || '': '' || n, '', '' ORDER BY role), ''(kosong)'') AS r
                  FROM (SELECT role::TEXT AS role, count(*) AS n FROM public.user_profiles GROUP BY 1) s',
               false, true, '')))[1]::TEXT
    WHERE to_regclass('public.user_profiles') IS NOT NULL
),
a2_inactive_staff AS (
    SELECT
        CASE WHEN n::INT > 0 THEN 'INFO' ELSE 'OK' END,
        'A. Hak akses', 'A2 Akun staf nonaktif/suspended (harus ditolak is_admin)', 'public.user_profiles',
        n || ' akun staf tidak aktif'
    FROM (
        SELECT (xpath('/row/n/text()', query_to_xml(
            'SELECT count(*) AS n FROM public.user_profiles
              WHERE role::TEXT IN (''superadmin'',''admin'',''dispatcher'',''finance'',''support'')
                AND (is_active IS DISTINCT FROM true OR status IS DISTINCT FROM ''active'')',
            false, true, '')))[1]::TEXT AS n
        WHERE EXISTS (SELECT 1 FROM up_cols WHERE column_name = 'is_active')
          AND EXISTS (SELECT 1 FROM up_cols WHERE column_name = 'status')
    ) s
),
a2_default_admin AS (
    SELECT
        CASE WHEN n::INT > 0 THEN 'WARN' ELSE 'OK' END,
        'A. Hak akses', 'A2 Akun default admin@kawai0511.id ada di Auth?', 'auth.users',
        CASE WHEN n::INT > 0 THEN 'Ada — pastikan password sudah diganti (bukan admin123)' ELSE 'Tidak ada' END
    FROM (
        SELECT (xpath('/row/n/text()', query_to_xml(
            'SELECT count(*) AS n FROM auth.users WHERE lower(email) = ''admin@kawai0511.id''',
            false, true, '')))[1]::TEXT AS n
        WHERE to_regclass('auth.users') IS NOT NULL
    ) s
),

-- ------------------------------------------------------------------------------
-- B. Skema & migrasi
-- ------------------------------------------------------------------------------
b_migrations AS (
    SELECT
        CASE WHEN v IS NULL THEN 'WARN' ELSE 'INFO' END,
        'B. Skema & migrasi', 'B1 Riwayat migrasi tercatat (supabase_migrations)',
        'supabase_migrations.schema_migrations',
        coalesce(v, 'Tabel riwayat tidak ada / kosong: migrasi kemungkinan dijalankan manual lewat SQL Editor')
    FROM (
        SELECT CASE WHEN to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
            (xpath('/row/v/text()', query_to_xml(
                'SELECT string_agg(version || coalesce('' '' || name, ''''), '', '' ORDER BY version) AS v
                   FROM supabase_migrations.schema_migrations',
                false, true, '')))[1]::TEXT END AS v
    ) s
),
expected_migrations(version) AS (
    VALUES ('20261014000001'), ('20261014000002'), ('20261014000003'), ('20261014000004'),
           ('20261017000001'), ('20261020000001'), ('20261020000002'), ('20261025000001'),
           ('20261025000002')
),
b_migration_each AS (
    SELECT
        CASE WHEN applied THEN 'OK' ELSE 'WARN' END,
        'B. Skema & migrasi', 'B1 Migrasi repo tercatat diterapkan', e.version,
        CASE WHEN applied THEN 'Tercatat' ELSE 'Tidak tercatat (cek manual dengan B2–B4)' END
    FROM expected_migrations e
    CROSS JOIN LATERAL (
        SELECT CASE WHEN to_regclass('supabase_migrations.schema_migrations') IS NULL THEN false
               ELSE coalesce((xpath('/row/x/text()', query_to_xml(
                   format('SELECT count(*) > 0 AS x FROM supabase_migrations.schema_migrations WHERE version = %L', e.version),
                   false, true, '')))[1]::TEXT = 'true', false) END AS applied
    ) a
    WHERE to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
),
b_audit_fix_effects AS (
    SELECT
        CASE WHEN ok THEN 'OK' ELSE 'FAIL' END,
        'B. Skema & migrasi', 'B2 Efek migrasi 20261025000002 ada di database', obj, detail
    FROM (VALUES
        ('orders.idempotency_key',
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'idempotency_key'),
         'Wajib ada: backend baru menulis kolom ini saat membuat order'),
        ('orders_customer_idempotency_key_uidx',
         EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'orders_customer_idempotency_key_uidx'),
         'Unique index (customer_id, idempotency_key)')
    ) v(obj, ok, detail)
),
expected_columns(tbl, col) AS (
    VALUES
        ('user_profiles', 'id'), ('user_profiles', 'role'), ('user_profiles', 'status'), ('user_profiles', 'is_active'),
        ('orders', 'id'), ('orders', 'customer_id'), ('orders', 'driver_id'), ('orders', 'service_type_id'),
        ('orders', 'status'), ('orders', 'created_at'), ('orders', 'estimated_fare_idr'),
        ('orders', 'estimated_distance_km'), ('orders', 'tariff_version'), ('orders', 'calculation_details'),
        ('orders', 'notes'), ('orders', 'idempotency_key'),
        ('tariff_rules', 'service_type_id'), ('tariff_rules', 'status'), ('tariff_rules', 'version'),
        ('tariff_rules', 'base_fare_idr'), ('tariff_rules', 'included_distance_km'), ('tariff_rules', 'fare_per_km_idr'),
        ('tariff_rules', 'minimum_fare_idr'), ('tariff_rules', 'booking_fee_idr'),
        ('service_zones', 'boundary'), ('service_zones', 'is_active'),
        ('order_status_history', 'order_id'),
        ('payment_transactions', 'user_id'), ('support_tickets', 'user_id'),
        ('driver_profiles', 'user_id'), ('driver_profiles', 'verification_status'),
        ('audit_logs', 'id')
),
b_columns AS (
    SELECT
        CASE WHEN to_regclass('public.' || e.tbl) IS NULL THEN 'FAIL'
             WHEN c.column_name IS NULL THEN 'FAIL' ELSE 'OK' END,
        'B. Skema & migrasi', 'B3 Kolom yang dipakai kode ada di database',
        e.tbl || '.' || e.col,
        CASE WHEN to_regclass('public.' || e.tbl) IS NULL THEN 'Tabel tidak ada'
             WHEN c.column_name IS NULL THEN 'Kolom tidak ada'
             ELSE c.data_type || CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END END
    FROM expected_columns e
    LEFT JOIN information_schema.columns c
           ON c.table_schema = 'public' AND c.table_name = e.tbl AND c.column_name = e.col
),
b_role_type AS (
    SELECT 'INFO', 'B. Skema & migrasi', 'B4 Tipe kolom role & nilai yang diizinkan', 'user_profiles.role',
           coalesce((
               SELECT c.udt_name || coalesce(' enum: ' || (
                   SELECT string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder)
                   FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = c.udt_name
               ), '')
               FROM information_schema.columns c
               WHERE c.table_schema = 'public' AND c.table_name = 'user_profiles' AND c.column_name = 'role'
           ), 'Kolom tidak ada')
               || coalesce(' | CHECK: ' || (
                   SELECT string_agg(pg_get_constraintdef(con.oid), '; ')
                   FROM pg_constraint con
                   WHERE con.conrelid = to_regclass('public.user_profiles') AND con.contype = 'c'
                     AND pg_get_constraintdef(con.oid) ILIKE '%role%'
               ), '')
),
b_order_status AS (
    SELECT 'INFO', 'B. Skema & migrasi', 'B4 Nilai status order yang dipakai', 'orders.status',
           (xpath('/row/v/text()', query_to_xml(
               'SELECT coalesce(string_agg(status || '': '' || n, '', '' ORDER BY status), ''(kosong)'') AS v
                  FROM (SELECT status::TEXT AS status, count(*) AS n FROM public.orders GROUP BY 1) s',
               false, true, '')))[1]::TEXT
    WHERE to_regclass('public.orders') IS NOT NULL
),
b_tariffs AS (
    SELECT
        CASE WHEN n::INT = 0 THEN 'FAIL' ELSE 'OK' END,
        'B. Skema & migrasi', 'B5 Aturan tarif aktif tersedia', 'public.tariff_rules',
        n || ' aturan aktif' || CASE WHEN n::INT = 0 THEN ' — semua order akan gagal TARIFF_NOT_FOUND' ELSE '' END
    FROM (
        SELECT (xpath('/row/n/text()', query_to_xml(
            'SELECT count(*) AS n FROM public.tariff_rules WHERE status = ''active''', false, true, '')))[1]::TEXT AS n
        WHERE to_regclass('public.tariff_rules') IS NOT NULL
    ) s
),
b_zones AS (
    SELECT 'INFO', 'B. Skema & migrasi', 'B5 Zona aktif dengan polygon terisi', 'public.service_zones',
           (xpath('/row/v/text()', query_to_xml(
               'SELECT count(*) FILTER (WHERE is_active) || '' aktif, ''
                    || count(*) FILTER (WHERE is_active AND jsonb_typeof(boundary->''coordinates'') = ''array''
                                        AND jsonb_array_length(boundary->''coordinates'') > 0)
                    || '' dengan polygon (sisanya memakai kotak bawaan Banjarmasin Raya)'' AS v
                  FROM public.service_zones',
               false, true, '')))[1]::TEXT
    WHERE to_regclass('public.service_zones') IS NOT NULL
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'service_zones' AND column_name = 'boundary')
),
b_server AS (
    SELECT 'INFO', 'B. Skema & migrasi', 'B0 Versi PostgreSQL', 'server', version()
),

allrows(status, grp, chk, obj, detail) AS (
    SELECT * FROM a1
    UNION ALL SELECT * FROM a1_fns
    UNION ALL SELECT * FROM a2_roles
    UNION ALL SELECT * FROM a2_inactive_staff
    UNION ALL SELECT * FROM a2_default_admin
    UNION ALL SELECT * FROM a3_trigger
    UNION ALL SELECT * FROM a3_columns
    UNION ALL SELECT * FROM a3_insert
    UNION ALL SELECT * FROM a4_rls
    UNION ALL SELECT * FROM a4_open
    UNION ALL SELECT * FROM a4_flag
    UNION ALL SELECT * FROM a4_grants
    UNION ALL SELECT * FROM a4_views
    UNION ALL SELECT * FROM a4_matrix
    UNION ALL SELECT * FROM b_server
    UNION ALL SELECT * FROM b_migrations
    UNION ALL SELECT * FROM b_migration_each
    UNION ALL SELECT * FROM b_audit_fix_effects
    UNION ALL SELECT * FROM b_columns
    UNION ALL SELECT * FROM b_role_type
    UNION ALL SELECT * FROM b_order_status
    UNION ALL SELECT * FROM b_tariffs
    UNION ALL SELECT * FROM b_zones
)
SELECT status, grp AS kelompok, chk AS cek, obj AS objek, detail
FROM allrows
ORDER BY
    CASE status WHEN 'FAIL' THEN 1 WHEN 'WARN' THEN 2 WHEN 'OK' THEN 3 ELSE 4 END,
    grp, chk, obj;
