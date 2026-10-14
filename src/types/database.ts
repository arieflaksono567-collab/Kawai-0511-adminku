export type AdminRole = 'superadmin' | 'dispatcher' | 'finance' | 'support';
export type DriverStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';
export type ServiceType = 'ride_motor' | 'ride_car' | 'delivery' | 'food';
export type OrderStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
}

export interface DriverDocuments {
  ktp: 'pending' | 'verified' | 'rejected';
  sim: 'pending' | 'verified' | 'rejected';
  stnk: 'pending' | 'verified' | 'rejected';
  skck: 'pending' | 'verified' | 'rejected';
}

export interface Driver {
  id: string;
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
}

export interface Order {
  id: string;
  order_number: string;
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
}

export interface OperationalZone {
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
}

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
