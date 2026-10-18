// ==============================================================================
// KAWAI 0511 ADMIN PANEL — DATABASE SCHEMA & VIEW TYPES
// Source of Truth: Active Supabase Project rbfnjgrnojvzvrpyryms
// ==============================================================================

// ------------------------------------------------------------------------------
// PART 1: OFFICIAL DATABASE TYPES (EXACT SUPABASE PRODUCTION TABLES)
// ------------------------------------------------------------------------------

/** 1. public.user_profiles */
export type DbUserRole = 'customer' | 'driver' | 'admin';

export interface DbUserProfile {
  id: string; // uuid, references auth.users(id)
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: DbUserRole;
  created_at: string;
  updated_at: string;
}

/** 2. public.driver_profiles */
export type DbVehicleType = 'motorcycle' | 'car' | 'van' | 'other';
export type DbVerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface DbDriverProfile {
  user_id: string; // uuid (Primary Key, references user_profiles.id)
  vehicle_type: DbVehicleType | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_plate: string | null;
  verification_status: DbVerificationStatus;
  is_online: boolean;
  current_lat: number | null;
  current_lng: number | null;
  last_location_at: string | null;
  created_at: string;
  updated_at: string;
}

/** 3. public.orders */
export type DbOrderStatus = 'searching' | 'assigned' | 'arrived' | 'in_trip' | 'completed' | 'cancelled';

export interface DbOrder {
  id: string; // uuid
  customer_id: string; // uuid -> user_profiles.id
  driver_id: string | null; // uuid -> driver_profiles.user_id
  service_type_id: string; // uuid -> service_types.id
  status: DbOrderStatus;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  notes: string | null;
  estimated_distance_km: number;
  estimated_fare_idr: number;
  requested_at: string;
  accepted_at: string | null;
  arrived_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

/** 4. public.order_status_history */
export interface DbOrderStatusHistory {
  id: string; // uuid
  order_id: string; // uuid -> orders.id
  previous_status: string | null;
  new_status: string;
  changed_by: string | null; // uuid -> user_profiles.id / auth.users
  notes: string | null;
  created_at: string;
}

/** 5. public.service_types */
export interface DbServiceType {
  id: string; // uuid
  code: string; // 'ride_motor', 'ride_car', 'food', 'delivery'
  name: string;
  description: string | null;
  base_fare_idr: number;
  fare_per_km_idr: number;
  minimum_fare_idr: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** 6. public.service_zones */
export interface DbServiceZone {
  id: string; // uuid
  code: string; // '0511_BJ_CENTER', etc. (not area_code)
  name: string;
  city: string;
  region: string;
  boundary: Record<string, any>; // jsonb
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** 7. public.tariff_rules */
export type DbTariffStatus = 'draft' | 'active' | 'archived';

export interface DbTariffRule {
  id: string; // uuid
  service_type_id: string; // uuid -> service_types.id
  name: string;
  version: number;
  status: DbTariffStatus;
  currency: string;
  base_fare_idr: number;
  included_distance_km: number;
  fare_per_km_idr: number;
  included_duration_min: number;
  fare_per_minute_idr: number;
  minimum_fare_idr: number;
  booking_fee_idr: number;
  waiting_fee_per_minute_idr: number;
  waiting_grace_minutes: number;
  cancellation_fee_idr: number;
  peak_multiplier: number;
  peak_schedule: Record<string, any> | null;
  discount_rules: Record<string, any> | null;
  zone_overrides: Record<string, any> | null;
  effective_from: string;
  effective_until: string | null;
  created_by: string | null;
  published_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** 8. public.payment_transactions */
export interface DbPaymentTransaction {
  id: string; // uuid
  order_id: string; // uuid -> orders.id
  user_id: string; // uuid -> user_profiles.id
  provider: string;
  provider_reference: string | null;
  method: string;
  amount_idr: number;
  status: string; // 'pending' | 'success' | 'failed' | 'refunded'
  metadata: Record<string, any> | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

/** 9. public.support_tickets */
export interface DbSupportTicket {
  id: string; // uuid
  customer_id: string; // uuid -> user_profiles.id
  order_id: string | null; // uuid -> orders.id
  subject: string;
  category: string;
  description: string;
  status: string; // 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: string; // 'low' | 'medium' | 'high' | 'urgent'
  assigned_to: string | null; // uuid -> user_profiles.id
  resolution: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

/** 10. public.admin_settings */
export interface DbAdminSetting {
  key: string; // text (PK)
  value: any; // jsonb
  description: string | null;
  updated_by: string | null; // uuid
  updated_at: string;
}

/** 11. public.audit_logs */
export interface DbAuditLog {
  id: string; // uuid
  actor_id: string | null; // uuid -> user_profiles.id
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_data: Record<string, any> | null;
  after_data: Record<string, any> | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

/** 12. public.system_change_runs */
export interface DbSystemChangeRun {
  id: string; // uuid
  provider: string;
  repository: string;
  branch_name: string;
  commit_sha: string;
  event_name: string;
  external_run_id: string | null;
  overall_status: string;
  install_status: string | null;
  test_status: string | null;
  typecheck_status: string | null;
  lint_status: string | null;
  build_status: string | null;
  deployment_output_status: string | null;
  connection_status: string | null;
  report: Record<string, any> | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

/** 13. public.system_readiness_status */
export interface DbSystemReadinessStatus {
  system_key: string; // text (PK)
  status: string;
  last_change_run_id: string | null;
  supabase_project_ref: string;
  repository: string;
  message: string | null;
  checks: Record<string, any> | null;
  checked_at: string;
  updated_at: string;
}

// ------------------------------------------------------------------------------
// PART 2: UI VIEW MODELS & COMPATIBILITY ADAPTERS
// ------------------------------------------------------------------------------

export type AdminRole = 'superadmin' | 'admin' | 'dispatcher' | 'finance' | 'support' | 'customer' | 'driver';
export type DriverStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';
export type DriverVehicleType = DbVehicleType | 'motor' | 'mobil';
export type ServiceType = 'ride_motor' | 'ride_car' | 'delivery' | 'food';
export type OrderStatus = 'pending' | 'searching' | 'assigned' | 'arrived' | 'in_trip' | 'in_progress' | 'completed' | 'cancelled';

/** UI Presentation Model for user_profiles */
export interface UserProfile {
  id: string;
  display_name?: string | null;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  role: AdminRole;
  is_admin?: boolean;
  is_active?: boolean;
  status?: 'active' | 'suspended';
  total_orders?: number;
  wallet_balance?: number;
  created_at: string;
  updated_at?: string;
  last_order_at?: string;
}

export interface DriverDocuments {
  ktp: 'pending' | 'verified' | 'rejected';
  sim: 'pending' | 'verified' | 'rejected';
  stnk: 'pending' | 'verified' | 'rejected';
  skck: 'pending' | 'verified' | 'rejected';
}

/** UI Presentation Model for driver_profiles joined with user_profiles */
export interface DriverProfile {
  id: string;
  user_id?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  phone: string;
  email: string | null;
  vehicle_type: DriverVehicleType;
  vehicle_brand: string | null;
  vehicle_model?: string | null;
  vehicle_year: number | null;
  vehicle_plate?: string | null;
  plate_number?: string | null;
  status: DriverStatus;
  verification_status?: DbVerificationStatus;
  rating: number;
  total_trips: number;
  wallet_balance: number;
  current_lat?: number | null;
  current_lng?: number | null;
  last_location_at?: string | null;
  is_online?: boolean;
  is_active?: boolean;
  documents: DriverDocuments;
  created_at: string;
  updated_at?: string;
}

/** UI Presentation Model for service_zones */
export interface ServiceZone {
  id: string;
  code?: string;
  name: string;
  city: string;
  region?: string;
  area_code?: string;
  boundary?: Record<string, any>;
  base_fare_motor: number;
  per_km_motor: number;
  base_fare_car: number;
  per_km_car: number;
  surge_multiplier: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/** UI Presentation Model for orders joined with relations */
export interface Order {
  id: string;
  order_number: string;
  customer_id?: string | null;
  customer_name: string;
  customer_phone: string;
  driver_id: string | null;
  driver_name?: string;
  service: ServiceType;
  service_type_id?: string;
  status: OrderStatus;
  origin_address: string;
  destination_address: string;
  distance_km: number;
  fare_amount: number;
  platform_fee: number;
  driver_net: number;
  payment_method: 'cash' | 'qris' | 'ewallet';
  payment_status: 'paid' | 'pending' | 'refunded';
  notes?: string | null;
  cancellation_reason?: string | null;
  requested_at?: string;
  accepted_at?: string | null;
  arrived_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  previous_status?: string | null;
  new_status: string;
  status?: OrderStatus;
  notes?: string | null;
  actor_id?: string | null;
  changed_by?: string | null;
  created_at: string;
}

export interface TariffRule {
  id: string;
  service_type_id: string;
  name: string;
  version?: number;
  status?: DbTariffStatus;
  currency?: string;
  base_fare_idr?: number;
  base_fare?: number;
  fare_per_km_idr?: number;
  rate_per_km?: number;
  minimum_fare_idr?: number;
  minimum_fare?: number;
  surge_multiplier?: number;
  is_active: boolean;
  effective_from?: string;
}

export interface SupportTicket {
  id: string;
  customer_id?: string;
  user_id?: string;
  order_id?: string | null;
  subject: string;
  category?: string;
  description?: string;
  message?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string | null;
  resolution?: string | null;
  created_at: string;
  updated_at?: string;
  resolved_at?: string | null;
}

export interface PaymentTransaction {
  id: string;
  order_id?: string | null;
  user_id?: string | null;
  driver_id?: string | null;
  provider?: string;
  provider_reference?: string | null;
  method?: string;
  payment_method?: string;
  amount_idr?: number;
  amount?: number;
  status: string;
  payment_status?: string;
  metadata?: Record<string, any> | null;
  paid_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AdminSetting {
  id?: string;
  key: string;
  value: any;
  description?: string | null;
  updated_by?: string | null;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string | null;
  admin_id?: string;
  admin_email?: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  before_data?: Record<string, any> | null;
  after_data?: Record<string, any> | null;
  details?: Record<string, any>;
  metadata?: Record<string, any> | null;
  ip_address?: string;
  created_at: string;
}

export interface SystemChangeRun {
  id: string;
  provider?: string;
  repository?: string;
  branch_name?: string;
  commit_sha?: string;
  run_name?: string;
  status: string;
  overall_status?: string;
  executed_by?: string;
  details?: Record<string, any>;
  report?: Record<string, any> | null;
  started_at?: string;
  completed_at?: string | null;
  created_at: string;
}

export interface SystemReadinessStatus {
  id?: string;
  system_key?: string;
  subsystem?: string;
  status?: string;
  is_ready: boolean;
  supabase_project_ref?: string;
  repository?: string;
  message?: string | null;
  checks?: Record<string, any> | null;
  last_checked_at?: string;
  checked_at?: string;
  details?: Record<string, any>;
  updated_at?: string;
}

// Backwards-Compatible Type Aliases
export type AdminUser = UserProfile;
export type Driver = DriverProfile;
export type OperationalZone = ServiceZone;
export type AppUser = UserProfile;

export interface DashboardMetrics {
  activeDriversCount: number;
  totalDriversCount: number;
  activeOrdersCount: number;
  completedOrdersToday: number;
  grossRevenueToday: number;
  platformNetRevenueToday: number;
  pendingVerifications: number;
  averageRating: number;
}

export interface AnalyticsSummary {
  period: 'today' | 'this_week' | 'this_month';
  totalOrders: number;
  completedRate: number;
  totalVolumeIdr: number;
  averageTripDistanceKm: number;
  hourlyTrends: { hour: string; trips: number }[];
  serviceBreakdown: { service: ServiceType; count: number; volumeIdr: number }[];
}

export type AdminPageView =
  | 'dashboard'
  | 'users'
  | 'drivers'
  | 'orders'
  | 'analytics'
  | 'zones'
  | 'payments'
  | 'services'
  | 'support'
  | 'security'
  | 'settings'
  | 'profile'
  | 'deployment'
  | 'forbidden'
  | 'not_found';

// ------------------------------------------------------------------------------
// RESILIENT ACCESSOR HELPERS FOR PRODUCTION SCHEMA ALIGNMENT
// ------------------------------------------------------------------------------

export function getUserDisplayName(user?: Partial<UserProfile | DbUserProfile> | null): string {
  if (!user) return 'Pengguna KAWAI';
  return user.display_name || (user as any).full_name || 'Pengguna KAWAI';
}

export function getUserStatus(user?: Partial<UserProfile> | null): 'active' | 'suspended' {
  if (!user) return 'active';
  if (user.status) return user.status;
  if (user.is_active === false) return 'suspended';
  return 'active';
}

export function getDriverName(driver?: Partial<DriverProfile> | null): string {
  if (!driver) return 'Mitra Driver';
  return driver.display_name || driver.full_name || 'Mitra Driver';
}

export function getDriverPlate(driver?: Partial<DriverProfile | DbDriverProfile> | null): string {
  if (!driver) return 'DA ----';
  return driver.vehicle_plate || (driver as any).plate_number || 'DA ----';
}

export function normalizeVehicleType(type?: string | null): DbVehicleType {
  if (!type) return 'motorcycle';
  const lower = type.toLowerCase();
  if (lower === 'motor' || lower === 'motorcycle') return 'motorcycle';
  if (lower === 'mobil' || lower === 'car') return 'car';
  if (lower === 'van') return 'van';
  return 'other';
}

export function getVehicleTypeLabel(type?: string | null): string {
  const norm = normalizeVehicleType(type);
  switch (norm) {
    case 'motorcycle': return 'Motor (Roda 2)';
    case 'car': return 'Mobil (Roda 4)';
    case 'van': return 'Minivan / Angkutan';
    case 'other': return 'Lainnya';
  }
}
