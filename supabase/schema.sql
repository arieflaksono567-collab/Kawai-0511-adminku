-- ==============================================================================
-- KAWAI 0511 — PRODUCTION DATABASE SCHEMA SPECIFICATION
-- Target: Supabase PostgreSQL (Project Ref: rbfnjgrnojvzvrpyryms)
-- Area: Banjarmasin & Kalimantan Selatan (Area Code: 0511)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. TABEL UTAMA: public.user_profiles
-- Relasi ke auth.users(id). Role resmi: 'customer', 'driver', 'admin'.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'driver', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 2. TABEL UTAMA: public.driver_profiles
-- PK: user_id -> user_profiles(id).
-- verification_status: 'pending', 'approved', 'rejected', 'suspended'
-- vehicle_type: 'motorcycle', 'car', 'van', 'other'
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.driver_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    vehicle_type TEXT CHECK (vehicle_type IN ('motorcycle', 'car', 'van', 'other')),
    vehicle_brand TEXT,
    vehicle_model TEXT,
    vehicle_plate TEXT,
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'suspended')),
    is_online BOOLEAN NOT NULL DEFAULT false,
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    last_location_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 3. TABEL UTAMA: public.service_types
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE, -- 'ride_motor', 'ride_car', 'food', 'delivery'
    name TEXT NOT NULL,
    description TEXT,
    base_fare_idr INTEGER NOT NULL DEFAULT 8000,
    fare_per_km_idr INTEGER NOT NULL DEFAULT 2500,
    minimum_fare_idr INTEGER NOT NULL DEFAULT 8000,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 4. TABEL UTAMA: public.service_zones
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Banjarmasin',
    region TEXT NOT NULL DEFAULT 'Kalimantan Selatan',
    boundary JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 5. TABEL UTAMA: public.tariff_rules
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tariff_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_type_id UUID NOT NULL REFERENCES public.service_types(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    currency TEXT NOT NULL DEFAULT 'IDR',
    base_fare_idr INTEGER NOT NULL DEFAULT 8000,
    included_distance_km NUMERIC NOT NULL DEFAULT 1.0,
    fare_per_km_idr INTEGER NOT NULL DEFAULT 2500,
    included_duration_min INTEGER NOT NULL DEFAULT 0,
    fare_per_minute_idr INTEGER NOT NULL DEFAULT 0,
    minimum_fare_idr INTEGER NOT NULL DEFAULT 8000,
    booking_fee_idr INTEGER NOT NULL DEFAULT 1000,
    waiting_fee_per_minute_idr INTEGER NOT NULL DEFAULT 500,
    waiting_grace_minutes INTEGER NOT NULL DEFAULT 5,
    cancellation_fee_idr INTEGER NOT NULL DEFAULT 5000,
    peak_multiplier NUMERIC NOT NULL DEFAULT 1.0,
    peak_schedule JSONB,
    discount_rules JSONB,
    zone_overrides JSONB,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    effective_until TIMESTAMPTZ,
    created_by UUID REFERENCES public.user_profiles(id),
    published_by UUID REFERENCES public.user_profiles(id),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 6. TABEL UTAMA: public.orders
-- Status resmi: 'searching', 'assigned', 'arrived', 'in_trip', 'completed', 'cancelled'
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    driver_id UUID REFERENCES public.driver_profiles(user_id) ON DELETE SET NULL,
    service_type_id UUID NOT NULL REFERENCES public.service_types(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'searching' CHECK (status IN ('searching', 'assigned', 'arrived', 'in_trip', 'completed', 'cancelled')),
    pickup_address TEXT NOT NULL,
    pickup_lat DOUBLE PRECISION NOT NULL,
    pickup_lng DOUBLE PRECISION NOT NULL,
    dropoff_address TEXT NOT NULL,
    dropoff_lat DOUBLE PRECISION NOT NULL,
    dropoff_lng DOUBLE PRECISION NOT NULL,
    notes TEXT,
    estimated_distance_km NUMERIC NOT NULL,
    estimated_fare_idr INTEGER NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    accepted_at TIMESTAMPTZ,
    arrived_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 7. TABEL UTAMA: public.order_status_history
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES public.user_profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 8. TABEL UTAMA: public.payment_transactions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_reference TEXT,
    method TEXT NOT NULL,
    amount_idr INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    metadata JSONB,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 9. TABEL UTAMA: public.support_tickets
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    assigned_to UUID REFERENCES public.user_profiles(id),
    resolution TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- 10. TABEL UTAMA: public.admin_settings
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.user_profiles(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 11. TABEL UTAMA: public.audit_logs
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES public.user_profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    before_data JSONB,
    after_data JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 12. TABEL UTAMA: public.system_change_runs
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_change_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    repository TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    commit_sha TEXT NOT NULL,
    event_name TEXT NOT NULL,
    external_run_id TEXT,
    overall_status TEXT NOT NULL,
    install_status TEXT,
    test_status TEXT,
    typecheck_status TEXT,
    lint_status TEXT,
    build_status TEXT,
    deployment_output_status TEXT,
    connection_status TEXT,
    report JSONB,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 13. TABEL UTAMA: public.system_readiness_status
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_readiness_status (
    system_key TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    last_change_run_id UUID REFERENCES public.system_change_runs(id),
    supabase_project_ref TEXT NOT NULL,
    repository TEXT NOT NULL,
    message TEXT,
    checks JSONB,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) HELPER & POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tariff_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_change_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_readiness_status ENABLE ROW LEVEL SECURITY;

-- Helper Function to verify administrator role via user_profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin access policy on user_profiles
DROP POLICY IF EXISTS "Admins can view all user profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all user profiles"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING (public.is_admin() OR auth.uid() = id);

-- Admin access on driver_profiles
DROP POLICY IF EXISTS "Admins can view driver profiles" ON public.driver_profiles;
CREATE POLICY "Admins can view driver profiles"
    ON public.driver_profiles FOR SELECT
    TO authenticated
    USING (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update driver verification" ON public.driver_profiles;
CREATE POLICY "Admins can update driver verification"
    ON public.driver_profiles FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Admin access on orders
DROP POLICY IF EXISTS "Admins have full access to orders" ON public.orders;
CREATE POLICY "Admins have full access to orders"
    ON public.orders FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- System change runs & readiness security policies (resolving Security Advisor alert)
DROP POLICY IF EXISTS "Admins can read system change runs" ON public.system_change_runs;
CREATE POLICY "Admins can read system change runs"
    ON public.system_change_runs FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can read system readiness status" ON public.system_readiness_status;
CREATE POLICY "Admins can read system readiness status"
    ON public.system_readiness_status FOR SELECT
    TO authenticated
    USING (public.is_admin());
