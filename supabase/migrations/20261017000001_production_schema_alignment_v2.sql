-- ==============================================================================
-- MIGRATION 20261017000001: PRODUCTION SCHEMA ALIGNMENT & SECURITY HARDENING
-- Target: Supabase PostgreSQL (Shared Database KAWAI 0511)
-- Purpose:
--   1. Align user_profiles with display_name and optional status/wallet columns
--   2. Align driver_profiles with vehicle_plate and vehicle_type (motorcycle, car, van, other)
--   3. Enforce privilege escalation protection on user_profiles (users cannot self-promote to admin)
--   4. RLS protection for system_change_runs and system_readiness_status
--   5. Non-destructive, 100% backward-compatible with passenger and driver mobile apps
-- ==============================================================================

-- 1. USER PROFILES ALIGNMENT (display_name support)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'display_name'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN display_name TEXT;
    END IF;
END $$;

-- Backfill display_name from full_name if present
UPDATE public.user_profiles 
SET display_name = COALESCE(display_name, full_name, 'Pengguna KAWAI')
WHERE display_name IS NULL;

-- 2. DRIVER PROFILES ALIGNMENT (vehicle_plate and vehicle_type support)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'driver_profiles' AND column_name = 'vehicle_plate'
    ) THEN
        ALTER TABLE public.driver_profiles ADD COLUMN vehicle_plate TEXT;
    END IF;
END $$;

-- Backfill vehicle_plate from plate_number if present
UPDATE public.driver_profiles 
SET vehicle_plate = COALESCE(vehicle_plate, plate_number, 'DA 0000 XX')
WHERE vehicle_plate IS NULL;

-- Ensure vehicle_type supports motorcycle, car, van, other
DO $$ BEGIN
    -- Drop old check constraint if it strictly limited to 'motor','mobil'
    ALTER TABLE public.driver_profiles DROP CONSTRAINT IF EXISTS driver_profiles_vehicle_type_check;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

ALTER TABLE public.driver_profiles 
ADD CONSTRAINT driver_profiles_vehicle_type_check 
CHECK (vehicle_type IN ('motorcycle', 'car', 'van', 'other', 'motor', 'mobil'));

-- 3. PRIVILEGE ESCALATION PREVENTION ON user_profiles
-- Regular users must NEVER be able to update role, is_admin, or status on their own profile!
CREATE OR REPLACE FUNCTION public.prevent_user_self_promotion()
RETURNS TRIGGER AS $$
BEGIN
    -- If updater is not an active admin, block changes to administrative columns
    IF NOT public.is_admin() THEN
        IF NEW.is_admin IS DISTINCT FROM OLD.is_admin OR
           NEW.role IS DISTINCT FROM OLD.role OR
           NEW.status IS DISTINCT FROM OLD.status OR
           NEW.is_active IS DISTINCT FROM OLD.is_active THEN
            RAISE EXCEPTION 'Akses ditolak: Pengguna biasa tidak diizinkan mengubah hak akses atau peran administratif.'
            USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_user_self_promotion ON public.user_profiles;
CREATE TRIGGER trg_prevent_user_self_promotion
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_user_self_promotion();

-- 4. RLS AUDIT FOR DEVOPS TRACKING TABLES (system_change_runs & system_readiness_status)
CREATE TABLE IF NOT EXISTS public.system_change_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    executed_by TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.system_readiness_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subsystem TEXT NOT NULL UNIQUE,
    is_ready BOOLEAN NOT NULL DEFAULT true,
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    details JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.system_change_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_readiness_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to system_change_runs" ON public.system_change_runs;
CREATE POLICY "Admins have full access to system_change_runs"
    ON public.system_change_runs FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to system_readiness_status" ON public.system_readiness_status;
CREATE POLICY "Admins have full access to system_readiness_status"
    ON public.system_readiness_status FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 5. SHARED FUNCTIONS SAFETY AUDIT NOTICE
-- The following functions are used by passenger and driver mobile applications and MUST NOT be removed:
-- - accept_order
-- - advance_order_status
-- - list_available_orders
-- - set_driver_presence
-- These functions remain authorized and functional for their respective callers.
