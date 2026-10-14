import React, { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar, TabType } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { DriversView } from './components/DriversView';
import { OrdersView } from './components/OrdersView';
import { ZonesView } from './components/ZonesView';
import { SecurityAuditView } from './components/SecurityAuditView';
import { DeploymentStatusView } from './components/DeploymentStatusView';
import { SupabaseCloudflareModal } from './components/SupabaseCloudflareModal';
import { 
  INITIAL_MOCK_DRIVERS, 
  INITIAL_MOCK_ORDERS, 
  INITIAL_MOCK_ZONES, 
  INITIAL_MOCK_AUDIT, 
  supabase, 
  isSupabaseConfigured 
} from './lib/supabase';
import { Driver, DriverStatus, Order, OrderStatus, OperationalZone, AuditLog } from './types/database';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

  // Core application states
  const [drivers, setDrivers] = useState<Driver[]>(INITIAL_MOCK_DRIVERS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_MOCK_ORDERS);
  const [zones, setZones] = useState<OperationalZone[]>(INITIAL_MOCK_ZONES);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_MOCK_AUDIT);

  // Helper to record audit log
  const recordAudit = (action: string, entity_type: string, entity_id: string, details: Record<string, any>) => {
    const newLog: AuditLog = {
      id: `audit-${Date.now()}`,
      admin_email: 'admin.kawai0511@gmail.com',
      action,
      entity_type,
      entity_id,
      details,
      ip_address: '180.252.88.14',
      created_at: new Date().toISOString(),
    };
    setAuditLogs(prev => [newLog, ...prev]);

    // If Supabase is connected, seamlessly sync audit to database
    if (isSupabaseConfigured && supabase) {
      supabase.from('audit_logs').insert([{
        admin_email: newLog.admin_email,
        action: newLog.action,
        entity_type: newLog.entity_type,
        entity_id: newLog.entity_id,
        details: newLog.details,
      }]).then(() => {});
    }
  };

  // Driver operations
  const handleUpdateDriverStatus = (id: string, newStatus: DriverStatus, logAction: string) => {
    setDrivers(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
    const targetDriver = drivers.find(d => d.id === id);
    recordAudit(
      newStatus === 'suspended' ? 'SUSPEND_DRIVER' : 'ACTIVATE_DRIVER',
      'driver',
      id,
      { driver_name: targetDriver?.full_name, previous_status: targetDriver?.status, new_status: newStatus, note: logAction }
    );
  };

  const handleApproveDocuments = (id: string) => {
    setDrivers(prev => prev.map(d => {
      if (d.id === id) {
        return {
          ...d,
          status: 'active' as DriverStatus,
          documents: { ktp: 'verified', sim: 'verified', stnk: 'verified', skck: 'verified' },
        };
      }
      return d;
    }));
    const targetDriver = drivers.find(d => d.id === id);
    recordAudit(
      'APPROVE_DRIVER_DOCUMENTS',
      'driver',
      id,
      { driver_name: targetDriver?.full_name, status_set: 'active' }
    );
  };

  const handleAddDriver = (newDriverData: Partial<Driver>) => {
    const createdDriver: Driver = {
      id: `drv-0511-${Date.now().toString().slice(-4)}`,
      full_name: newDriverData.full_name || 'Driver Baru',
      phone: newDriverData.phone || '0812-0000-0000',
      email: null,
      vehicle_type: newDriverData.vehicle_type || 'motor',
      plate_number: newDriverData.plate_number || 'DA 0000 XX',
      vehicle_brand: newDriverData.vehicle_brand || 'Honda Vario',
      vehicle_year: newDriverData.vehicle_year || 2023,
      status: 'pending_verification',
      rating: 5.0,
      total_trips: 0,
      wallet_balance: 0,
      documents: { ktp: 'pending', sim: 'pending', stnk: 'pending', skck: 'pending' },
      created_at: new Date().toISOString(),
    };

    setDrivers(prev => [createdDriver, ...prev]);
    recordAudit('REGISTER_NEW_DRIVER', 'driver', createdDriver.id, {
      full_name: createdDriver.full_name,
      plate: createdDriver.plate_number,
      vehicle: createdDriver.vehicle_type,
    });
  };

  // Order operations
  const handleAssignDriver = (orderId: string, driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          driver_id: driverId,
          driver_name: driver.full_name,
          status: 'assigned' as OrderStatus,
        };
      }
      return o;
    }));

    recordAudit('MANUAL_ASSIGN_DRIVER', 'order', orderId, {
      driver_name: driver.full_name,
      driver_plate: driver.plate_number,
    });
  };

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus, reason?: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status,
          cancellation_reason: reason || o.cancellation_reason,
        };
      }
      return o;
    }));

    recordAudit(`SET_ORDER_STATUS_${status.toUpperCase()}`, 'order', orderId, {
      status,
      reason: reason || 'Diperbarui melalui panel operasional',
    });
  };

  // Zone operations
  const handleUpdateZone = (updatedZone: OperationalZone) => {
    setZones(prev => prev.map(z => z.id === updatedZone.id ? updatedZone : z));
    recordAudit('UPDATE_OPERATIONAL_ZONE_TARIFF', 'operational_zone', updatedZone.id, {
      zone_name: updatedZone.name,
      base_fare_motor: updatedZone.base_fare_motor,
      per_km_motor: updatedZone.per_km_motor,
      surge: updatedZone.surge_multiplier,
    });
  };

  const pendingVerifications = drivers.filter(d => d.status === 'pending_verification').length;
  const activeOrdersCount = orders.filter(o => o.status === 'in_progress' || o.status === 'assigned').length;
  const activeDriversCount = drivers.filter(d => d.status === 'active').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Bar */}
      <Header 
        onOpenDbModal={() => setIsDbModalOpen(true)}
        activeOrdersCount={activeOrdersCount}
        activeDriversCount={activeDriversCount}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar 
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          pendingVerifications={pendingVerifications}
        />

        {/* Dynamic Main Workspace */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          {currentTab === 'dashboard' && (
            <DashboardView 
              drivers={drivers}
              orders={orders}
              onSelectTab={setCurrentTab}
            />
          )}

          {currentTab === 'drivers' && (
            <DriversView 
              drivers={drivers}
              onUpdateDriverStatus={handleUpdateDriverStatus}
              onApproveDocuments={handleApproveDocuments}
              onAddDriver={handleAddDriver}
            />
          )}

          {currentTab === 'orders' && (
            <OrdersView 
              orders={orders}
              drivers={drivers}
              onAssignDriver={handleAssignDriver}
              onUpdateOrderStatus={handleUpdateOrderStatus}
            />
          )}

          {currentTab === 'zones' && (
            <ZonesView 
              zones={zones}
              onUpdateZone={handleUpdateZone}
            />
          )}

          {currentTab === 'security' && (
            <SecurityAuditView 
              auditLogs={auditLogs}
            />
          )}

          {currentTab === 'deployment' && (
            <DeploymentStatusView />
          )}
        </main>
      </div>

      {/* Connectivity Diagnostics Modal */}
      <SupabaseCloudflareModal 
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
      />
    </div>
  );
}
