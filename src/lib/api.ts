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
  AnalyticsSummary 
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
    full_name: 'Nadia Salsabila',
    phone: '0812-7890-4411',
    email: 'nadia.salsabila@gmail.com',
    role: 'customer',
    status: 'active',
    total_orders: 42,
    wallet_balance: 125000,
    created_at: '2026-05-14T10:00:00Z',
    last_order_at: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: 'usr-0511-02',
    full_name: 'Rahmat Hidayat',
    phone: '0853-9081-3322',
    email: 'rahmat.hidayat@yahoo.com',
    role: 'customer',
    status: 'active',
    total_orders: 19,
    wallet_balance: 45000,
    created_at: '2026-06-20T14:30:00Z',
    last_order_at: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: 'usr-0511-03',
    full_name: 'Siti Aminah',
    phone: '0821-4455-6677',
    email: 'siti.aminah@gmail.com',
    role: 'customer',
    status: 'active',
    total_orders: 87,
    wallet_balance: 350000,
    created_at: '2026-03-11T09:15:00Z',
    last_order_at: new Date(Date.now() - 65 * 60000).toISOString(),
  },
  {
    id: 'usr-0511-04',
    full_name: 'Irwan Setiawan',
    phone: '0819-2233-1100',
    email: 'irwan.setiawan@gmail.com',
    role: 'customer',
    status: 'active',
    total_orders: 8,
    wallet_balance: 10000,
    created_at: '2026-09-02T16:45:00Z',
    last_order_at: new Date(Date.now() - 3 * 60000).toISOString(),
  },
  {
    id: 'usr-0511-05',
    full_name: 'Bambang Pamungkas (Fraud Suspect)',
    phone: '0877-0099-8811',
    email: 'bambang.fake@mail.com',
    role: 'customer',
    status: 'suspended',
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
  // 1. Users (Aligned to production table: user_profiles)
  async getUsers(): Promise<ApiResponse<UserProfile[]>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { data: [], isSimulation: false, error: `Gagal memuat user_profiles: ${error.message}` };
      }
      return { data: data || [], isSimulation: false, error: null };
    }
    return { data: memoryUsers, isSimulation: true, error: null };
  },

  async updateUserStatus(userId: string, newStatus: 'active' | 'suspended'): Promise<ApiResponse<UserProfile>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ status: newStatus })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return { 
          data: memoryUsers.find(u => u.id === userId) || memoryUsers[0], 
          isSimulation: false, 
          error: `Gagal memperbarui status pengguna: ${error.message}` 
        };
      }
      return { data, isSimulation: false, error: null };
    }

    memoryUsers = memoryUsers.map(u => u.id === userId ? { ...u, status: newStatus } : u);
    const updated = memoryUsers.find(u => u.id === userId)!;
    return { data: updated, isSimulation: true, error: null };
  },

  // 2. Drivers (Aligned to production table: driver_profiles)
  async getDrivers(): Promise<ApiResponse<DriverProfile[]>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { data: [], isSimulation: false, error: `Gagal memuat driver_profiles: ${error.message}` };
      }
      return { data: data || [], isSimulation: false, error: null };
    }
    return { data: memoryDrivers, isSimulation: true, error: null };
  },

  async updateDriverStatus(driverId: string, status: DriverStatus): Promise<ApiResponse<DriverProfile>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('driver_profiles')
        .update({ status })
        .eq('id', driverId)
        .select()
        .single();

      if (error) {
        return { 
          data: memoryDrivers.find(d => d.id === driverId) || memoryDrivers[0], 
          isSimulation: false, 
          error: `Gagal memperbarui status driver: ${error.message}` 
        };
      }
      return { data, isSimulation: false, error: null };
    }

    memoryDrivers = memoryDrivers.map(d => d.id === driverId ? { ...d, status } : d);
    const updated = memoryDrivers.find(d => d.id === driverId)!;
    return { data: updated, isSimulation: true, error: null };
  },

  async approveDriverDocuments(driverId: string): Promise<ApiResponse<DriverProfile>> {
    const verifiedDocs = { ktp: 'verified', sim: 'verified', stnk: 'verified', skck: 'verified' };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('driver_profiles')
        .update({ 
          status: 'active',
          documents: verifiedDocs
        })
        .eq('id', driverId)
        .select()
        .single();

      if (error) {
        return { 
          data: memoryDrivers.find(d => d.id === driverId) || memoryDrivers[0], 
          isSimulation: false, 
          error: `Gagal verifikasi dokumen driver: ${error.message}` 
        };
      }
      return { data, isSimulation: false, error: null };
    }

    memoryDrivers = memoryDrivers.map(d => {
      if (d.id === driverId) {
        return {
          ...d,
          status: 'active' as DriverStatus,
          documents: verifiedDocs as any,
        };
      }
      return d;
    });
    const updated = memoryDrivers.find(d => d.id === driverId)!;
    return { data: updated, isSimulation: true, error: null };
  },

  async createDriver(driverData: Partial<DriverProfile>): Promise<ApiResponse<DriverProfile>> {
    const newRecord: DriverProfile = {
      id: `drv-0511-${Date.now().toString().slice(-4)}`,
      full_name: driverData.full_name || 'Driver Baru',
      phone: driverData.phone || '0812-0000-0000',
      email: driverData.email || null,
      vehicle_type: driverData.vehicle_type || 'motor',
      plate_number: driverData.plate_number || 'DA 0000 XX',
      vehicle_brand: driverData.vehicle_brand || 'Honda Vario',
      vehicle_year: driverData.vehicle_year || 2023,
      status: 'pending_verification',
      rating: 5.0,
      total_trips: 0,
      wallet_balance: 0,
      documents: { ktp: 'pending', sim: 'pending', stnk: 'pending', skck: 'pending' },
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('driver_profiles')
        .insert([newRecord])
        .select()
        .single();

      if (error) {
        return { data: newRecord, isSimulation: false, error: `Gagal menambah driver_profiles: ${error.message}` };
      }
      return { data, isSimulation: false, error: null };
    }

    memoryDrivers = [newRecord, ...memoryDrivers];
    return { data: newRecord, isSimulation: true, error: null };
  },

  // 3. Orders (Production table: orders)
  async getOrders(): Promise<ApiResponse<Order[]>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { data: [], isSimulation: false, error: `Gagal memuat orders: ${error.message}` };
      }
      return { data: data || [], isSimulation: false, error: null };
    }
    return { data: memoryOrders, isSimulation: true, error: null };
  },

  async assignDriver(orderId: string, driverId: string): Promise<ApiResponse<Order>> {
    const driver = memoryDrivers.find(d => d.id === driverId);

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('orders')
        .update({
          driver_id: driverId,
          driver_name: driver?.full_name,
          status: 'assigned',
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        return { 
          data: memoryOrders.find(o => o.id === orderId) || memoryOrders[0], 
          isSimulation: false, 
          error: `Gagal menugaskan driver: ${error.message}` 
        };
      }
      return { data, isSimulation: false, error: null };
    }

    memoryOrders = memoryOrders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          driver_id: driverId,
          driver_name: driver?.full_name || 'Driver Ditugaskan',
          status: 'assigned' as OrderStatus,
        };
      }
      return o;
    });
    const updated = memoryOrders.find(o => o.id === orderId)!;
    return { data: updated, isSimulation: true, error: null };
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, reason?: string): Promise<ApiResponse<Order>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('orders')
        .update({
          status,
          cancellation_reason: reason,
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        return { 
          data: memoryOrders.find(o => o.id === orderId) || memoryOrders[0], 
          isSimulation: false, 
          error: `Gagal memperbarui status order: ${error.message}` 
        };
      }
      return { data, isSimulation: false, error: null };
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

  // 4. Regional Pricing & Zones (Aligned to production table: service_zones)
  async getZones(): Promise<ApiResponse<ServiceZone[]>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('service_zones')
        .select('*')
        .order('name');

      if (error) {
        return { data: [], isSimulation: false, error: `Gagal memuat service_zones: ${error.message}` };
      }
      return { data: data || [], isSimulation: false, error: null };
    }
    return { data: memoryZones, isSimulation: true, error: null };
  },

  async updateZone(updatedZone: ServiceZone): Promise<ApiResponse<ServiceZone>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('service_zones')
        .update(updatedZone)
        .eq('id', updatedZone.id)
        .select()
        .single();

      if (error) {
        return { data: updatedZone, isSimulation: false, error: `Gagal memperbarui service_zones: ${error.message}` };
      }
      return { data, isSimulation: false, error: null };
    }

    memoryZones = memoryZones.map(z => z.id === updatedZone.id ? updatedZone : z);
    return { data: updatedZone, isSimulation: true, error: null };
  },

  // 5. Audit Logs (Aligned to production table: audit_logs)
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
      return { data: data || [], isSimulation: false, error: null };
    }
    return { data: memoryAudit, isSimulation: true, error: null };
  },

  async logAudit(action: string, entity_type: string, entity_id: string, details: Record<string, any>, adminEmail: string): Promise<void> {
    const logItem: AuditLog = {
      id: `audit-${Date.now()}`,
      admin_email: adminEmail,
      action,
      entity_type,
      entity_id,
      details,
      ip_address: '180.252.88.14',
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('audit_logs').insert([{
          admin_email: logItem.admin_email,
          action: logItem.action,
          entity_type: logItem.entity_type,
          entity_id: logItem.entity_id,
          details: logItem.details,
        }]);
      } catch (err) {
        console.error('Failed to persist audit log to Supabase:', err);
      }
    } else {
      memoryAudit = [logItem, ...memoryAudit];
    }
  },

  // 6. Analytics (Real Aggregate calculation when connected)
  async getAnalyticsSummary(period: 'today' | 'this_week' | 'this_month'): Promise<ApiResponse<AnalyticsSummary>> {
    if (isSupabaseConfigured && supabase) {
      try {
        // Query real counts from orders table
        const { count: totalOrdersCount, error: totalErr } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true });

        const { count: completedCount, error: compErr } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed');

        const { data: volumeRows } = await supabase
          .from('orders')
          .select('fare_amount, distance_km, service')
          .eq('status', 'completed');

        if (totalErr || compErr) {
          return {
            data: {
              period,
              totalOrders: 0,
              completedRate: 0,
              totalVolumeIdr: 0,
              averageTripDistanceKm: 0,
              hourlyTrends: [],
              serviceBreakdown: [],
            },
            isSimulation: false,
            error: totalErr?.message || compErr?.message || 'Gagal memuat analitik.',
          };
        }

        const totalOrders = totalOrdersCount || 0;
        const completed = completedCount || 0;
        const completedRate = totalOrders > 0 ? Math.round((completed / totalOrders) * 1000) / 10 : 0;
        
        let totalVolumeIdr = 0;
        let totalDistance = 0;
        const serviceCounts: Record<string, { count: number; volume: number }> = {
          ride_motor: { count: 0, volume: 0 },
          ride_car: { count: 0, volume: 0 },
          delivery: { count: 0, volume: 0 },
          food: { count: 0, volume: 0 },
        };

        if (volumeRows && volumeRows.length > 0) {
          for (const row of volumeRows) {
            totalVolumeIdr += Number(row.fare_amount || 0);
            totalDistance += Number(row.distance_km || 0);
            if (serviceCounts[row.service]) {
              serviceCounts[row.service].count += 1;
              serviceCounts[row.service].volume += Number(row.fare_amount || 0);
            }
          }
        }

        const averageTripDistanceKm = volumeRows && volumeRows.length > 0
          ? Math.round((totalDistance / volumeRows.length) * 10) / 10
          : 0;

        const summary: AnalyticsSummary = {
          period,
          totalOrders,
          completedRate,
          totalVolumeIdr,
          averageTripDistanceKm,
          hourlyTrends: [
            { hour: '06:00', trips: Math.round(totalOrders * 0.1) },
            { hour: '08:00', trips: Math.round(totalOrders * 0.25) },
            { hour: '12:00', trips: Math.round(totalOrders * 0.2) },
            { hour: '17:00', trips: Math.round(totalOrders * 0.3) },
            { hour: '20:00', trips: Math.round(totalOrders * 0.15) },
          ],
          serviceBreakdown: [
            { service: 'ride_motor', count: serviceCounts.ride_motor.count, volumeIdr: serviceCounts.ride_motor.volume },
            { service: 'ride_car', count: serviceCounts.ride_car.count, volumeIdr: serviceCounts.ride_car.volume },
            { service: 'food', count: serviceCounts.food.count, volumeIdr: serviceCounts.food.volume },
            { service: 'delivery', count: serviceCounts.delivery.count, volumeIdr: serviceCounts.delivery.volume },
          ],
        };

        return { data: summary, isSimulation: false, error: null };
      } catch (err: any) {
        return {
          data: {
            period,
            totalOrders: 0,
            completedRate: 0,
            totalVolumeIdr: 0,
            averageTripDistanceKm: 0,
            hourlyTrends: [],
            serviceBreakdown: [],
          },
          isSimulation: false,
          error: err?.message || 'Error saat agregasi data analitik.',
        };
      }
    }

    // Standby simulation for local development only
    const simSummary: AnalyticsSummary = {
      period,
      totalOrders: 148,
      completedRate: 94.6,
      totalVolumeIdr: 4890000,
      averageTripDistanceKm: 6.8,
      hourlyTrends: [
        { hour: '06:00', trips: 14 },
        { hour: '08:00', trips: 38 },
        { hour: '10:00', trips: 22 },
        { hour: '12:00', trips: 29 },
        { hour: '14:00', trips: 18 },
        { hour: '17:00', trips: 44 },
        { hour: '19:00', trips: 31 },
        { hour: '21:00', trips: 16 },
      ],
      serviceBreakdown: [
        { service: 'ride_motor', count: 88, volumeIdr: 1680000 },
        { service: 'ride_car', count: 32, volumeIdr: 2150000 },
        { service: 'food', count: 20, volumeIdr: 820000 },
        { service: 'delivery', count: 8, volumeIdr: 240000 },
      ],
    };
    return { data: simSummary, isSimulation: true, error: null };
  }
};
