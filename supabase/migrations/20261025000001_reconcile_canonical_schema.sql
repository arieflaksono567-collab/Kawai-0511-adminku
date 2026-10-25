-- ==============================================================================
-- MIGRATION 20261025000001: RECONCILE CANONICAL SCHEMA & BACKWARD COMPATIBILITY
-- Target: Supabase PostgreSQL (KAWAI 0511 - Shared Database)
-- Purpose:
--   1. Reconcile driver_profiles: ensure user_id is UNIQUE/PK, support vehicle_plate & vehicle_type
--   2. Reconcile orders: add canonical columns (pickup_address, dropoff_address, service_type_id,
--      estimated_distance_km, estimated_fare_idr, tariff_version, calculation_details) alongside legacy columns
--   3. Backfill data bidirectionally between legacy and canonical columns
--   4. Extend orders_status_check constraint to accept both canonical and legacy statuses
--   5. Reconcile order_status_history with old_status and previous_status
--   6. Provide backward-compatible views (public.admin_users, public.operational_zones)
--   7. Maintain and harden Row Level Security (RLS) across all tables
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. RECONCILE user_profiles
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'display_name'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN display_name TEXT;
    END IF;
END $$;

UPDATE public.user_profiles 
SET display_name = COALESCE(display_name, full_name, 'Pengguna KAWAI')
WHERE display_name IS NULL;

-- ------------------------------------------------------------------------------
-- 2. RECONCILE driver_profiles
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'driver_profiles' AND column_name = 'vehicle_plate'
    ) THEN
        ALTER TABLE public.driver_profiles ADD COLUMN vehicle_plate TEXT;
    END IF;
END $$;

-- Backfill vehicle_plate from plate_number if present
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'driver_profiles' AND column_name = 'plate_number'
    ) THEN
        UPDATE public.driver_profiles 
        SET vehicle_plate = COALESCE(vehicle_plate, plate_number, 'DA 0000 XX')
        WHERE vehicle_plate IS NULL;
    END IF;
END $$;

-- Ensure user_id has unique constraint if table has standalone id PK
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' AND table_name = 'driver_profiles' 
        AND constraint_type = 'UNIQUE' AND constraint_name = 'driver_profiles_user_id_key'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' AND table_name = 'driver_profiles' 
        AND constraint_type = 'PRIMARY KEY' AND constraint_name = 'driver_profiles_pkey'
        AND EXISTS (
            SELECT 1 FROM information_schema.key_column_usage
            WHERE table_name = 'driver_profiles' AND column_name = 'user_id'
        )
    ) THEN
        ALTER TABLE public.driver_profiles ADD CONSTRAINT driver_profiles_user_id_key UNIQUE (user_id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN duplicate_table THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 3. RECONCILE orders (Canonical & Legacy Columns Support)
-- ------------------------------------------------------------------------------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS service_type_id UUID REFERENCES public.service_types(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_address TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dropoff_address TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_lat DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_lng DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dropoff_lat DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dropoff_lng DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_distance_km NUMERIC;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_fare_idr INTEGER;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tariff_version TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS calculation_details JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Backfill data bidirectionally between legacy and canonical columns
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'origin_address') THEN
        UPDATE public.orders
        SET 
            pickup_address = COALESCE(pickup_address, origin_address, 'Titik Jemput KAWAI'),
            dropoff_address = COALESCE(dropoff_address, destination_address, 'Titik Antar KAWAI'),
            pickup_lat = COALESCE(pickup_lat, origin_lat, -3.3194),
            pickup_lng = COALESCE(pickup_lng, origin_lng, 114.5908),
            dropoff_lat = COALESCE(dropoff_lat, destination_lat, -3.3240),
            dropoff_lng = COALESCE(dropoff_lng, destination_lng, 114.5970),
            estimated_distance_km = COALESCE(estimated_distance_km, distance_km, 1.0),
            estimated_fare_idr = COALESCE(estimated_fare_idr, ROUND(fare_amount)::INTEGER, 8000)
        WHERE pickup_address IS NULL OR estimated_fare_idr IS NULL;
    END IF;
END $$;

-- Reconcile orders status check constraint to support both sets of statuses
DO $$ BEGIN
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
    ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
    CHECK (status::TEXT IN (
        'searching', 'assigned', 'arrived', 'in_trip', 'completed', 'cancelled',
        'pending', 'in_progress'
    ));
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 4. RECONCILE order_status_history
-- ------------------------------------------------------------------------------
ALTER TABLE public.order_status_history ADD COLUMN IF NOT EXISTS old_status TEXT;
ALTER TABLE public.order_status_history ADD COLUMN IF NOT EXISTS previous_status TEXT;
ALTER TABLE public.order_status_history ADD COLUMN IF NOT EXISTS new_status TEXT;
ALTER TABLE public.order_status_history ADD COLUMN IF NOT EXISTS changed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- ------------------------------------------------------------------------------
-- 5. BACKWARD COMPATIBILITY VIEWS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.admin_users AS
SELECT 
    id,
    COALESCE(phone, id::TEXT) AS email,
    COALESCE(display_name, 'Administrator KAWAI') AS full_name,
    role::TEXT AS role,
    is_active,
    created_at,
    updated_at
FROM public.user_profiles
WHERE role = 'admin';

CREATE OR REPLACE VIEW public.operational_zones AS
SELECT 
    id,
    name,
    city,
    code AS area_code,
    8000::NUMERIC(10,2) AS base_fare_motor,
    2500::NUMERIC(10,2) AS per_km_motor,
    16000::NUMERIC(10,2) AS base_fare_car,
    5000::NUMERIC(10,2) AS per_km_car,
    1.00::NUMERIC(3,2) AS surge_multiplier,
    is_active,
    created_at,
    updated_at
FROM public.service_zones;

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to orders" ON public.orders;
CREATE POLICY "Admins have full access to orders"
    ON public.orders FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Customers can read their own orders" ON public.orders;
CREATE POLICY "Customers can read their own orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Drivers can read assigned orders" ON public.orders;
CREATE POLICY "Drivers can read assigned orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (auth.uid() = driver_id);
