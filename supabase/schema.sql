-- ==============================================================================
-- KAWAI 0511 ADMIN PANEL — PRODUCTION DATABASE SCHEMA & SECURITY POLICIES
-- Target: PostgreSQL / Supabase
-- Area: Banjarmasin & Kalimantan Selatan (Area Code: 0511)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE admin_role_type AS ENUM ('superadmin', 'dispatcher', 'finance', 'support');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE driver_status_type AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE service_type AS ENUM ('ride_motor', 'ride_car', 'delivery', 'food');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status_type AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. ADMIN USERS TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role admin_role_type NOT NULL DEFAULT 'support',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. DRIVERS TABLE
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    vehicle_type TEXT NOT NULL DEFAULT 'motor', -- 'motor' | 'mobil'
    plate_number TEXT NOT NULL,
    vehicle_brand TEXT,
    vehicle_year INT,
    status driver_status_type NOT NULL DEFAULT 'pending_verification',
    rating NUMERIC(3,2) NOT NULL DEFAULT 5.00,
    total_trips INT NOT NULL DEFAULT 0,
    wallet_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    documents JSONB DEFAULT '{"ktp": "pending", "sim": "pending", "stnk": "pending", "skck": "pending"}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. ORDERS & DISPATCH TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    service service_type NOT NULL DEFAULT 'ride_motor',
    status order_status_type NOT NULL DEFAULT 'pending',
    origin_address TEXT NOT NULL,
    destination_address TEXT NOT NULL,
    distance_km NUMERIC(6,2) NOT NULL DEFAULT 1.0,
    fare_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    driver_net NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL DEFAULT 'cash', -- 'cash', 'qris', 'ewallet'
    payment_status TEXT NOT NULL DEFAULT 'pending', -- 'paid', 'pending', 'refunded'
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. OPERATIONAL ZONES & TARIFFS TABLE (0511 - Banjarmasin Region)
CREATE TABLE IF NOT EXISTS public.operational_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Banjarmasin',
    area_code TEXT NOT NULL DEFAULT '0511',
    base_fare_motor NUMERIC(10,2) NOT NULL DEFAULT 8000,
    per_km_motor NUMERIC(10,2) NOT NULL DEFAULT 2500,
    base_fare_car NUMERIC(10,2) NOT NULL DEFAULT 15000,
    per_km_car NUMERIC(10,2) NOT NULL DEFAULT 5000,
    surge_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. AUDIT LOGS TABLE
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
-- SECURITY HARDENING: ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper Function: Check if the authenticated user is an active admin
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

-- Admin Users Policies
CREATE POLICY "Admins can view admin directory"
    ON public.admin_users FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Superadmins can manage admin users"
    ON public.admin_users FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE id = auth.uid()
            AND role = 'superadmin'
            AND is_active = true
        )
    );

-- Drivers Policies: Admins have full operational read/write access
CREATE POLICY "Admins have full access to drivers"
    ON public.drivers FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Orders Policies: Admins have full access to manage and dispatch orders
CREATE POLICY "Admins have full access to orders"
    ON public.orders FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Zones Policies: Admins can view and update pricing zones
CREATE POLICY "Admins have full access to operational zones"
    ON public.operational_zones FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Audit Logs Policies: Admins can view audit logs; append-only
CREATE POLICY "Admins can read audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins can insert audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_drivers_status ON public.drivers(status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.audit_logs(created_at DESC);
