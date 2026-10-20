-- MIGRATION 20261020000002_add_tariff_snapshot.sql
-- Add tariff_version and calculation_details to orders

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'tariff_version'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN tariff_version TEXT;
        ALTER TABLE public.orders ADD COLUMN calculation_details JSONB;
    END IF;
END $$;
