-- ==============================================================================
-- MIGRATION 20261014000004: PRODUCTION SCHEMA ALIGNMENT (KAWAI 0511)
-- Target Project: rbfnjgrnojvzvrpyryms (Supabase PostgreSQL)
-- Tables Aligned:
--   1. user_profiles
--   2. driver_profiles
--   3. service_types
--   4. service_zones
--   5. tariff_rules
--   6. orders
--   7. order_status_history
--   8. support_tickets
--   9. payment_transactions
--  10. admin_settings
--  11. audit_logs
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE admin_role_type AS ENUM ('superadmin', 'admin', 'dispatcher', 'finance', 'support', 'customer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE driver_status_type AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status_type AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. USER PROFILES TABLE (Source of Truth for All App Users & Admins)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    role admin_role_type NOT NULL DEFAULT 'customer',
    is_admin BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    wallet_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. DRIVER PROFILES TABLE (Mitra Pengemudi KAWAI 0511)
CREATE TABLE IF NOT EXISTS public.driver_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    vehicle_type TEXT NOT NULL DEFAULT 'motor' CHECK (vehicle_type IN ('motor', 'mobil')),
    plate_number TEXT NOT NULL,
    vehicle_brand TEXT,
    vehicle_year INT,
    status driver_status_type NOT NULL DEFAULT 'pending_verification',
    rating NUMERIC(3,2) NOT NULL DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5),
    total_trips INT NOT NULL DEFAULT 0 CHECK (total_trips >= 0),
    wallet_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    documents JSONB DEFAULT '{"ktp": "pending", "sim": "pending", "stnk": "pending", "skck": "pending"}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. SERVICE TYPES TABLE
CREATE TABLE IF NOT EXISTS public.service_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE, -- 'ride_motor', 'ride_car', 'food', 'delivery'
    name TEXT NOT NULL,
    description TEXT,
    icon_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. SERVICE ZONES TABLE (0511 Banjarmasin Raya)
CREATE TABLE IF NOT EXISTS public.service_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Banjarmasin',
    area_code TEXT NOT NULL DEFAULT '0511',
    base_fare_motor NUMERIC(10,2) NOT NULL DEFAULT 8000,
    per_km_motor NUMERIC(10,2) NOT NULL DEFAULT 2500,
    base_fare_car NUMERIC(10,2) NOT NULL DEFAULT 16000,
    per_km_car NUMERIC(10,2) NOT NULL DEFAULT 5000,
    surge_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.0 CHECK (surge_multiplier >= 1.0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. TARIFF RULES TABLE
CREATE TABLE IF NOT EXISTS public.tariff_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID REFERENCES public.service_zones(id) ON DELETE CASCADE,
    service_type_code TEXT NOT NULL,
    base_fare NUMERIC(10,2) NOT NULL,
    rate_per_km NUMERIC(10,2) NOT NULL,
    minimum_fare NUMERIC(10,2) NOT NULL,
    surge_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    driver_id UUID REFERENCES public.driver_profiles(id) ON DELETE SET NULL,
    driver_name TEXT,
    service TEXT NOT NULL DEFAULT 'ride_motor',
    status order_status_type NOT NULL DEFAULT 'pending',
    origin_address TEXT NOT NULL,
    destination_address TEXT NOT NULL,
    origin_lat DOUBLE PRECISION,
    origin_lng DOUBLE PRECISION,
    destination_lat DOUBLE PRECISION,
    destination_lng DOUBLE PRECISION,
    distance_km NUMERIC(6,2) NOT NULL DEFAULT 1.0 CHECK (distance_km >= 0),
    fare_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (fare_amount >= 0),
    platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (platform_fee >= 0),
    driver_net NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (driver_net >= 0),
    payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'qris', 'ewallet')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'refunded')),
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. ORDER STATUS HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    status order_status_type NOT NULL,
    actor_id UUID,
    actor_type TEXT DEFAULT 'system',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. PAYMENT TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES public.driver_profiles(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    transaction_type TEXT NOT NULL, -- 'trip_fare', 'platform_commission', 'driver_payout', 'wallet_topup'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. ADMIN SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- SECURITY: ROW LEVEL SECURITY & FUNCTIONS
-- ==============================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tariff_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper Function: Check if user is an active admin in user_profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND is_active = true
        AND status = 'active'
        AND (
            is_admin = true OR 
            role IN ('superadmin', 'admin', 'dispatcher', 'finance', 'support')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for Admins
DROP POLICY IF EXISTS "Admins have full access to user_profiles" ON public.user_profiles;
CREATE POLICY "Admins have full access to user_profiles"
    ON public.user_profiles FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to driver_profiles" ON public.driver_profiles;
CREATE POLICY "Admins have full access to driver_profiles"
    ON public.driver_profiles FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to service_zones" ON public.service_zones;
CREATE POLICY "Admins have full access to service_zones"
    ON public.service_zones FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to orders" ON public.orders;
CREATE POLICY "Admins have full access to orders"
    ON public.orders FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to admin_settings" ON public.admin_settings;
CREATE POLICY "Admins have full access to admin_settings"
    ON public.admin_settings FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can read audit_logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit_logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit_logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit_logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_driver_profiles_status ON public.driver_profiles(status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
