import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { LoginPage } from './features/auth/LoginPage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { DriversView } from './components/DriversView';
import { OrdersView } from './components/OrdersView';
import { ZonesView } from './components/ZonesView';
import { SecurityAuditView } from './components/SecurityAuditView';
import { DeploymentStatusView } from './components/DeploymentStatusView';
import { SupabaseCloudflareModal } from './components/SupabaseCloudflareModal';
import { UsersPage } from './features/users/UsersPage';
import { OrderDetailModal } from './features/orders/OrderDetailModal';
import { AnalyticsPage } from './features/analytics/AnalyticsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { Forbidden403 } from './components/Forbidden403';
import { NotFound404 } from './components/NotFound404';

import { api } from './lib/api';
import { isSupabaseConfigured } from './lib/supabase';
import { 
  Driver, 
  DriverStatus, 
  Order, 
  OrderStatus, 
  OperationalZone, 
  AuditLog, 
  AppUser,
  AdminPageView 
} from './types/database';

function AppContent() {
  const { user, isLoading, isDemoSession, hasRole } = useAuth();
  const [currentTab, setCurrentTab] = useState<AdminPageView>('dashboard');
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

  const [users, setUsers] = useState<AppUser[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [zones, setZones] = useState<OperationalZone[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Initial data fetch with explicit error handling
  useEffect(() => {
    const loadInitialData = async () => {
      const [uRes, dRes, oRes, zRes, aRes] = await Promise.all([
        api.getUsers(),
        api.getDrivers(),
        api.getOrders(),
        api.getZones(),
        api.getAuditLogs(),
      ]);

      const foundError = uRes.error || dRes.error || oRes.error || zRes.error || aRes.error;
      if (foundError) {
        setApiError(foundError);
      }

      setUsers(uRes.data);
      setDrivers(dRes.data);
      setOrders(oRes.data);
      setZones(zRes.data);
      setAuditLogs(aRes.data);
    };

    if (user) {
      loadInitialData();
    }
  }, [user]);

  // Audit recording helper
  const recordAudit = async (action: string, entity_type: string, entity_id: string, details: Record<string, any>) => {
    const adminEmail = user?.email || 'admin@kawai0511.id';
    await api.logAudit(action, entity_type, entity_id, details, adminEmail);
    const refreshed = await api.getAuditLogs();
    setAuditLogs(refreshed.data);
  };

  // User actions
  const handleUpdateUserStatus = async (userId: string, newStatus: 'active' | 'suspended', reason: string) => {
    const res = await api.updateUserStatus(userId, newStatus);
    setUsers(prev => prev.map(u => u.id === userId ? res.data : u));
    recordAudit(`UPDATE_USER_STATUS_${newStatus.toUpperCase()}`, 'user', userId, {
      user_name: res.data.full_name,
      reason,
    });
  };

  // Driver actions
  const handleUpdateDriverStatus = async (id: string, newStatus: DriverStatus, logAction: string) => {
    const res = await api.updateDriverStatus(id, newStatus);
    setDrivers(prev => prev.map(d => d.id === id ? res.data : d));
    recordAudit(
      newStatus === 'suspended' ? 'SUSPEND_DRIVER' : 'ACTIVATE_DRIVER',
      'driver',
      id,
      { driver_name: res.data.full_name, note: logAction }
    );
  };

  const handleApproveDocuments = async (id: string) => {
    const res = await api.approveDriverDocuments(id);
    setDrivers(prev => prev.map(d => d.id === id ? res.data : d));
    recordAudit('APPROVE_DRIVER_DOCUMENTS', 'driver', id, {
      driver_name: res.data.full_name,
      status_set: 'active',
    });
  };

  const handleAddDriver = async (newDriverData: Partial<Driver>) => {
    const res = await api.createDriver(newDriverData);
    setDrivers(prev => [res.data, ...prev]);
    recordAudit('REGISTER_NEW_DRIVER', 'driver', res.data.id, {
      full_name: res.data.full_name,
      plate: res.data.plate_number,
    });
  };

  // Order actions
  const handleAssignDriver = async (orderId: string, driverId: string) => {
    const res = await api.assignDriver(orderId, driverId);
    setOrders(prev => prev.map(o => o.id === orderId ? res.data : o));
    recordAudit('MANUAL_ASSIGN_DRIVER', 'order', orderId, {
      driver_id: driverId,
      driver_name: res.data.driver_name,
    });
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus, reason?: string) => {
    const res = await api.updateOrderStatus(orderId, status, reason);
    setOrders(prev => prev.map(o => o.id === orderId ? res.data : o));
    recordAudit(`SET_ORDER_STATUS_${status.toUpperCase()}`, 'order', orderId, {
      status,
      reason: reason || 'Diperbarui via pusat komando admin',
    });
  };

  // Zone actions
  const handleUpdateZone = async (updatedZone: OperationalZone) => {
    const res = await api.updateZone(updatedZone);
    setZones(prev => prev.map(z => z.id === updatedZone.id ? res.data : z));
    recordAudit('UPDATE_OPERATIONAL_ZONE_TARIFF', 'operational_zone', updatedZone.id, {
      zone_name: updatedZone.name,
      base_fare_motor: updatedZone.base_fare_motor,
      surge: updatedZone.surge_multiplier,
    });
  };

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 text-white">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center font-black text-slate-950 text-xl animate-pulse">
          K
        </div>
        <p className="text-xs text-slate-400 font-mono tracking-wider">
          Memverifikasi Sesi Administrator KAWAI 0511...
        </p>
      </div>
    );
  }

  // Not Logged In: Show Login Page
  if (!user) {
    return <LoginPage />;
  }

  const pendingVerifications = drivers.filter(d => d.status === 'pending_verification').length;
  const activeOrdersCount = orders.filter(o => o.status === 'in_progress' || o.status === 'assigned').length;
  const activeDriversCount = drivers.filter(d => d.status === 'active').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Header */}
      <Header 
        onOpenDbModal={() => setIsDbModalOpen(true)}
        onOpenProfile={() => setCurrentTab('profile')}
        activeOrdersCount={activeOrdersCount}
        activeDriversCount={activeDriversCount}
      />

      {/* Prominent Demo Mode Notice - Ensures simulation data is never confused with production */}
      {isDemoSession && (
        <div className="bg-amber-950 border-b border-amber-500/40 text-amber-200 px-6 py-2 text-xs flex items-center justify-between z-20 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>
              <strong>PERINGATAN: MODE EVALUASI / SIMULASI AKTIF (Peran: {user.role.toUpperCase()}):</strong> Sesi ini tidak terhubung ke database produksi Supabase. Seluruh data yang tampil adalah data simulasi operasional.
            </span>
          </div>
          <span className="text-[10px] font-mono bg-amber-900/80 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
            SIMULATION ONLY
          </span>
        </div>
      )}

      {/* Explicit Database Error Banner */}
      {apiError && (
        <div className="bg-rose-950 border-b border-rose-500/40 text-rose-200 px-6 py-2 text-xs flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <span className="font-bold text-rose-400">Database Supabase Error:</span>
            <span>{apiError}</span>
          </div>
          <button 
            onClick={() => setApiError(null)} 
            className="text-rose-400 hover:text-white font-bold px-2 py-0.5 rounded bg-rose-900/40"
          >
            Tutup
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar 
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          pendingVerifications={pendingVerifications}
        />

        {/* Dynamic Workspace */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          {/* 1. Dashboard */}
          {currentTab === 'dashboard' && (
            <DashboardView 
              drivers={drivers}
              orders={orders}
              onSelectTab={setCurrentTab}
            />
          )}

          {/* 2. Users Management */}
          {currentTab === 'users' && (
            <UsersPage 
              users={users}
              isSimulation={!isSupabaseConfigured}
              onUpdateUserStatus={handleUpdateUserStatus}
            />
          )}

          {/* 3. Drivers Management */}
          {currentTab === 'drivers' && (
            <DriversView 
              drivers={drivers}
              onUpdateDriverStatus={handleUpdateDriverStatus}
              onApproveDocuments={handleApproveDocuments}
              onAddDriver={handleAddDriver}
            />
          )}

          {/* 4. Orders & Live Dispatch */}
          {currentTab === 'orders' && (
            <OrdersView 
              orders={orders}
              drivers={drivers}
              onAssignDriver={handleAssignDriver}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onSelectOrder={(order) => setSelectedOrderForDetail(order)}
            />
          )}

          {/* 5. Analytics */}
          {currentTab === 'analytics' && (
            <AnalyticsPage 
              isSimulation={!isSupabaseConfigured}
            />
          )}

          {/* 6. Operational Zones & Tariffs */}
          {currentTab === 'zones' && (
            hasRole(['superadmin', 'dispatcher', 'finance']) ? (
              <ZonesView 
                zones={zones}
                onUpdateZone={handleUpdateZone}
              />
            ) : (
              <Forbidden403 
                onBackToDashboard={() => setCurrentTab('dashboard')}
                requiredRole="superadmin, dispatcher, atau finance"
                userRole={user.role}
              />
            )
          )}

          {/* 7. Security & Audit Trail */}
          {currentTab === 'security' && (
            <SecurityAuditView 
              auditLogs={auditLogs}
            />
          )}

          {/* 8. Settings */}
          {currentTab === 'settings' && (
            <SettingsPage 
              onOpenDbModal={() => setIsDbModalOpen(true)}
              onRecordAudit={recordAudit}
            />
          )}

          {/* 9. Profile */}
          {currentTab === 'profile' && (
            <ProfilePage />
          )}

          {/* 10. Deployment & Cloudflare */}
          {currentTab === 'deployment' && (
            <DeploymentStatusView />
          )}

          {/* 11. 403 & 404 Fallbacks */}
          {currentTab === 'forbidden' && (
            <Forbidden403 
              onBackToDashboard={() => setCurrentTab('dashboard')}
              userRole={user.role}
            />
          )}

          {currentTab === 'not_found' && (
            <NotFound404 
              onBackToDashboard={() => setCurrentTab('dashboard')}
            />
          )}
        </main>
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal 
        order={selectedOrderForDetail}
        onClose={() => setSelectedOrderForDetail(null)}
        onUpdateStatus={handleUpdateOrderStatus}
      />

      {/* Supabase & Cloudflare Connection Modal */}
      <SupabaseCloudflareModal 
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
