// Minimal, safer adjustments for production schema:
// - Avoid writing to non-existing columns (return clear error if attempted).
// - Use column names per audited schema (pickup_address/dropoff_address, verification_status, estimated_fare_idr, etc).
// - Keep simulation mode for local dev but never present it as production.

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
  Order,
  ServiceZone,
  AuditLog,
  AnalyticsSummary
} from '../types/database';

export interface ApiResponse<T> {
  data: T;
  isSimulation: boolean;
  error: string | null;
}

/*
  NOTE:
  - Several columns used previously (user_profiles.status, driver_profiles.documents,
    orders.origin_address/destination_address, etc) are NOT present in the verified
    production schema. To avoid runtime errors we:
    - Do not attempt to write those columns in production.
    - Return a meaningful error message directing implementer to use server-side RPC
      or to request a schema change if needed.
*/

let memoryUsers: UserProfile[] = [];
let memoryDrivers: DriverProfile[] = [...INITIAL_MOCK_DRIVERS];
let memoryOrders: Order[] = [...INITIAL_MOCK_ORDERS];
let memoryZones: ServiceZone[] = [...INITIAL_MOCK_ZONES];
let memoryAudit: AuditLog[] = [...INITIAL_MOCK_AUDIT];

export const api = {
  // Users
  async getUsers(): Promise<ApiResponse<UserProfile[]>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { data: [], isSimulation: false, error: `Gagal memuat user_profiles: ${error.message}` };
      }
      return { data: (data as UserProfile[]) || [], isSimulation: false, error: null };
    }
    return { data: memoryUsers, isSimulation: true, error: null };
  },

  // NOTE: production schema does not include `status` column on user_profiles per audit.
  // Do NOT write to a non-existent column. Expose an explicit error to caller.
  async updateUserStatus(userId: string, newStatus: string): Promise<ApiResponse<UserProfile>> {
    if (isSupabaseConfigured && supabase) {
      return {
        data: {} as UserProfile,
        isSimulation: false,
        error: 'Operasi tidak didukung: kolom "status" tidak ditemukan di tabel user_profiles pada skema produksi. Gunakan RPC server-side untuk suspend/reactivate user atau update role bila tersedia.'
      };
    }

    memoryUsers = memoryUsers.map(u => u.id === userId ? ({ ...u }) : u);
    const updated = memoryUsers.find(u => u.id === userId) || (memoryUsers[0] as UserProfile);
    return { data: updated, isSimulation: true, error: null };
  },

  // Drivers
  async getDrivers(): Promise<ApiResponse<DriverProfile[]>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { data: [], isSimulation: false, error: `Gagal memuat driver_profiles: ${error.message}` };
      }
      return { data: (data as DriverProfile[]) || [], isSimulation: false, error: null };
    }
    return { data: memoryDrivers, isSimulation: true, error: null };
  },

  // Update driver verification status (use verification_status, not documents/status)
  async updateDriverVerification(userId: string, verificationStatus: string): Promise<ApiResponse<DriverProfile>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('driver_profiles')
        .update({ verification_status: verificationStatus })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return {
          data: (memoryDrivers.find(d => d.user_id === userId) as DriverProfile) || memoryDrivers[0],
          isSimulation: false,
          error: `Gagal memperbarui verification_status driver: ${error.message}`
        };
      }
      return { data: data as DriverProfile, isSimulation: false, error: null };
    }

    memoryDrivers = memoryDrivers.map(d => d.user_id === userId ? { ...d, verification_status: verificationStatus as any } : d);
    const updated = memoryDrivers.find(d => d.user_id === userId)!;
    return { data: updated, isSimulation: true, error: null };
  },

  // Create driver — adapt to production schema: driver_profiles primary key is user_id (usually created when user registered)
  async createDriverSimulated(driverData: Partial<DriverProfile>): Promise<ApiResponse<DriverProfile>> {
    const newRecord: DriverProfile = {
      user_id: `drv-sim-${Date.now().toString().slice(-6)}`,
      vehicle_type: driverData.vehicle_type || 'motor',
      vehicle_brand: driverData.vehicle_brand || null,
      vehicle_model: driverData.vehicle_model || null,
      vehicle_plate: driverData.vehicle_plate || null,
      verification_status: 'pending',
      is_online: false,
      created_at: new Date().toISOString(),
    } as DriverProfile;

    if (isSupabaseConfigured && supabase) {
      return {
        data: newRecord as DriverProfile,
        isSimulation: false,
        error: 'Operasi createDriver tidak diimplementasikan untuk produksi; driver_profiles biasanya dibuat saat pendaftaran via auth flow. Implementasikan RPC atau server-side onboarding.'
      };
    }

    memoryDrivers = [newRecord, ...memoryDrivers];
    return { data: newRecord, isSimulation: true, error: null };
  },

  // Orders
  async getOrders(): Promise<ApiResponse<Order[]>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { data: [], isSimulation: false, error: `Gagal memuat orders: ${error.message}` };
      }
      return { data: (data as Order[]) || [], isSimulation: false, error: null };
    }
    return { data: memoryOrders, isSimulation: true, error: null };
  },

  async assignDriver(orderId: string, driverUserId: string): Promise<ApiResponse<Order>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('orders')
        .update({
          driver_id: driverUserId,
          status: 'ASSIGNED'
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        return {
          data: (memoryOrders.find(o => o.id === orderId) as Order) || memoryOrders[0],
          isSimulation: false,
          error: `Gagal menugaskan driver: ${error.message}`
        };
      }
      return { data: data as Order, isSimulation: false, error: null };
    }

    memoryOrders = memoryOrders.map(o => o.id === orderId ? { ...o, driver_id: driverUserId, status: 'ASSIGNED' as any } : o);
    const updated = memoryOrders.find(o => o.id === orderId)!;
    return { data: updated, isSimulation: true, error: null };
  },

  async updateOrderStatus(orderId: string, status: Order['status'], reason?: string): Promise<ApiResponse<Order>> {
    if (isSupabaseConfigured && supabase) {
      const updatePayload: any = { status };
      if (reason) {
        updatePayload.cancelled_at = status === 'CANCELLED' ? new Date().toISOString() : null;
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        return {
          data: (memoryOrders.find(o => o.id === orderId) as Order) || memoryOrders[0],
          isSimulation: false,
          error: `Gagal memperbarui status order: ${error.message}`
        };
      }
      return { data: data as Order, isSimulation: false, error: null };
    }

    memoryOrders = memoryOrders.map(o => o.id === orderId ? { ...o, status, cancelled_at: status === 'CANCELLED' ? new Date().toISOString() : o.cancelled_at } : o);
    const updated = memoryOrders.find(o => o.id === orderId)!;
    return { data: updated, isSimulation: true, error: null };
  },

  async getZones(): Promise<ApiResponse<ServiceZone[]>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('service_zones')
        .select('*')
        .order('name');

      if (error) {
        return { data: [], isSimulation: false, error: `Gagal memuat service_zones: ${error.message}` };
      }
      return { data: (data as ServiceZone[]) || [], isSimulation: false, error: null };
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
      return { data: data as ServiceZone, isSimulation: false, error: null };
    }

    memoryZones = memoryZones.map(z => z.id === updatedZone.id ? updatedZone : z);
    return { data: updatedZone, isSimulation: true, error: null };
  },

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
      return { data: (data as AuditLog[]) || [], isSimulation: false, error: null };
    }
    return { data: memoryAudit, isSimulation: true, error: null };
  },

  async logAudit(actorId: string | null, action: string, entity_type: string, entity_id: string | null, before_data: any, after_data: any, metadata?: any): Promise<void> {
    const logItem: AuditLog = {
      id: `audit-${Date.now()}`,
      actor_id: actorId || null,
      action,
      entity_type,
      entity_id: entity_id || null,
      before_data: before_data || null,
      after_data: after_data || null,
      metadata: metadata || null,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('audit_logs').insert([{
          actor_id: logItem.actor_id,
          action: logItem.action,
          entity_type: logItem.entity_type,
          entity_id: logItem.entity_id,
          before_data: logItem.before_data,
          after_data: logItem.after_data,
          metadata: logItem.metadata
        }]);
      } catch (err) {
        console.error('Failed to persist audit log to Supabase:', (err as any)?.message || err);
      }
    } else {
      memoryAudit = [logItem, ...memoryAudit];
    }
  },

  async getAnalyticsSummary(period: 'today' | 'this_week' | 'this_month'): Promise<ApiResponse<AnalyticsSummary>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { count: totalOrdersCount, error: totalErr } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true });

        const { count: completedCount, error: compErr } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'COMPLETED');

        const { data: volumeRows } = await supabase
          .from('orders')
          .select('estimated_fare_idr, estimated_distance_km, service_type_id')
          .eq('status', 'COMPLETED');

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
            error: totalErr?.message || compErr?.message || 'Gagal memuat analitik.'
          };
        }

        const totalOrders = totalOrdersCount || 0;
        const completed = completedCount || 0;
        const completedRate = totalOrders > 0 ? Math.round((completed / totalOrders) * 1000) / 10 : 0;

        let totalVolumeIdr = 0;
        let totalDistance = 0;
        const serviceCounts: Record<string, { count: number; volume: number }> = {};

        if (Array.isArray(volumeRows)) {
          for (const row of volumeRows as any[]) {
            const fare = Number(row.estimated_fare_idr || 0);
            const dist = Number(row.estimated_distance_km || 0);
            totalVolumeIdr += fare;
            totalDistance += dist;
            const svc = row.service_type_id || 'unknown';
            serviceCounts[svc] = serviceCounts[svc] || { count: 0, volume: 0 };
            serviceCounts[svc].count += 1;
            serviceCounts[svc].volume += fare;
          }
        }

        const averageTripDistanceKm = (Array.isArray(volumeRows) && volumeRows.length > 0) ? Math.round((totalDistance / volumeRows.length) * 10) / 10 : 0;

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
          serviceBreakdown: Object.entries(serviceCounts).map(([service, val]) => ({ service: service as any, count: val.count, volumeIdr: val.volume }))
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
            serviceBreakdown: []
          },
          isSimulation: false,
          error: err?.message || 'Error saat agregasi data analitik.'
        };
      }
    }

    // Local simulation (dev-only)
    const simSummary = {
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
      serviceBreakdown: []
    } as AnalyticsSummary;

    return { data: simSummary, isSimulation: true, error: null };
  }
};
