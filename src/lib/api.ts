import { 
  supabase, 
  isSupabaseConfigured,
  INITIAL_MOCK_DRIVERS,
  INITIAL_MOCK_ORDERS,
  INITIAL_MOCK_ZONES,
  INITIAL_MOCK_AUDIT
} from './supabase';
import { 
  UserProfile, 
  DriverProfile, 
  DriverStatus, 
  Order, 
  OrderStatus, 
  ServiceZone, 
  AuditLog, 
  AnalyticsSummary,
  DbUserProfile,
  DbDriverProfile,
  DbOrder,
  DbOrderStatus,
  DbVerificationStatus,
  DbServiceType,
  DbServiceZone,
  DbTariffRule,
  DbPaymentTransaction,
  DbSupportTicket,
  DbAdminSetting,
  DbAuditLog,
  ServiceType,
  normalizeVehicleType
} from '../types/database';

export interface ApiResponse<T> {
  data: T;
  isSimulation: boolean;
  error: string | null;
}

// Initial Mock Users (Pelanggan KAWAI 0511 - Standby / Dev only)
export const INITIAL_MOCK_USERS: UserProfile[] = [ /* unchanged ... kept in original file for brevity */ ];

// In-memory simulation state used ONLY when isSupabaseConfigured === false
let memoryUsers: UserProfile[] = [...INITIAL_MOCK_USERS];
let memoryDrivers: DriverProfile[] = [...INITIAL_MOCK_DRIVERS];
let memoryOrders: Order[] = [...INITIAL_MOCK_ORDERS];
let memoryZones: ServiceZone[] = [...INITIAL_MOCK_ZONES];
let memoryAudit: AuditLog[] = [...INITIAL_MOCK_AUDIT];

export const api = {
  // ==========================================================================
  // 1. USERS (Target: public.user_full_profiles view)
  // ==========================================================================
  async getUsers(): Promise<ApiResponse<UserProfile[]>> {
    if (isSupabaseConfigured && supabase) {
      // Use the read-only view that includes email (user_full_profiles)
      const { data, error } = await supabase
        .from('user_full_profiles')
        .select('id, display_name, phone, email, role, created_at, updated_at, status, is_active')
        .order('created_at', { ascending: false });

      if (error) {
        return { data: [], isSimulation: false, error: `Gagal memuat user_profiles: ${error.message}` };
      }

      const normalized: UserProfile[] = (data || []).map((row: any) => {
        const name = row.display_name || 'Pengguna KAWAI';
        return {
          id: row.id,
          display_name: name,
          full_name: name,
          phone: row.phone || '-',
          email: row.email || null,
          avatar_url: null,
          role: row.role || 'customer',
          status: row.status || 'active',
          is_active: row.is_active !== undefined ? row.is_active : true,
          total_orders: 0,
          wallet_balance: 0,
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at,
        };
      });

      return { data: normalized, isSimulation: false, error: null };
    }
    return { data: memoryUsers, isSimulation: true, error: null };
  },

  // ==========================================================================
  // 2. DRIVERS (two-step fetch to avoid fragile nested PostgREST joins)
  // ==========================================================================
  async getDrivers(): Promise<ApiResponse<DriverProfile[]>> {
    if (isSupabaseConfigured && supabase) {
      const { data: driversData, error: driversError } = await supabase
        .from('driver_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (driversError) {
        return { data: [], isSimulation: false, error: `Gagal memuat driver_profiles: ${driversError.message}` };
      }

      const userIds = (driversData || []).map((d: any) => d.user_id).filter(Boolean);
      let usersMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('user_full_profiles')
          .select('id, display_name, phone, email, role')
          .in('id', userIds);

        if (usersError) {
          // Non-fatal: proceed without user metadata
          usersMap = {};
        } else {
          usersMap = (usersData || []).reduce((acc: any, u: any) => ({ ...acc, [u.id]: u }), {});
        }
      }

      const normalized: DriverProfile[] = (driversData || []).map((row: any) => {
        const userObj = usersMap[row.user_id];
        const name = userObj?.display_name || row.display_name || 'Mitra Driver';
        const phone = userObj?.phone || row.phone || '-';
        const plate = row.vehicle_plate || 'DA ----';
        const normType = normalizeVehicleType(row.vehicle_type);
        const vStatus: DbVerificationStatus = row.verification_status || 'pending';

        const uiStatus: DriverStatus =
          vStatus === 'approved' ? 'active' :
          vStatus === 'suspended' ? 'suspended' :
          'pending_verification';

        return {
          id: row.user_id,
          user_id: row.user_id,
          display_name: name,
          full_name: name,
          phone,
          email: userObj?.email || null,
          vehicle_type: normType,
          vehicle_brand: row.vehicle_brand || 'Standar',
          vehicle_model: row.vehicle_model || null,
          vehicle_year: 2023,
          vehicle_plate: plate,
          plate_number: plate,
          status: uiStatus,
          verification_status: vStatus,
          is_online: Boolean(row.is_online),
          rating: 5.0,
          total_trips: 0,
          wallet_balance: 0,
          current_lat: row.current_lat,
          current_lng: row.current_lng,
          last_location_at: row.last_location_at,
          documents: {
            ktp: vStatus === 'approved' ? 'verified' : 'pending',
            sim: vStatus === 'approved' ? 'verified' : 'pending',
            stnk: vStatus === 'approved' ? 'verified' : 'pending',
            skck: vStatus === 'approved' ? 'verified' : 'pending',
          },
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at,
        };
      });

      return { data: normalized, isSimulation: false, error: null };
    }
    return { data: memoryDrivers, isSimulation: true, error: null };
  },

  // (rest of api.* functions remain unchanged) - keep original implementations for brevity
};
