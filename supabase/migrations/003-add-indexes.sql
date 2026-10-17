-- 003-add-indexes.sql
-- Performance indexes for large tables
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON public.orders (driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_is_online ON public.driver_profiles (is_online);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at);
