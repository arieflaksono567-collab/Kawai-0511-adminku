import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Driver, Order, OperationalZone, AuditLog, DashboardMetrics } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validates whether the environment variables are genuinely configured
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') && 
  !supabaseUrl.includes('your-project') &&
  supabaseAnonKey.length > 20
);

// Demo Mode is ONLY permitted in development or when explicitly enabled via VITE_ENABLE_DEMO=true.
// In production builds, Demo Mode is STRICTLY DISABLED by default to prevent any bypass.
export const isDemoModeAllowed = Boolean(
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO === 'true'
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface ConnectionStatus {
  configured: boolean;
  url: string;
  connected: boolean;
  latencyMs?: number;
  message: string;
  error?: string;
}

export async function checkSupabaseHealth(): Promise<ConnectionStatus> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      configured: false,
      url: supabaseUrl || 'Tidak disetel (Not set)',
      connected: false,
      message: 'Supabase URL atau Anon Key belum disetel di environment variables.',
    };
  }

  const start = performance.now();
  try {
    // Aligned to production table: service_zones (fallback to user_profiles)
    let { error } = await supabase.from('service_zones').select('id').limit(1);
    if (error && error.code === '42P01') {
      // Table doesn't exist yet, try user_profiles
      const retry = await supabase.from('user_profiles').select('id').limit(1);
      error = retry.error;
    }

    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      return {
        configured: true,
        url: supabaseUrl,
        connected: false,
        latencyMs,
        message: 'Koneksi ke endpoint Supabase gagal atau tabel belum dimigrasikan.',
        error: error.message,
      };
    }

    return {
      configured: true,
      url: supabaseUrl,
      connected: true,
      latencyMs,
      message: 'Koneksi Supabase PostgreSQL berhasil diverifikasi (Active & Healthy).',
    };
  } catch (err: any) {
    return {
      configured: true,
      url: supabaseUrl,
      connected: false,
      message: 'Network error saat menghubungi Supabase host.',
      error: err?.message || String(err),
    };
  }
}

// Initial Mock Seed for Testing & Audit Prior to Live DB Binding
export const INITIAL_MOCK_DRIVERS: Driver[] = [
  {
    id: 'drv-0511-01',
    full_name: 'Muhammad Rizky Pratama',
    phone: '0812-5550-1101',
    email: 'rizky.kawai@gmail.com',
    vehicle_type: 'motor',
    plate_number: 'DA 4821 AA',
    vehicle_brand: 'Honda Vario 160',
    vehicle_year: 2023,
    status: 'active',
    rating: 4.94,
    total_trips: 428,
    wallet_balance: 245000,
    current_lat: -3.3194,
    current_lng: 114.5908,
    documents: { ktp: 'verified', sim: 'verified', stnk: 'verified', skck: 'verified' },
    created_at: '2026-08-10T08:00:00Z',
  },
  {
    id: 'drv-0511-02',
    full_name: 'Ahmad Fauzi Rahman',
    phone: '0812-5550-1102',
    email: 'fauzi.kawai@gmail.com',
    vehicle_type: 'motor',
    plate_number: 'DA 3912 BZ',
    vehicle_brand: 'Yamaha NMAX 155',
    vehicle_year: 2022,
    status: 'active',
    rating: 4.88,
    total_trips: 310,
    wallet_balance: 185000,
    current_lat: -3.3240,
    current_lng: 114.5970,
    documents: { ktp: 'verified', sim: 'verified', stnk: 'verified', skck: 'verified' },
    created_at: '2026-08-15T09:30:00Z',
  },
  {
    id: 'drv-0511-03',
    full_name: 'Budi Santoso',
    phone: '0813-5550-1103',
    email: 'budi.kawai@gmail.com',
    vehicle_type: 'mobil',
    plate_number: 'DA 1045 TC',
    vehicle_brand: 'Toyota Avanza 1.5G',
    vehicle_year: 2021,
    status: 'active',
    rating: 4.96,
    total_trips: 219,
    wallet_balance: 520000,
    current_lat: -3.3160,
    current_lng: 114.5880,
    documents: { ktp: 'verified', sim: 'verified', stnk: 'verified', skck: 'verified' },
    created_at: '2026-09-01T11:20:00Z',
  },
  {
    id: 'drv-0511-04',
    full_name: 'Hendra Saputra',
    phone: '0852-5550-1104',
    email: 'hendra.kawai@gmail.com',
    vehicle_type: 'motor',
    plate_number: 'DA 5122 YK',
    vehicle_brand: 'Honda Beat ESP',
    vehicle_year: 2024,
    status: 'pending_verification',
    rating: 5.00,
    total_trips: 0,
    wallet_balance: 0,
    current_lat: -3.3280,
    current_lng: 114.5920,
    documents: { ktp: 'pending', sim: 'pending', stnk: 'verified', skck: 'pending' },
    created_at: '2026-10-12T14:10:00Z',
  },
  {
    id: 'drv-0511-05',
    full_name: 'Dedi Kurniawan',
    phone: '0878-5550-1105',
    email: 'dedi.kawai@gmail.com',
    vehicle_type: 'mobil',
    plate_number: 'DA 1872 LK',
    vehicle_brand: 'Daihatsu Sigra R',
    vehicle_year: 2020,
    status: 'suspended',
    rating: 4.15,
    total_trips: 87,
    wallet_balance: 45000,
    current_lat: -3.3320,
    current_lng: 114.6010,
    documents: { ktp: 'verified', sim: 'verified', stnk: 'verified', skck: 'verified' },
    created_at: '2026-09-18T10:05:00Z',
  },
];

export const INITIAL_MOCK_ORDERS: Order[] = [
  {
    id: 'ord-0511-101',
    order_number: 'KW-0511-9821',
    customer_name: 'Nadia Salsabila',
    customer_phone: '0812-7890-4411',
    driver_id: 'drv-0511-01',
    driver_name: 'Muhammad Rizky Pratama',
    service: 'ride_motor',
    status: 'in_progress',
    origin_address: 'Menara Pandang Siring Banjarmasin',
    destination_address: 'Duta Mall Banjarmasin, Jl. A. Yani KM 2',
    distance_km: 3.4,
    fare_amount: 16500,
    platform_fee: 3000,
    driver_net: 13500,
    payment_method: 'qris',
    payment_status: 'paid',
    created_at: new Date(Date.now() - 12 * 60000).toISOString(),
  },
  {
    id: 'ord-0511-102',
    order_number: 'KW-0511-9820',
    customer_name: 'Rahmat Hidayat',
    customer_phone: '0853-9081-3322',
    driver_id: 'drv-0511-03',
    driver_name: 'Budi Santoso',
    service: 'ride_car',
    status: 'assigned',
    origin_address: 'RSUD Ulin Banjarmasin, Jl. A. Yani KM 2.5',
    destination_address: 'Bandara Syamsudin Noor (BDJ)',
    distance_km: 24.8,
    fare_amount: 140000,
    platform_fee: 20000,
    driver_net: 120000,
    payment_method: 'cash',
    payment_status: 'pending',
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: 'ord-0511-103',
    order_number: 'KW-0511-9819',
    customer_name: 'Siti Aminah',
    customer_phone: '0821-4455-6677',
    driver_id: 'drv-0511-02',
    driver_name: 'Ahmad Fauzi Rahman',
    service: 'food',
    status: 'completed',
    origin_address: 'Soto Bang Amat, Banua Anyar',
    destination_address: 'Komplek Kayu Tangi 2 Jalur 3 No. 44',
    distance_km: 5.2,
    fare_amount: 21000,
    platform_fee: 4000,
    driver_net: 17000,
    payment_method: 'qris',
    payment_status: 'paid',
    created_at: new Date(Date.now() - 65 * 60000).toISOString(),
  },
  {
    id: 'ord-0511-104',
    order_number: 'KW-0511-9818',
    customer_name: 'Irwan Setiawan',
    customer_phone: '0819-2233-1100',
    driver_id: null,
    service: 'ride_motor',
    status: 'pending',
    origin_address: 'Pasar Terapung Lok Baintan',
    destination_address: 'Jl. Lambung Mangkurat, Kertak Baru Ilir',
    distance_km: 9.8,
    fare_amount: 32500,
    platform_fee: 5000,
    driver_net: 27500,
    payment_method: 'ewallet',
    payment_status: 'paid',
    created_at: new Date(Date.now() - 3 * 60000).toISOString(),
  },
];

export const INITIAL_MOCK_ZONES: OperationalZone[] = [
  {
    id: 'zone-0511-1',
    name: 'Banjarmasin Tengah & Siring',
    city: 'Banjarmasin',
    area_code: '0511',
    base_fare_motor: 8000,
    per_km_motor: 2500,
    base_fare_car: 16000,
    per_km_car: 5000,
    surge_multiplier: 1.0,
    is_active: true,
  },
  {
    id: 'zone-0511-2',
    name: 'Banjarmasin Utara (Kayu Tangi - Sungai Miai)',
    city: 'Banjarmasin',
    area_code: '0511',
    base_fare_motor: 8000,
    per_km_motor: 2500,
    base_fare_car: 16000,
    per_km_car: 5000,
    surge_multiplier: 1.1,
    is_active: true,
  },
  {
    id: 'zone-0511-3',
    name: 'Banjarmasin Selatan (Kelayan - Basirih)',
    city: 'Banjarmasin',
    area_code: '0511',
    base_fare_motor: 8000,
    per_km_motor: 2500,
    base_fare_car: 16000,
    per_km_car: 5000,
    surge_multiplier: 1.0,
    is_active: true,
  },
  {
    id: 'zone-0511-4',
    name: 'Banjarmasin Timur (Kuripan - Gatot Subroto)',
    city: 'Banjarmasin',
    area_code: '0511',
    base_fare_motor: 8000,
    per_km_motor: 2500,
    base_fare_car: 16000,
    per_km_car: 5000,
    surge_multiplier: 1.0,
    is_active: true,
  },
  {
    id: 'zone-0511-5',
    name: 'Banjarmasin Barat (Pelambuan - Teluk Tiram)',
    city: 'Banjarmasin',
    area_code: '0511',
    base_fare_motor: 8000,
    per_km_motor: 2500,
    base_fare_car: 16000,
    per_km_car: 5000,
    surge_multiplier: 1.0,
    is_active: true,
  },
];

export const INITIAL_MOCK_AUDIT: AuditLog[] = [
  {
    id: 'audit-01',
    admin_email: 'admin.kawai0511@gmail.com',
    action: 'VERIFIED_DRIVER_DOCUMENT',
    entity_type: 'driver',
    entity_id: 'drv-0511-01',
    details: { doc: 'STNK', plate: 'DA 4821 AA' },
    ip_address: '180.252.88.14',
    created_at: new Date(Date.now() - 40 * 60000).toISOString(),
  },
  {
    id: 'audit-02',
    admin_email: 'dispatcher.ops@kawai0511.id',
    action: 'MANUAL_DISPATCH_ASSIGN',
    entity_type: 'order',
    entity_id: 'ord-0511-102',
    details: { order_number: 'KW-0511-9820', driver: 'Budi Santoso' },
    ip_address: '180.252.88.19',
    created_at: new Date(Date.now() - 24 * 60000).toISOString(),
  },
  {
    id: 'audit-03',
    admin_email: 'admin.kawai0511@gmail.com',
    action: 'UPDATE_SURGE_PRICING',
    entity_type: 'operational_zone',
    entity_id: 'zone-0511-2',
    details: { zone: 'Banjarmasin Utara', surge: 1.1 },
    ip_address: '180.252.88.14',
    created_at: new Date(Date.now() - 110 * 60000).toISOString(),
  },
];
