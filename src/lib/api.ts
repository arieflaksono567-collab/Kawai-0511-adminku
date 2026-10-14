import { 
  supabase, 
  isSupabaseConfigured,
  INITIAL_MOCK_DRIVERS,
  INITIAL_MOCK_ORDERS,
  INITIAL_MOCK_ZONES,
  INITIAL_MOCK_AUDIT
} from './supabase';
import { 
  AppUser, 
  Driver, 
  DriverStatus, 
  Order, 
  OrderStatus, 
  OperationalZone, 
  AuditLog, 
  AnalyticsSummary 
} from '../types/database';

export interface ApiResponse<T> {
  data: T;
  isSimulation: boolean;
  error: string | null;
}

// Initial Mock Users (Pelanggan KAWAI 0511)
export const INITIAL_MOCK_USERS: AppUser[] = [
  {
    id: 'usr-0511-01',
    full_name: 'Nadia Salsabila',
    phone: '0812-7890-4411',
    email: 'nadia.salsabila@gmail.com',
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
    status: 'suspended',
    total_orders: 2,
    wallet_balance: 0,
    created_at: '2026-10-01T12:00:00Z',
    last_order_at: '2026-10-03T08:00:00Z',
  },
];

// In-memory simulation cache when Supabase is not yet connected
let memoryUsers: AppUser[] = [...INITIAL_MOCK_USERS];
let memoryDrivers: Driver[] = [...INITIAL_MOCK_DRIVERS];
let memoryOrders: Order[] = [...INITIAL_MOCK_ORDERS];
let memoryZones: OperationalZone[] = [...INITIAL_MOCK_ZONES];
let memoryAudit: AuditLog[] = [...INITIAL_MOCK_AUDIT];

export const api = {
  // 1. Users
  async getUsers(): Promise<ApiResponse<AppUser[]>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          return { data, isSimulation: false, error: null };
        }
      } catch (err: any) {
        // Fallback to simulation
      }
    }
    return { data: memoryUsers, isSimulation: true, error: null };
  },

  async updateUserStatus(userId: string, newStatus: 'active' | 'suspended'): Promise<ApiResponse<AppUser>> {
    memoryUsers = memoryUsers.map(u => u.id === userId ? { ...u, status: newStatus } : u);
    const updated = memoryUsers.find(u => u.id === userId)!;

    if (isSupabaseConfigured && supabase) {
      await supabase.from('users').update({ status: newStatus }).eq('id', userId);
    }
    return { data: updated, isSimulation: !isSupabaseConfigured, error: null };
  },

  // 2. Drivers
  async getDrivers(): Promise<ApiResponse<Driver[]>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('drivers').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          return { data, isSimulation: false, error: null };
        }
      } catch (err: any) {}
    }
    return { data: memoryDrivers, isSimulation: true, error: null };
  },

  async updateDriverStatus(driverId: string, status: DriverStatus): Promise<ApiResponse<Driver>> {
    memoryDrivers = memoryDrivers.map(d => d.id === driverId ? { ...d, status } : d);
    const updated = memoryDrivers.find(d => d.id === driverId)!;

    if (isSupabaseConfigured && supabase) {
      await supabase.from('drivers').update({ status }).eq('id', driverId);
    }
    return { data: updated, isSimulation: !isSupabaseConfigured, error: null };
  },

  async approveDriverDocuments(driverId: string): Promise<ApiResponse<Driver>> {
    memoryDrivers = memoryDrivers.map(d => {
      if (d.id === driverId) {
        return {
          ...d,
          status: 'active' as DriverStatus,
          documents: { ktp: 'verified', sim: 'verified', stnk: 'verified', skck: 'verified' }
        };
      }
      return d;
    });
    const updated = memoryDrivers.find(d => d.id === driverId)!;

    if (isSupabaseConfigured && supabase) {
      await supabase.from('drivers').update({ 
        status: 'active',
        documents: { ktp: 'verified', sim: 'verified', stnk: 'verified', skck: 'verified' } 
      }).eq('id', driverId);
    }
    return { data: updated, isSimulation: !isSupabaseConfigured, error: null };
  },

  async createDriver(driverData: Partial<Driver>): Promise<ApiResponse<Driver>> {
    const created: Driver = {
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
    memoryDrivers = [created, ...memoryDrivers];

    if (isSupabaseConfigured && supabase) {
      await supabase.from('drivers').insert([created]);
    }
    return { data: created, isSimulation: !isSupabaseConfigured, error: null };
  },

  // 3. Orders
  async getOrders(): Promise<ApiResponse<Order[]>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          return { data, isSimulation: false, error: null };
        }
      } catch (err: any) {}
    }
    return { data: memoryOrders, isSimulation: true, error: null };
  },

  async assignDriver(orderId: string, driverId: string): Promise<ApiResponse<Order>> {
    const driver = memoryDrivers.find(d => d.id === driverId);
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

    if (isSupabaseConfigured && supabase) {
      await supabase.from('orders').update({
        driver_id: driverId,
        status: 'assigned',
      }).eq('id', orderId);
    }
    return { data: updated, isSimulation: !isSupabaseConfigured, error: null };
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, reason?: string): Promise<ApiResponse<Order>> {
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

    if (isSupabaseConfigured && supabase) {
      await supabase.from('orders').update({
        status,
        cancellation_reason: reason,
      }).eq('id', orderId);
    }
    return { data: updated, isSimulation: !isSupabaseConfigured, error: null };
  },

  // 4. Operational Zones & Tariffs
  async getZones(): Promise<ApiResponse<OperationalZone[]>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('operational_zones').select('*');
        if (!error && data) {
          return { data, isSimulation: false, error: null };
        }
      } catch (err: any) {}
    }
    return { data: memoryZones, isSimulation: true, error: null };
  },

  async updateZone(updatedZone: OperationalZone): Promise<ApiResponse<OperationalZone>> {
    memoryZones = memoryZones.map(z => z.id === updatedZone.id ? updatedZone : z);
    if (isSupabaseConfigured && supabase) {
      await supabase.from('operational_zones').update(updatedZone).eq('id', updatedZone.id);
    }
    return { data: updatedZone, isSimulation: !isSupabaseConfigured, error: null };
  },

  // 5. Audit Logs
  async getAuditLogs(): Promise<ApiResponse<AuditLog[]>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          return { data, isSimulation: false, error: null };
        }
      } catch (err: any) {}
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
    memoryAudit = [logItem, ...memoryAudit];

    if (isSupabaseConfigured && supabase) {
      await supabase.from('audit_logs').insert([{
        admin_email: logItem.admin_email,
        action: logItem.action,
        entity_type: logItem.entity_type,
        entity_id: logItem.entity_id,
        details: logItem.details,
      }]);
    }
  },

  // 6. Analytics
  async getAnalyticsSummary(period: 'today' | 'this_week' | 'this_month'): Promise<ApiResponse<AnalyticsSummary>> {
    const summary: AnalyticsSummary = {
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
    return { data: summary, isSimulation: !isSupabaseConfigured, error: null };
  }
};
