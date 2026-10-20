-- MIGRATION 20261020000002_add_tariff_snapshot.sql
-- Add tariff_version and calculation_details to orders
-- This migration is idempotent and non-destructive.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tariff_version TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS calculation_details JSONB;

-- Add comments for maintenance
COMMENT ON COLUMN public.orders.tariff_version IS 'Versi aturan tarif yang digunakan saat penawaran harga dibuat';
COMMENT ON COLUMN public.orders.calculation_details IS 'Rincian perhitungan tarif (JSON) untuk audit';
