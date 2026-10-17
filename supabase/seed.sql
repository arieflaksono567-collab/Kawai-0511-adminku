-- ==============================================================================
-- KAWAI 0511 ADMIN PANEL — SEED DATA SPECIFICATION (BANJARMASIN 0511)
-- Target Tables: public.service_zones, public.service_types
-- Note: Do NOT execute in production without verification against live data.
-- ==============================================================================

-- 1. Service Types
INSERT INTO public.service_types (code, name, description, base_fare_idr, fare_per_km_idr, minimum_fare_idr, is_active)
VALUES
    ('ride_motor', 'KAWAI Motor', 'Layanan transportasi roda 2 lincah urang Banua', 8000, 2500, 8000, true),
    ('ride_car', 'KAWAI Mobil', 'Layanan transportasi mobil ber-AC nyaman keluarga', 16000, 5000, 16000, true),
    ('delivery', 'KAWAI Kurir', 'Layanan antar barang & dokumen kilat 0511', 10000, 3000, 10000, true),
    ('food', 'KAWAI Kuliner', 'Pesan antar makanan khas Banjar dan kuliner lokal', 8000, 2500, 8000, true)
ON CONFLICT (code) DO NOTHING;

-- 2. Service Zones (Banjarmasin Raya 0511)
INSERT INTO public.service_zones (code, name, city, region, boundary, is_active)
VALUES 
    ('0511_BJ_CENTER', 'Banjarmasin Tengah & Siring Martapura', 'Banjarmasin', 'Kalimantan Selatan', '{"type": "Polygon", "coordinates": []}'::jsonb, true),
    ('0511_BJ_NORTH', 'Banjarmasin Utara (Kayu Tangi - Sungai Miai)', 'Banjarmasin', 'Kalimantan Selatan', '{"type": "Polygon", "coordinates": []}'::jsonb, true),
    ('0511_BJ_SOUTH', 'Banjarmasin Selatan (Kelayan - Basirih)', 'Banjarmasin', 'Kalimantan Selatan', '{"type": "Polygon", "coordinates": []}'::jsonb, true),
    ('0511_BJ_EAST', 'Banjarmasin Timur (Kuripan - Gatot Subroto)', 'Banjarmasin', 'Kalimantan Selatan', '{"type": "Polygon", "coordinates": []}'::jsonb, true),
    ('0511_BJ_WEST', 'Banjarmasin Barat (Pelambuan - Teluk Tiram)', 'Banjarmasin', 'Kalimantan Selatan', '{"type": "Polygon", "coordinates": []}'::jsonb, true)
ON CONFLICT (code) DO NOTHING;
