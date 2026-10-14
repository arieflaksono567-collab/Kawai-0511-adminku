-- ==============================================================================
-- KAWAI 0511 ADMIN PANEL — SEED DATA (BANJARMASIN 0511)
-- ==============================================================================

-- 1. Operational Zones
INSERT INTO public.operational_zones (name, city, area_code, base_fare_motor, per_km_motor, base_fare_car, per_km_car, surge_multiplier, is_active)
VALUES 
    ('Banjarmasin Tengah & Siring', 'Banjarmasin', '0511', 8000, 2500, 16000, 5000, 1.0, true),
    ('Banjarmasin Utara (Kayu Tangi - Sungai Miai)', 'Banjarmasin', '0511', 8000, 2500, 16000, 5000, 1.0, true),
    ('Banjarmasin Selatan (Kelayan - Basirih)', 'Banjarmasin', '0511', 8000, 2500, 16000, 5000, 1.0, true),
    ('Banjarmasin Timur (Kuripan - Gatot Subroto)', 'Banjarmasin', '0511', 8000, 2500, 16000, 5000, 1.0, true),
    ('Banjarmasin Barat (Pelambuan - Teluk Tiram)', 'Banjarmasin', '0511', 8000, 2500, 16000, 5000, 1.0, true)
ON CONFLICT DO NOTHING;

-- 2. Initial Sample Drivers (KAWAI 0511 Fleet)
INSERT INTO public.drivers (full_name, phone, email, vehicle_type, plate_number, vehicle_brand, vehicle_year, status, rating, total_trips, wallet_balance, current_lat, current_lng, documents)
VALUES
    ('Muhammad Rizky', '081255501101', 'rizky.kawai@gmail.com', 'motor', 'DA 4821 AA', 'Honda Vario 160', 2023, 'active', 4.92, 428, 245000.00, -3.3194, 114.5908, '{"ktp": "verified", "sim": "verified", "stnk": "verified", "skck": "verified"}'),
    ('Ahmad Fauzi', '081255501102', 'fauzi.kawai@gmail.com', 'motor', 'DA 3912 BZ', 'Yamaha NMAX', 2022, 'active', 4.88, 310, 185000.00, -3.3240, 114.5970, '{"ktp": "verified", "sim": "verified", "stnk": "verified", "skck": "verified"}'),
    ('Budi Santoso', '081355501103', 'budi.kawai@gmail.com', 'mobil', 'DA 1045 TC', 'Toyota Avanza', 2021, 'active', 4.95, 219, 520000.00, -3.3160, 114.5880, '{"ktp": "verified", "sim": "verified", "stnk": "verified", "skck": "verified"}'),
    ('Hendra Saputra', '085255501104', 'hendra.kawai@gmail.com', 'motor', 'DA 5122 YK', 'Honda Beat', 2024, 'pending_verification', 5.00, 0, 0.00, -3.3280, 114.5920, '{"ktp": "pending", "sim": "pending", "stnk": "verified", "skck": "pending"}'),
    ('Dedi Kurniawan', '087855501105', 'dedi.kawai@gmail.com', 'mobil', 'DA 1872 LK', 'Daihatsu Sigra', 2020, 'suspended', 4.15, 87, 45000.00, -3.3320, 114.6010, '{"ktp": "verified", "sim": "verified", "stnk": "verified", "skck": "verified"}')
ON CONFLICT (phone) DO NOTHING;
