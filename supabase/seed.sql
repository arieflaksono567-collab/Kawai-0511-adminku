-- ==============================================================================
-- KAWAI 0511 ADMIN PANEL — SEED DATA SPECIFICATION (BANJARMASIN 0511)
-- Target Tables: public.service_types, public.service_zones, public.tariff_rules
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

-- 3. Tariff Rules (default untuk database uji/staging)
-- Satu aturan aktif per layanan, angka mengikuti service_types:
--   Motor  Rp8.000 (1 km pertama) + Rp2.500/km, minimum Rp8.000
--   Mobil  Rp16.000 (1 km pertama) + Rp5.000/km, minimum Rp16.000
--   Kurir  Rp10.000 (1 km pertama) + Rp3.000/km, minimum Rp10.000
--   Kuliner Rp8.000 (1 km pertama) + Rp2.500/km, minimum Rp8.000
-- Tanpa biaya pemesanan. Hanya dibuat bila layanan belum punya aturan aktif.
INSERT INTO public.tariff_rules (
    service_type_id, name, version, status, currency,
    base_fare_idr, included_distance_km, fare_per_km_idr, minimum_fare_idr, booking_fee_idr
)
SELECT
    st.id,
    'Tarif Default ' || st.name,
    1,
    'active',
    'IDR',
    st.base_fare_idr,
    1.0,
    st.fare_per_km_idr,
    st.minimum_fare_idr,
    0
FROM public.service_types st
WHERE st.code IN ('ride_motor', 'ride_car', 'delivery', 'food')
  AND NOT EXISTS (
      SELECT 1 FROM public.tariff_rules tr
      WHERE tr.service_type_id = st.id AND tr.status = 'active'
  );
