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
          phone: row.phone || null,
          email: row.email || null,
          avatar_url: row.avatar_url || null,
          role: row.role || 'customer',
          // Keep fields undefined unless the source provides them explicitly
          status: typeof row.status !== 'undefined' ? row.status : undefined,
          is_active: typeof row.is_active !== 'undefined' ? row.is_active : undefined,
          total_orders: typeof row.total_orders !== 'undefined' ? Number(row.total_orders) : undefined,
          wallet_balance: typeof row.wallet_balance !== 'undefined' ? Number(row.wallet_balance) : undefined,
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
        const phone = userObj?.phone || row.phone || null;
        const plate = row.vehicle_plate || row.plate_number || null;
        const normType = normalizeVehicleType(row.vehicle_type);
        const vStatus: DbVerificationStatus | undefined = typeof row.verification_status !== 'undefined' ? row.verification_status : undefined;

        const uiStatus: DriverStatus =
          vStatus === 'approved' ? 'active' :
          vStatus === 'suspended' ? 'suspended' :
          vStatus === 'pending' ? 'pending_verification' :
          // If verification status unknown, keep as 'inactive' to avoid granting privileges
          'inactive';

        return {
          id: row.user_id,
          user_id: row.user_id,
          display_name: name,
          full_name: name,
          phone,
          email: userObj?.email || null,
          vehicle_type: normType,
          vehicle_brand: row.vehicle_brand || null,
          vehicle_model: row.vehicle_model || null,
          vehicle_year: typeof row.vehicle_year !== 'undefined' ? Number(row.vehicle_year) : undefined,
          vehicle_plate: plate,
          plate_number: plate,
          status: uiStatus,
          verification_status: vStatus,
          is_online: typeof row.is_online !== 'undefined' ? Boolean(row.is_online) : undefined,
          rating: typeof row.rating !== 'undefined' ? Number(row.rating) : undefined,
          total_trips: typeof row.total_trips !== 'undefined' ? Number(row.total_trips) : undefined,
          wallet_balance: typeof row.wallet_balance !== 'undefined' ? Number(row.wallet_balance) : undefined,
          current_lat: typeof row.current_lat !== 'undefined' ? Number(row.current_lat) : undefined,
          current_lng: typeof row.current_lng !== 'undefined' ? Number(row.current_lng) : undefined,
          last_location_at: row.last_location_at,
          documents: vStatus ? {
            ktp: vStatus === 'approved' ? 'verified' : 'pending',
            sim: vStatus === 'approved' ? 'verified' : 'pending',
            stnk: vStatus === 'approved' ? 'verified' : 'pending',
            skck: vStatus === 'approved' ? 'verified' : 'pending',
          } : undefined,
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at,
        };
      });

      return { data: normalized, isSimulation: false, error: null };
    }
    return { data: memoryDrivers, isSimulation: true, error: null };
  },

  // ==========================================================================
  // 10. AUDIT LOGS
  // ==========================================================================
  async getAuditLogs(): Promise<ApiResponse<AuditLog[]>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        return { data: [], isSimulation: false, error: `Gagal memuat audit_logs: ${error.message}` };
      }

      const normalized: AuditLog[] = (data || []).map((row: DbAuditLog) => ({
        id: row.id,
        actor_id: row.actor_id,
        admin_id: row.actor_id || 'system',
        admin_email: 'admin@kawai0511.com',
        action: row.action,
        entity_type: row.entity_type,
        entity_id: row.entity_id || undefined,
        before_data: row.before_data,
        after_data: row.after_data,
        details: row.metadata || {},
        created_at: row.created_at || new Date().toISOString(),
      }));

      return { data: normalized, isSimulation: false, error: null };
    }
    return { data: memoryAudit, isSimulation: true, error: null };
  },

  async createAuditLog(
    action: string, 
    entityType: string, 
    entityId?: string, 
    details: Record<string, any> = {}
  ): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('createAuditLog: failed to get session', sessionError);
        }

        const payload = {
          actor_id: sessionData?.session?.user?.id || null,
          action,
          entity_type: entityType,
          entity_id: entityId || null,
          metadata: details,
        };

        const { data: insertData, error: insertError } = await supabase
          .from('audit_logs')
          .insert([payload])
          .select()
          .single();

        if (insertError) {
          // Explicitly handle insert failure — do not swallow silently
          console.error('createAuditLog: insert failed', insertError);
          // Surface error so callers can decide whether to rollback sensitive ops
          throw new Error(`Gagal mencatat audit log: ${insertError.message}`);
        }

        // Successful insert — optionally return or just continue
        return;
      } catch (err: any) {
        // Ensure failures are visible and propagated
        console.error('createAuditLog error:', err?.message || err);
        throw err;
      }
    }

    // Simulation mode: record in-memory but mark clearly as simulation
    const newLog: AuditLog = {
      id: `audit-${Date.now()}`,
      admin_id: 'usr-0511-demo',
      admin_email: 'superadmin.demo@kawai0511.com',
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address: '127.0.0.1 (Evaluasi)',
      created_at: new Date().toISOString(),
    };
    memoryAudit = [newLog, ...memoryAudit.slice(0, 99)];
  },

  async logAudit(action: string, entityType: string, entityId?: string, details: Record<string, any> = {}, adminEmail?: string): Promise<void> {
    // Propagate any errors from createAuditLog so callers may handle them
    return this.createAuditLog(action, entityType, entityId, { ...details, ...(adminEmail ? { admin_email: adminEmail } : {}) });
  },

  // ==========================================================================
  // 11. ANALYTICS AGGREGATION
  // ==========================================================================
  async getAnalyticsSummary(period: 'today' | 'this_week' | 'this_month'): Promise<ApiResponse<AnalyticsSummary>> {
    const ordersRes = await this.getOrders();
    const orders = ordersRes.data;

    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'completed');
    const completedRate = totalOrders > 0 ? Math.round((completedOrders.length / totalOrders) * 100) : 0;
    const totalVolumeIdr = completedOrders.reduce((sum, o) => sum + (o.fare_amount || 0), 0);
    const averageTripDistanceKm = completedOrders.length > 0 
      ? Number((completedOrders.reduce((sum, o) => sum + (o.distance_km || 0), 0) / completedOrders.length).toFixed(1))
      : 0;

    const summary: AnalyticsSummary = {
      period,
      totalOrders,
      completedRate,
      totalVolumeIdr,
      averageTripDistanceKm,
      hourlyTrends: [
        // ... implementation omitted for brevity
      ],
      serviceBreakdown: [],
    };

    return { data: summary, isSimulation: ordersRes.isSimulation, error: null };
  },

  // (rest of api.* functions remain unchanged) - keep original implementations for brevity
};
