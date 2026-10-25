-- ==============================================================================
-- MIGRATION 20261026000002: ALUR ORDER END-TO-END
-- Target: Supabase PostgreSQL (KAWAI 0511)
-- Prasyarat: 20261025000002 dan 20261026000001 sudah dijalankan.
--
-- Alur (= shared/orderLifecycle.ts):
--   searching → assigned | cancelled
--   assigned  → arrived | in_trip | searching (lepas driver) | cancelled
--   arrived   → in_trip | cancelled
--   in_trip   → completed | cancelled
--   completed, cancelled → (final)
--
-- Isi:
--   1. Trigger validasi perpindahan status, driver wajib, driver terkunci
--      setelah tiba, kelayakan driver (terverifikasi & aktif), driver sibuk.
--   2. Timestamp otomatis (accepted_at, arrived_at, started_at, completed_at,
--      cancelled_at, updated_at) jika kolomnya ada.
--   3. Riwayat status otomatis ke order_status_history dengan status lama
--      yang BENAR dan changed_by = auth.uid(). Panel tidak lagi menulis
--      riwayat sendiri (menghindari duplikat & status lama yang salah).
--   4. Saat order selesai: catatan pembayaran 'pending' dibuat sekali per
--      order di payment_transactions (jika belum ada).
--   5. Indeks unik: satu driver hanya satu order aktif.
--
-- Darurat (koreksi data oleh admin/SQL editor):
--   SET LOCAL kawai.lifecycle_bypass = 'on';  -- hanya berlaku untuk admin / tanpa JWT
--
-- Aman dijalankan ulang.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.order_transition_allowed(old_status TEXT, new_status TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT CASE old_status
        WHEN 'searching' THEN new_status IN ('assigned', 'cancelled')
        WHEN 'assigned'  THEN new_status IN ('arrived', 'in_trip', 'searching', 'cancelled')
        WHEN 'arrived'   THEN new_status IN ('in_trip', 'cancelled')
        WHEN 'in_trip'   THEN new_status IN ('completed', 'cancelled')
        ELSE false
    END;
$$;

-- ------------------------------------------------------------------------------
-- 1 & 2. Validasi + timestamp (BEFORE UPDATE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_order_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    old_s TEXT := OLD.status::TEXT;
    new_s TEXT := NEW.status::TEXT;
    cur JSONB;
    patch JSONB := '{}'::JSONB;
    drv JSONB;
    usr JSONB;
    k TEXT;
BEGIN
    IF coalesce(current_setting('kawai.lifecycle_bypass', true), '') = 'on'
       AND (auth.uid() IS NULL OR public.is_admin()) THEN
        RETURN NEW;
    END IF;

    -- Perpindahan status
    IF new_s IS DISTINCT FROM old_s AND NOT public.order_transition_allowed(old_s, new_s) THEN
        RAISE EXCEPTION 'ORDER_INVALID_TRANSITION: % -> %', old_s, new_s USING ERRCODE = '23514';
    END IF;

    -- Lepas driver: kembali mencari
    IF old_s = 'assigned' AND new_s = 'searching' THEN
        NEW.driver_id := NULL;
        patch := patch || jsonb_build_object('accepted_at', NULL);
    END IF;

    IF new_s IN ('assigned', 'arrived', 'in_trip', 'completed') AND NEW.driver_id IS NULL THEN
        RAISE EXCEPTION 'ORDER_DRIVER_REQUIRED: status % membutuhkan driver', new_s USING ERRCODE = '23514';
    END IF;

    -- Pergantian driver
    IF NEW.driver_id IS DISTINCT FROM OLD.driver_id THEN
        IF old_s NOT IN ('searching', 'assigned') THEN
            RAISE EXCEPTION 'ORDER_DRIVER_LOCKED: driver tidak bisa diganti pada status %', old_s USING ERRCODE = '23514';
        END IF;

        IF NEW.driver_id IS NOT NULL THEN
            SELECT to_jsonb(dp) INTO drv FROM public.driver_profiles dp WHERE dp.user_id = NEW.driver_id LIMIT 1;
            SELECT to_jsonb(up) INTO usr FROM public.user_profiles up WHERE up.id = NEW.driver_id;
            IF drv IS NULL
               OR coalesce(drv ->> 'verification_status', drv ->> 'status', '') NOT IN ('approved', 'verified', 'active')
               OR usr IS NULL
               OR coalesce((usr ->> 'is_active')::BOOLEAN, true) = false
               OR coalesce(usr ->> 'status', 'active') <> 'active' THEN
                RAISE EXCEPTION 'DRIVER_NOT_ELIGIBLE: driver belum terverifikasi atau tidak aktif' USING ERRCODE = '23514';
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.orders o
                WHERE o.driver_id = NEW.driver_id
                  AND o.id <> NEW.id
                  AND o.status::TEXT IN ('assigned', 'arrived', 'in_trip')
            ) THEN
                RAISE EXCEPTION 'DRIVER_BUSY: driver sedang menangani order lain' USING ERRCODE = '23514';
            END IF;
        END IF;
    END IF;

    -- Timestamp otomatis (hanya kolom yang ada, tidak menimpa nilai yang sudah diisi)
    cur := to_jsonb(NEW);
    IF new_s IS DISTINCT FROM old_s THEN
        IF new_s = 'assigned'  AND cur ->> 'accepted_at'  IS NULL THEN patch := patch || jsonb_build_object('accepted_at', now()); END IF;
        IF new_s = 'arrived'   AND cur ->> 'arrived_at'   IS NULL THEN patch := patch || jsonb_build_object('arrived_at', now()); END IF;
        IF new_s = 'in_trip'   AND cur ->> 'started_at'   IS NULL THEN patch := patch || jsonb_build_object('started_at', now()); END IF;
        IF new_s = 'completed' AND cur ->> 'completed_at' IS NULL THEN patch := patch || jsonb_build_object('completed_at', now()); END IF;
        IF new_s = 'cancelled' AND cur ->> 'cancelled_at' IS NULL THEN patch := patch || jsonb_build_object('cancelled_at', now()); END IF;
    END IF;
    patch := patch || jsonb_build_object('updated_at', now());

    FOR k IN SELECT jsonb_object_keys(patch) LOOP
        IF NOT (cur ? k) THEN
            patch := patch - k;
        END IF;
    END LOOP;
    IF patch <> '{}'::JSONB THEN
        NEW := jsonb_populate_record(NEW, patch);
    END IF;

    RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3 & 4. Riwayat status + pembayaran saat selesai (AFTER INSERT/UPDATE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    old_s TEXT := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status::TEXT ELSE NULL END;
    new_s TEXT := NEW.status::TEXT;
    row_j JSONB := to_jsonb(NEW);
    note TEXT;
    cols TEXT[] := ARRAY[]::TEXT[];
    vals TEXT[] := ARRAY[]::TEXT[];
    hcols TEXT[];
    pcols TEXT[];
BEGIN
    IF TG_OP = 'UPDATE' AND old_s IS NOT DISTINCT FROM new_s THEN
        RETURN NULL;
    END IF;

    note := nullif(current_setting('kawai.status_note', true), '');
    IF note IS NULL THEN
        note := CASE WHEN TG_OP = 'INSERT' THEN 'Order dibuat'
                     ELSE format('Status diubah: %s -> %s', old_s, new_s) END;
    END IF;

    -- Riwayat status
    IF to_regclass('public.order_status_history') IS NOT NULL THEN
        SELECT array_agg(column_name::TEXT) INTO hcols
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'order_status_history';

        cols := ARRAY['order_id']; vals := ARRAY[quote_literal(NEW.id)];
        IF 'old_status' = ANY (hcols)      THEN cols := array_append(cols, 'old_status');      vals := array_append(vals, quote_nullable(old_s)); END IF;
        IF 'previous_status' = ANY (hcols) THEN cols := array_append(cols, 'previous_status'); vals := array_append(vals, quote_nullable(old_s)); END IF;
        IF 'new_status' = ANY (hcols)      THEN cols := array_append(cols, 'new_status');      vals := array_append(vals, quote_literal(new_s)); END IF;
        IF 'status' = ANY (hcols)          THEN cols := array_append(cols, 'status');          vals := array_append(vals, quote_literal(new_s)); END IF;
        IF 'changed_by' = ANY (hcols)      THEN cols := array_append(cols, 'changed_by');      vals := array_append(vals, quote_nullable(auth.uid())); END IF;
        IF 'actor_id' = ANY (hcols)        THEN cols := array_append(cols, 'actor_id');        vals := array_append(vals, quote_nullable(auth.uid())); END IF;
        IF 'notes' = ANY (hcols)           THEN cols := array_append(cols, 'notes');           vals := array_append(vals, quote_literal(note)); END IF;

        BEGIN
            EXECUTE format('INSERT INTO public.order_status_history (%s) VALUES (%s)',
                           array_to_string(cols, ', '), array_to_string(vals, ', '));
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'order_status_history gagal dicatat untuk order %: %', NEW.id, SQLERRM;
        END;
    END IF;

    -- Pembayaran saat order selesai (sekali per order)
    IF new_s = 'completed' AND to_regclass('public.payment_transactions') IS NOT NULL THEN
        SELECT array_agg(column_name::TEXT) INTO pcols
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'payment_transactions';

        IF 'order_id' = ANY (pcols) AND 'amount_idr' = ANY (pcols)
           AND NOT EXISTS (SELECT 1 FROM public.payment_transactions p WHERE p.order_id = NEW.id) THEN
            cols := ARRAY['order_id', 'amount_idr'];
            vals := ARRAY[quote_literal(NEW.id), quote_literal(coalesce(row_j ->> 'estimated_fare_idr', '0'))];
            IF 'user_id' = ANY (pcols)  THEN cols := array_append(cols, 'user_id');  vals := array_append(vals, quote_nullable(row_j ->> 'customer_id')); END IF;
            IF 'provider' = ANY (pcols) THEN cols := array_append(cols, 'provider'); vals := array_append(vals, quote_literal('cash')); END IF;
            IF 'method' = ANY (pcols)   THEN cols := array_append(cols, 'method');   vals := array_append(vals, quote_literal('cash')); END IF;
            IF 'status' = ANY (pcols)   THEN cols := array_append(cols, 'status');   vals := array_append(vals, quote_literal('pending')); END IF;
            IF 'metadata' = ANY (pcols) THEN
                cols := array_append(cols, 'metadata');
                vals := array_append(vals, quote_literal(jsonb_build_object('source', 'order_completed', 'driver_id', row_j ->> 'driver_id')::TEXT));
            END IF;
            BEGIN
                EXECUTE format('INSERT INTO public.payment_transactions (%s) VALUES (%s)',
                               array_to_string(cols, ', '), array_to_string(vals, ', '));
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'payment_transactions gagal dibuat untuk order %: %', NEW.id, SQLERRM;
            END;
        END IF;
    END IF;

    RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_order_lifecycle() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_order_status_change() FROM PUBLIC, anon;

DO $do$
BEGIN
    IF to_regclass('public.orders') IS NULL THEN
        RAISE NOTICE 'Tabel public.orders tidak ada, migrasi alur order dilewati';
        RETURN;
    END IF;

    DROP TRIGGER IF EXISTS trg_enforce_order_lifecycle ON public.orders;
    CREATE TRIGGER trg_enforce_order_lifecycle
        BEFORE UPDATE ON public.orders
        FOR EACH ROW EXECUTE FUNCTION public.enforce_order_lifecycle();

    DROP TRIGGER IF EXISTS trg_log_order_status_change ON public.orders;
    CREATE TRIGGER trg_log_order_status_change
        AFTER INSERT OR UPDATE OF status ON public.orders
        FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

    -- 5. Satu driver hanya satu order aktif (penjaga balapan dua dispatcher)
    BEGIN
        CREATE UNIQUE INDEX IF NOT EXISTS orders_one_active_order_per_driver_uidx
            ON public.orders (driver_id)
            WHERE driver_id IS NOT NULL AND status IN ('assigned', 'arrived', 'in_trip');
    EXCEPTION WHEN unique_violation THEN
        RAISE WARNING 'Indeks orders_one_active_order_per_driver_uidx tidak dibuat: ada driver dengan lebih dari satu order aktif. Bereskan datanya lalu jalankan ulang migrasi ini.';
    END;
END
$do$;
