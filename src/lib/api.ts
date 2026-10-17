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
export const INITIAL_MOCK_USERS: UserProfile[] = [
  {
    id: 'usr-0511-01',
    display_name: 'Nadia Salsabila',
    full_name: 'Nadia Salsabila',
    phone: '0812-7890-4411',
    email: 'nadia.salsabila@gmail.com',
    role: 'customer',
    status: 'active',
    is_active: true,
    total_orders: 42,
    wallet_balance: 125000,
    created_at: '2026-05-14T10:00:00Z',
    last_order_at: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: 'usr-0511-02',
    display_name: 'Rahmat Hidayat',
    full_name: 'Rahmat Hidayat',
    phone: '0853-9081-3322',
    email: 'rahmat.hidayat@yahoo.com',
    role: 'customer',
    status: 'active',
    is_active: true,
    total_orders: 19,
    wallet_balance: 45000,
    created_at: '2026-06-20T14:30:00Z',
    last_order_at: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: 'usr-0511-03',
    display_name: 'Siti Aminah',
    full_name: 'Siti Aminah',
    phone: '0821-4455-6677',
    email: 'siti.aminah@gmail.com',
    role: 'customer',
    status: 'active',
    is_active: true,
    total_orders: 87,
    wallet_balance: 350000,
    created_at: '2026-03-11T09:15:00Z',
    last_order_at: new Date(Date.now() - 65 * 60000).toISOString(),
  },
  {
    id: 'usr-0511-04',
    display_name: 'Irwan Setiawan',
    full_name: 'Irwan Setiawan',
    phone: '0819-2233-1100',
    email: 'irwan.setiawan@gmail.com',
    role: 'customer',
    status: 'active',
    is_active: true,
    total_orders: 8,
    wallet_balance: 10000,
    created_at: '2026-09-02T16:45:00Z',
    last_order_at: new Date(Date.now() - 3 * 60000).toISOString(),
  },
  {
    id: 'usr-0511-05',
    display_name: 'Bambang Pamungkas',
    full_name: 'Bambang Pamungkas',
    phone: '0877-0099-8811',
    email: 'bambang.fake@mail.com',
    role: 'customer',
    status: 'suspended',
    is_active: false,
    total_orders: 2,
    wallet_balance: 0,
    created_at: '2026-10-01T12:00:00Z',
    last_order_at: '2026-10-03T08:00:00Z',
  },
];

// In-memory simulation state used ONLY when isSupabaseConfigured === false
let memoryUsers: UserProfile[] = [...INITIAL_MOCK_USERS];
let memoryDrivers: DriverProfile[] = [...INITIAL_MOCK_DRIVERS];
let memoryOrders: Order[] = [...INITIAL_MOCK_ORDERS];
let memoryZones: ServiceZone[] = [...INITIAL_MOCK_ZONES];
let memoryAudit: AuditLog[] = [...INITIAL_MOCK_AUDIT];

export const api = {
  // ============================================================================
  // 1. USERS (Target: public.user_profiles)
  // Columns: id, display_name, phone, avatar_url, role, created_at, updated_at
  // ============================================================================
  async getUsers(): Promise<ApiResponse<UserProfile[]>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, display_name, phone, avatar_url, role, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) {
        return { data: [], isSimulation: false, error: `Gagal memuat user_profiles: ${error.message}` };
      }

      const normalized: UserProfile[] = (data || []).map((row: DbUserProfile) => {
        const name = row.display_name || 'Pengguna KAWAI';
        return {
          id: row.id,
          display_name: name,
          full_name: name,
          phone: row.phone || '-',
          email: null, // Note: email is in auth.users, not in public.user_profiles
          avatar_url: row.avatar_url,
          role: row.role || 'customer',
          status: 'active', // Note: status column is not in user_profiles schema
          is_active: true,
          total_orders: 0, // Note: computed from orders relation
          wallet_balance: 0, // Note: wallet ledger not in user_profiles
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at,
        };
      });

      return { data: normalized, isSimulation: false, error: null };
    }
    return { data: memoryUsers, isSimulation: true, error: null };
  },

  async updateUserStatus(userId: string, newStatus: 'active' | 'suspended'): Promise<ApiResponse<UserProfile>> {
    if (isSupabaseConfigured && supabase) {
      // Per Bagian 3: Tabel user_profiles tidak memiliki kolom status atau is_active.
      // Jangan memalsukan keberhasilan perubahan status yang tidak tersimpan di database.
      return { 
        data: memoryUsers.find(u => u.id === userId) || memoryUsers[0], 
        isSimulation: false, 
        error: 'BELUM DIDUKUNG DATABASE: Tabel user_profiles aktif tidak memiliki kolom status atau is_active. Diperlukan rancangan migrasi akun penangguhan (misal tabel account_suspensions) sebelum aksi ini dapat disimpan secara permanen.' 
      };
    }

    // In-memory simulation update for evaluation testing
    memoryUsers = memoryUsers.map(u => u.id === userId ? { ...u, status: newStatus, is_active: newStatus === 'active' } : u);
    const updated = memoryUsers.find(u => u.id === userId)!;
    return { data: updated, isSimulation: true, error: null };
  },

  // ============================================================================
  // 2. DRIVERS (Target: public.driver_profiles joined with public.user_profiles)
  // PK: user_id -> user_profiles.id
  // Columns: user_id, vehicle_type, vehicle_brand, vehicle_model, vehicle_plate,
  //          verification_status, is_online, current_lat, current_lng, last_location_at
  // ============================================================================
  async getDrivers(): Promise<ApiResponse<DriverProfile[]>> {
    if (isSupabaseConfigured && supabase) {
      // Join driver_profiles with user_profiles to retrieve display_name and phone
      let { data, error } = await supabase
        .from('driver_profiles')
        .select(`
          user_id,
          vehicle_type,
          vehicle_brand,
          vehicle_model,
          vehicle_plate,
          verification_status,
          is_online,
          current_lat,
          current_lng,
          last_location_at,
          created_at,
          updated_at,
          user_profiles (
            id,
            display_name,
            phone,
            avatar_url,
            role
          )
        `)
        .order('created_at', { ascending: false });

      // Resilient fallback if nested foreign-key join is not configured in client schema
      if (error && error.message.toLowerCase().includes('relation')) {
        const simpleQuery = await supabase
          .from('driver_profiles')
          .select('*')
          .order('created_at', { ascending: false });
        data = simpleQuery.data as any;
        error = simpleQuery.error;
      }

      if (error) {
        return { data: [], isSimulation: false, error: `Gagal memuat driver_profiles: ${error.message}` };
      }

      const normalized: DriverProfile[] = (data || []).map((row: any) => {
        const userObj = Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles;
        const name = userObj?.display_name || row.display_name || 'Mitra Driver';
        const phone = userObj?.phone || row.phone || '-';
        const plate = row.vehicle_plate || 'DA ----';
        const normType = normalizeVehicleType(row.vehicle_type);
        const vStatus: DbVerificationStatus = row.verification_status || 'pending';

        // Map verification_status to UI DriverStatus
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
          email: null,
          vehicle_type: normType,
          vehicle_brand: row.vehicle_brand || 'Standar',
          vehicle_model: row.vehicle_model || null,
          vehicle_year: 2023,
          vehicle_plate: plate,
          plate_number: plate,
          status: uiStatus,
          verification_status: vStatus,
          is_online: Boolean(row.is_online),
          rating: 5.0, // Note: not in driver_profiles table
          total_trips: 0, // Note: not in driver_profiles table
          wallet_balance: 0, // Note: wallet ledger not in driver_profiles table
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

  async updateDriverStatus(driverUserId: string, status: DriverStatus): Promise<ApiResponse<DriverProfile>> {
    // Map UI status to official verification_status enum
    const vStatus: DbVerificationStatus = 
      status === 'active' ? 'approved' :
      status === 'suspended' ? 'suspended' :
      status === 'pending_verification' ? 'pending' : 'rejected';

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('driver_profiles')
        .update({ 
          verification_status: vStatus,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', driverUserId)
        .select()
        .maybeSingle();

      if (error) {
        return { 
          data: memoryDrivers.find(d => d.user_id === driverUserId || d.id === driverUserId) || memoryDrivers[0], 
          isSimulation: false, 
          error: `Gagal memperbarui verification_status driver: ${error.message}` 
        };
      }

      const raw = data || {};
      const updatedDriver: DriverProfile = {
        id: raw.user_id || driverUserId,
        user_id: raw.user_id || driverUserId,
        display_name: 'Mitra Driver',
        full_name: 'Mitra Driver',
        phone: '-',
        email: null,
        vehicle_type: normalizeVehicleType(raw.vehicle_type),
        vehicle_brand: raw.vehicle_brand || null,
        vehicle_model: raw.vehicle_model || null,
        vehicle_year: 2023,
        vehicle_plate: raw.vehicle_plate || 'DA ----',
        plate_number: raw.vehicle_plate || 'DA ----',
        status,
        verification_status: vStatus,
        rating: 5.0,
        total_trips: 0,
        wallet_balance: 0,
        is_online: Boolean(raw.is_online),
        documents: { ktp: 'pending', sim: 'pending', stnk: 'pending', skck: 'pending' },
        created_at: raw.created_at || new Date().toISOString(),
        updated_at: raw.updated_at,
      };

      return { data: updatedDriver, isSimulation: false, error: null };
    }

    memoryDrivers = memoryDrivers.map(d => (d.user_id === driverUserId || d.id === driverUserId) ? { ...d, status, verification_status: vStatus } : d);
    const updated = memoryDrivers.find(d => d.user_id === driverUserId || d.id === driverUserId)!;
    return { data: updated, isSimulation: true, error: null };
  },

  async approveDriverDocuments(driverUserId: string): Promise<ApiResponse<DriverProfile>> {
    return this.updateDriverStatus(driverUserId, 'active');
  },

  async createDriver(driverData: Partial<DriverProfile>): Promise<ApiResponse<DriverProfile>> {
    const plate = driverData.vehicle_plate || driverData.plate_number || 'DA 0000 XX';
    const vType = normalizeVehicleType(driverData.vehicle_type);
    const name = driverData.display_name || driverData.full_name || 'Driver Baru';

    const newRecord: DriverProfile = {
      id: driverData.user_id || `drv-0511-${Date.now().toString().slice(-4)}`,
      user_id: driverData.user_id || `drv-0511-${Date.now().toString().slice(-4)}`,
      display_name: name,
      full_name: name,
      phone: driverData.phone || '0812-0000-0000',
      email: driverData.email || null,
      vehicle_type: vType,
      vehicle_brand: driverData.vehicle_brand || (vType === 'motorcycle' ? 'Honda Vario' : 'Toyota Avanza'),
      vehicle_model: driverData.vehicle_model || null,
      vehicle_year: 2023,
      vehicle_plate: plate,
      plate_number: plate,
      status: 'pending_verification',
      verification_status: 'pending',
      rating: 5.0,
      total_trips: 0,
      wallet_balance: 0,
      documents: { ktp: 'pending', sim: 'pending', stnk: 'pending', skck: 'pending' },
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      if (!driverData.user_id) {
        return {
          data: newRecord,
          isSimulation: false,
          error: 'Pendaftaran driver memerlukan user_id yang sah (relasi auth.users -> user_profiles). Akun pengguna harus dibuat melalui alur autentikasi resmi terlebih dahulu.'
        };
      }

      // Insert strictly with official driver_profiles columns
      const dbPayload = {
        user_id: driverData.user_id,
        vehicle_type: vType,
        vehicle_brand: newRecord.vehicle_brand,
        vehicle_model: newRecord.vehicle_model,
        vehicle_plate: plate,
        verification_status: 'pending' as DbVerificationStatus,
        is_online: false,
      };

      const { data, error } = await supabase
        .from('driver_profiles')
        .insert([dbPayload])
        .select()
        .maybeSingle();

      if (error) {
        return { data: newRecord, isSimulation: false, error: `Gagal menambah driver_profiles: ${error.message}` };
      }

      return { data: { ...newRecord, ...(data || {}) }, isSimulation: false, error: null };
    }

    memoryDrivers = [newRecord, ...memoryDrivers];
    return { data: newRecord, isSimulation: true, error: null };
  },

  // ============================================================================
  // 3. ORDERS (Target: public.orders)
  // Columns: id, customer_id, driver_id, service_type_id, status,
  //          pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng,
  //          notes, estimated_distance_km, estimated_fare_idr, requested_at,
  //          accepted_at, arrived_at, started_at, completed_at, cancelled_at
  // Relasi: customer_id -> user_profiles.id, driver_id -> driver_profiles.user_id
  // Status: searching, assigned, arrived, in_trip, completed, cancelled
  // ============================================================================
  async getOrders(): Promise<ApiResponse<Order[]>> {
    if (isSupabaseConfigured && supabase) {
      // Query orders with relations for customer and driver
      let { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:user_profiles!customer_id (
            id,
            display_name,
            phone
          ),
          service_type:service_types!service_type_id (
            id,
            code,
            name
          )
        `)
        .order('created_at', { ascending: false });

      // Resilient fallback if join syntax fails
      if (error && error.message.toLowerCase().includes('relation')) {
        const simpleQuery = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
        data = simpleQuery.data as any;
        error = simpleQuery.error;
      }

      if (error) {
        return { data: [], isSimulation: false, error: `Gagal memuat orders: ${error.message}` };
      }

      const normalized: Order[] = (data || []).map((row: any) => {
        const fare = Number(row.estimated_fare_idr) || 0;
        const distance = Number(row.estimated_distance_km) || 0;
        const customerName = row.customer?.display_name || 'Pelanggan KAWAI';
        const customerPhone = row.customer?.phone || '-';
        const serviceCode = (row.service_type?.code || 'ride_motor') as ServiceType;

        return {
          id: row.id,
          order_number: `ORD-${row.id.slice(0, 8).toUpperCase()}`,
          customer_id: row.customer_id,
          customer_name: customerName,
          customer_phone: customerPhone,
          driver_id: row.driver_id,
          driver_name: row.driver_id ? `Mitra (${row.driver_id.slice(0, 6)})` : undefined,
          service: serviceCode,
          service_type_id: row.service_type_id,
          status: row.status as OrderStatus,
          origin_address: row.pickup_address || 'Titik Jemput Banjarmasin',
          destination_address: row.dropoff_address || 'Titik Antar Banjarmasin',
          distance_km: distance,
          fare_amount: fare,
          platform_fee: Math.round(fare * 0.15),
          driver_net: Math.round(fare * 0.85),
          payment_method: 'cash',
          payment_status: row.status === 'completed' ? 'paid' : 'pending',
          notes: row.notes,
          requested_at: row.requested_at,
          accepted_at: row.accepted_at,
          arrived_at: row.arrived_at,
          started_at: row.started_at,
          completed_at: row.completed_at,
          cancelled_at: row.cancelled_at,
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at,
        };
      });

      return { data: normalized, isSimulation: false, error: null };
    }
    return { data: memoryOrders, isSimulation: true, error: null };
  },

  async assignDriver(orderId: string, driverUserId: string): Promise<ApiResponse<Order>> {
    if (isSupabaseConfigured && supabase) {
      // 1. Update orders table (do NOT send driver_name)
      const { data, error } = await supabase
        .from('orders')
        .update({
          driver_id: driverUserId,
          status: 'assigned',
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select()
        .maybeSingle();

      if (error) {
        return { 
          data: memoryOrders.find(o => o.id === orderId) || memoryOrders[0], 
          isSimulation: false, 
          error: `Gagal menugaskan driver pada tabel orders: ${error.message}` 
        };
      }

      // 2. Record status change in public.order_status_history
      try {
        await supabase
          .from('order_status_history')
          .insert([{
            order_id: orderId,
            previous_status: 'searching',
            new_status: 'assigned',
            notes: `Penugasan driver oleh administrator operasional: ${driverUserId}`,
          }]);
      } catch {
        // Non-blocking history log
      }

      const raw = data || {};
      const updatedOrder: Order = {
        ...memoryOrders[0],
        ...raw,
        id: orderId,
        driver_id: driverUserId,
        status: 'assigned',
        accepted_at: new Date().toISOString(),
      };

      return { data: updatedOrder, isSimulation: false, error: null };
    }

    memoryOrders = memoryOrders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          driver_id: driverUserId,
          status: 'assigned' as OrderStatus,
        };
      }
      return o;
    });
    const updated = memoryOrders.find(o => o.id === orderId)!;
    return { data: updated, isSimulation: true, error: null };
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, reason?: string): Promise<ApiResponse<Order>> {
    // Map status to valid DbOrderStatus
    const dbStatus: DbOrderStatus = 
      status === 'in_progress' ? 'in_trip' :
      status === 'pending' ? 'searching' :
      (status as DbOrderStatus);

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      status: dbStatus,
      updated_at: nowIso,
    };

    if (dbStatus === 'cancelled') updatePayload.cancelled_at = nowIso;
    if (dbStatus === 'completed') updatePayload.completed_at = nowIso;
    if (dbStatus === 'in_trip') updatePayload.started_at = nowIso;
    if (dbStatus === 'arrived') updatePayload.arrived_at = nowIso;

    if (isSupabaseConfigured && supabase) {
      // Update orders table (do NOT send cancellation_reason or driver_name)
      const { data, error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId)
        .select()
        .maybeSingle();

      if (error) {
        return { 
          data: memoryOrders.find(o => o.id === orderId) || memoryOrders[0], 
          isSimulation: false, 
          error: `Gagal memperbarui status order: ${error.message}` 
        };
      }

      // Record in public.order_status_history with cancellation reason in notes
      try {
        await supabase
          .from('order_status_history')
          .insert([{
            order_id: orderId,
            new_status: dbStatus,
            notes: reason ? `Catatan pembatalan/perubahan: ${reason}` : `Perubahan status order ke ${dbStatus}`,
          }]);
      } catch {
        // Non-blocking history log
      }

      const raw = data || {};
      const updatedOrder: Order = {
        ...memoryOrders[0],
        ...raw,
        id: orderId,
        status,
        cancellation_reason: reason,
      };

      return { data: updatedOrder, isSimulation: false, error: null };
    }

    memoryOrders = memoryOrders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status,
          cancellation_reason: reason || o.cancellation_reason,
        };
      }
      return o;
    });
    const updated = memoryOrders.find(o => o.id === orderId)!;
    return { data: updated, isSimulation: true, error: null };
  },

  // ============================================================================
  // 4. SERVICE ZONES (Target: public.service_zones)
  // Columns: id, code, name, city, region, boundary, is_active
  // ============================================================================
  async getZones(): Promise<ApiResponse<ServiceZone[]>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('service_zones')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        return { data: [], isSimulation: false, error: `Gagal memuat service_zones: ${error.message}` };
      }

      const normalized: ServiceZone[] = (data || []).map((row: DbServiceZone) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        city: row.city || 'Banjarmasin',
        region: row.region || 'Kalimantan Selatan',
        area_code: '0511',
        boundary: row.boundary,
        base_fare_motor: 8000,
        per_km_motor: 2500,
        base_fare_car: 16000,
        per_km_car: 5000,
        surge_multiplier: 1.0,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      return { data: normalized, isSimulation: false, error: null };
    }
    return { data: memoryZones, isSimulation: true, error: null };
  },

  async updateZone(updatedZone: ServiceZone): Promise<ApiResponse<ServiceZone>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('service_zones')
        .update({
          name: updatedZone.name,
          is_active: updatedZone.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', updatedZone.id)
        .select()
        .maybeSingle();

      if (error) {
        return { data: updatedZone, isSimulation: false, error: `Gagal memperbarui service_zones: ${error.message}` };
      }
      return { data: updatedZone, isSimulation: false, error: null };
    }

    memoryZones = memoryZones.map(z => z.id === updatedZone.id ? updatedZone : z);
    return { data: updatedZone, isSimulation: true, error: null };
  },

  // ============================================================================
  // 5. SERVICE TYPES (Target: public.service_types)
  // Columns: id, code, name, description, base_fare_idr, fare_per_km_idr, minimum_fare_idr, is_active
  // ============================================================================
  async getServiceTypes(): Promise<ApiResponse<DbServiceType[]>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        return { data: [], isSimulation: false, error: `Gagal memuat service_types: ${error.message}` };
      }
      return { data: data || [], isSimulation: false, error: null };
    }
    return { data: [], isSimulation: true, error: null };
  },

  // ============================================================================
  // 6. TARIFF RULES (Target: public.tariff_rules)
  // Columns: id, service_type_id, name, version, status, currency, base_fare_idr, ...
  // ============================================================================
  async getTariffRules(): Promise<ApiResponse<DbTariffRule[]>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('tariff_rules')
        .select('*')
        .order('version', { ascending: false });

      if (error) {
        return { data: [], isSimulation: false, error: `Gagal memuat tariff_rules: ${error.message}` };
      }
      return { data: data || [], isSimulation: false, error: null };
    }
    return { data: [], isSimulation: true, error: null };
  },

  // ============================================================================
  // 7. PAYMENT TRANSACTIONS (Target: public.payment_transactions)
  // Columns: id, order_id, user_id, provider, provider_reference, method, amount_idr, status, paid_at
  // ============================================================================
  async getPaymentTransactions(): Promise<ApiResponse<DbPaymentTransaction[]>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { data: [], isSimulation: false, error: `Gagal memuat payment_transactions: ${error.message}` };
      }
      return { data: data || [], isSimulation: false, error: null };
    }
    return { data: [], isSimulation: true, error: null };
  },

  // ============================================================================
  // 8. SUPPORT TICKETS (Target: public.support_tickets)
  // Columns: id, customer_id, order_id, subject, category, description, status, priority, assigned_to
  // ============================================================================
  async getSupportTickets(): Promise<ApiResponse<DbSupportTicket[]>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { data: [], isSimulation: false, error: `Gagal memuat support_tickets: ${error.message}` };
      }
      return { data: data || [], isSimulation: false, error: null };
    }
    return { data: [], isSimulation: true, error: null };
  },

  // ============================================================================
  // 9. ADMIN SETTINGS (Target: public.admin_settings)
  // Columns: key, value, description, updated_by, updated_at
  // ============================================================================
  async getAdminSettings(): Promise<ApiResponse<DbAdminSetting[]>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*');

      if (error) {
        return { data: [], isSimulation: false, error: `Gagal memuat admin_settings: ${error.message}` };
      }
      return { data: data || [], isSimulation: false, error: null };
    }
    return { data: [], isSimulation: true, error: null };
  },

  async updateAdminSetting(key: string, value: any, description?: string): Promise<ApiResponse<DbAdminSetting | null>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('admin_settings')
        .upsert([{
          key,
          value,
          description: description || null,
          updated_at: new Date().toISOString(),
        }])
        .select()
        .maybeSingle();

      if (error) {
        return { data: null, isSimulation: false, error: `Gagal memperbarui admin_settings: ${error.message}` };
      }
      return { data, isSimulation: false, error: null };
    }
    return { data: null, isSimulation: true, error: null };
  },

  // ============================================================================
  // 10. AUDIT LOGS (Target: public.audit_logs)
  // Columns: id, actor_id, action, entity_type, entity_id, before_data, after_data, metadata, created_at
  // ============================================================================
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
        const { data } = await supabase.auth.getSession();
        await supabase
          .from('audit_logs')
          .insert([{
            actor_id: data?.session?.user?.id || null,
            action,
            entity_type: entityType,
            entity_id: entityId || null,
            metadata: details,
          }]);
      } catch {
        // Non-blocking audit log
      }
      return;
    }

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
    return this.createAuditLog(action, entityType, entityId, { ...details, ...(adminEmail ? { admin_email: adminEmail } : {}) });
  },

  // ============================================================================
  // 11. ANALYTICS AGGREGATION
  // ============================================================================
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
        { hour: '07:00', trips: 14 },
        { hour: '09:00', trips: 28 },
        { hour: '12:00', trips: 42 },
        { hour: '15:00', trips: 35 },
        { hour: '18:00', trips: 56 },
        { hour: '21:00', trips: 22 },
      ],
      serviceBreakdown: [
        { service: 'ride_motor', count: Math.round(totalOrders * 0.65), volumeIdr: Math.round(totalVolumeIdr * 0.45) },
        { service: 'ride_car', count: Math.round(totalOrders * 0.20), volumeIdr: Math.round(totalVolumeIdr * 0.35) },
        { service: 'delivery', count: Math.round(totalOrders * 0.10), volumeIdr: Math.round(totalVolumeIdr * 0.12) },
        { service: 'food', count: Math.round(totalOrders * 0.05), volumeIdr: Math.round(totalVolumeIdr * 0.08) },
      ],
    };

    return {
      data: summary,
      isSimulation: ordersRes.isSimulation,
      error: ordersRes.error,
    };
  }
};
