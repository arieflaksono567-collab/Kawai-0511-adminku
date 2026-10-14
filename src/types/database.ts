export type AdminRole = 'superadmin' | 'admin' | 'dispatcher' | 'finance' | 'support' | 'customer';
export type DriverStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';
export type ServiceType = 'ride_motor' | 'ride_car' | 'delivery' | 'food';
export type OrderStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

// 1. user_profiles table (Production Source of Truth for Users & Admins)
export interface UserProfile {
  id: string; // references auth.users(id)
  full_name: string;
  phone?: string;
  email?: string | null;
  role: AdminRole;
  is_admin?: boolean;
  is_active?: boolean;
  status: 'active' | 'suspended';
  total_orders?: number;
  wallet_balance: number;
  created_at: string;
  updated_at?: string;
  last_order_at?: string;
}

// 2. driver_profiles table (Production Source of Truth for Drivers / Mitra)
export interface DriverProfile {
  id: string;
  user_id?: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  vehicle_type: 'motor' | 'mobil';
  plate_number: string;
  vehicle_brand: string | null;
  vehicle_year: number | null;
  status: DriverStatus;
  rating: number;
  total_trips: number;
  wallet_balance: number;
  current_lat?: number | null;
  current_lng?: number | null;
  documents: DriverDocuments;
  created_at: string;
  updated_at?: string;
}

export interface DriverDocuments {
  ktp: 'pending' | 'verified' | 'rejected';
  sim: 'pending' | 'verified' | 'rejected';
  stnk: 'pending' | 'verified' | 'rejected';
  skck: 'pending' | 'verified' | 'rejected';
}

export interface DriverDocumentItem {
  id: string;
  driver_id: string;
  document_type: 'ktp' | 'sim' | 'stnk' | 'skck' | 'vehicle_photo';
  file_path: string;
  file_name?: string;
  file_size_bytes?: number;
  mime_type?: string;
  status: 'pending' | 'verified' | 'rejected';
  rejection_reason?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

// 3. service_zones table (Production Source of Truth for Regional Pricing 0511)
export interface ServiceZone {
  id: string;
  name: string;
  city: string;
  area_code: string;
  base_fare_motor: number;
  per_km_motor: number;
  base_fare_car: number;
  per_km_car: number;
  surge_multiplier: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// 4. orders table
export interface Order {
  id: string;
  order_number: string;
  customer_id?: string | null;
  customer_name: string;
  customer_phone: string;
  driver_id: string | null;
  driver_name?: string;
  service: ServiceType;
  status: OrderStatus;
  origin_address: string;
  destination_address: string;
  distance_km: number;
  fare_amount: number;
  platform_fee: number;
  driver_net: number;
  payment_method: 'cash' | 'qris' | 'ewallet';
  payment_status: 'paid' | 'pending' | 'refunded';
  cancellation_reason?: string | null;
  created_at: string;
  updated_at?: string;
}

// 5. order_status_history table
export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: OrderStatus;
  notes?: string;
  actor_id?: string;
  created_at: string;
}

// 6. tariff_rules table
export interface TariffRule {
  id: string;
  zone_id: string;
  service_type_id: string;
  base_fare: number;
  rate_per_km: number;
  minimum_fare: number;
  surge_multiplier: number;
  is_active: boolean;
}

// 7. support_tickets table
export interface SupportTicket {
  id: string;
  user_id?: string;
  order_id?: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
}

// 8. payment_transactions table
export interface PaymentTransaction {
  id: string;
  order_id?: string;
  user_id?: string;
  driver_id?: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  transaction_type: string;
  created_at: string;
}

// 9. admin_settings table
export interface AdminSetting {
  id: string;
  key: string;
  value: any;
  description?: string;
  updated_at: string;
}

// 10. audit_logs table
export interface AuditLog {
  id: string;
  admin_id?: string;
  admin_email: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  created_at: string;
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
  | 'security'
  | 'settings'
  | 'profile'
  | 'deployment'
  | 'forbidden'
  | 'not_found';
