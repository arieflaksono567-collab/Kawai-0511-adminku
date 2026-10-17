// Disesuaikan dengan skema Supabase hasil audit (11 tabel)
// Hapus kolom/field yang tidak ada di skema produksi; gunakan optional untuk nullable.
export type Role = 'superadmin' | 'admin' | 'dispatcher' | 'finance' | 'support' | 'customer' | string;
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | string;
export type ServiceTypeCode = string;
export type OrderStatus =
  | 'SEARCHING'
  | 'ASSIGNED'
  | 'ARRIVED'
  | 'IN_TRIP'
  | 'COMPLETED'
  | 'CANCELLED'
  | string;

// 1) user_profiles (production)
export interface UserProfile {
  id: string; // references auth.users(id)
  display_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  role?: Role | null;
  created_at: string;
  updated_at?: string | null;
}

// 2) driver_profiles (production) — note: primary key is user_id in schema
export interface DriverProfile {
  user_id: string; // references auth.users(id)
  vehicle_type?: string | null;
  vehicle_brand?: string | null;
  vehicle_model?: string | null;
  vehicle_plate?: string | null;
  verification_status?: VerificationStatus | null;
  is_online?: boolean | null;
  current_lat?: number | null;
  current_lng?: number | null;
  last_location_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// 3) orders (production)
export interface Order {
  id: string;
  customer_id?: string | null;
  driver_id?: string | null;
  service_type_id?: string | null;
  status: OrderStatus;
  pickup_address?: string | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  dropoff_address?: string | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  notes?: string | null;
  estimated_distance_km?: number | null;
  estimated_fare_idr?: number | null;
  requested_at?: string | null;
  accepted_at?: string | null;
  arrived_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// 4) order_status_history
export interface OrderStatusHistory {
  id: string;
  order_id: string;
  old_status?: string | null;
  new_status?: string | null;
  changed_by?: string | null;
  created_at?: string | null;
}

// 5) service_types
export interface ServiceType {
  id: string;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  base_fare_idr?: number | null;
  fare_per_km_idr?: number | null;
  minimum_fare_idr?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// 6) service_zones
export interface ServiceZone {
  id: string;
  code?: string | null;
  name?: string | null;
  city?: string | null;
  region?: string | null;
  boundary?: any | null; // GeoJSON or text depending on schema
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// 7) tariff_rules
export interface TariffRule {
  id: string;
  service_type_id?: string | null;
  name?: string | null;
  version?: string | null;
  status?: string | null;
  currency?: string | null;
  base_fare_idr?: number | null;
  included_distance_km?: number | null;
  fare_per_km_idr?: number | null;
  included_duration_min?: number | null;
  fare_per_minute_idr?: number | null;
  minimum_fare_idr?: number | null;
  booking_fee_idr?: number | null;
  waiting_fee_per_minute_idr?: number | null;
  waiting_grace_minutes?: number | null;
  cancellation_fee_idr?: number | null;
  peak_multiplier?: number | null;
  peak_schedule?: any | null;
  discount_rules?: any | null;
  zone_overrides?: any | null;
  effective_from?: string | null;
  effective_until?: string | null;
  created_by?: string | null;
  published_by?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// 8) payment_transactions
export interface PaymentTransaction {
  id: string;
  order_id?: string | null;
  user_id?: string | null;
  provider?: string | null;
  provider_reference?: string | null;
  method?: string | null;
  amount_idr?: number | null;
  status?: string | null;
  metadata?: any | null;
  paid_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// 9) support_tickets
export interface SupportTicket {
  id: string;
  customer_id?: string | null;
  order_id?: string | null;
  subject?: string | null;
  category?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  assigned_to?: string | null;
  resolution?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  resolved_at?: string | null;
}

// 10) admin_settings
export interface AdminSetting {
  key: string;
  value?: string | null; // keep as string (JSON encoded) to avoid exposing structure
  description?: string | null;
  updated_by?: string | null;
  updated_at?: string | null;
}

// 11) audit_logs
export interface AuditLog {
  id: string;
  actor_id?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  before_data?: any | null;
  after_data?: any | null;
  metadata?: any | null;
  created_at?: string | null;
}
