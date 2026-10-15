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
import { PaymentsPage } from './features/payments/PaymentsPage';
import { ServicesPage } from './features/services/ServicesPage';
import { SupportPage } from './features/support/SupportPage';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4 text-slate-800">
        <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center font-black text-white text-2xl shadow-lg animate-pulse ring-4 ring-red-100">
          K
        </div>
        <p className="text-xs text-slate-500 font-medium tracking-wide">
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-red-500/20 selection:text-red-900">
      {/* Top Header */}
      <Header 
        onOpenDbModal={() => setIsDbModalOpen(true)}
        onOpenProfile={() => setCurrentTab('profile')}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onSelectTab={setCurrentTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeOrdersCount={activeOrdersCount}
        activeDriversCount={activeDriversCount}
      />

      {/* Prominent Demo Mode Notice */}
      {isDemoSession && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-6 py-2 text-xs flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>
              <strong>MODE EVALUASI / SIMULASI AKTIF (Peran: {user.role.toUpperCase()}):</strong> Sesi ini tidak terhubung ke database produksi Supabase. Seluruh data yang tampil adalah data simulasi operasional Banjarmasin.
            </span>
          </div>
          <span className="text-[10px] font-mono bg-amber-200/70 text-amber-800 px-2 py-0.5 rounded border border-amber-300 font-semibold">
            SIMULATION ONLY
          </span>
        </div>
      )}

      {/* Explicit Database Error Banner */}
      {apiError && (
        <div className="bg-red-50 border-b border-red-200 text-red-900 px-6 py-2 text-xs flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <span className="font-bold text-red-700">Database Supabase Error:</span>
            <span>{apiError}</span>
          </div>
          <button 
            onClick={() => setApiError(null)} 
            className="text-red-700 hover:text-red-900 font-bold px-2 py-0.5 rounded bg-red-100 cursor-pointer"
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
          isOpenOnMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Dynamic Workspace */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
          {/* 1. Ringkasan (Dashboard) */}
          {currentTab === 'dashboard' && (
            <DashboardView 
              drivers={drivers}
              orders={orders}
              users={users}
              zones={zones}
              onSelectTab={setCurrentTab}
              onSelectOrder={(order) => setSelectedOrderForDetail(order)}
            />
          )}

          {/* 2. Pesanan (Orders & Live Dispatch) */}
          {currentTab === 'orders' && (
            <OrdersView 
              orders={orders}
              drivers={drivers}
              onAssignDriver={handleAssignDriver}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onSelectOrder={(order) => setSelectedOrderForDetail(order)}
            />
          )}

          {/* 3. Pengguna (Users Management) */}
          {currentTab === 'users' && (
            <UsersPage 
              users={users}
              isSimulation={!isSupabaseConfigured}
              onUpdateUserStatus={handleUpdateUserStatus}
            />
          )}

          {/* 4. Mitra Driver (Drivers Management) */}
          {currentTab === 'drivers' && (
            <DriversView 
              drivers={drivers}
              onUpdateDriverStatus={handleUpdateDriverStatus}
              onApproveDocuments={handleApproveDocuments}
              onAddDriver={handleAddDriver}
            />
          )}

          {/* 5. Tarif & Zona (Operational Zones & Tariffs) */}
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

          {/* 6. Pembayaran (Payments & Transactions) */}
          {currentTab === 'payments' && (
            <PaymentsPage />
          )}

          {/* 7. Layanan (Service Catalog) */}
          {currentTab === 'services' && (
            <ServicesPage />
          )}

          {/* 8. Dukungan (Support Tickets & Helpdesk) */}
          {currentTab === 'support' && (
            <SupportPage />
          )}

          {/* 9. Analitik Operasional */}
          {currentTab === 'analytics' && (
            <AnalyticsPage 
              isSimulation={!isSupabaseConfigured}
            />
          )}

          {/* 10. Audit Log (Security & Audit Trail) */}
          {currentTab === 'security' && (
            <SecurityAuditView 
              auditLogs={auditLogs}
            />
          )}

          {/* 11. Pengaturan Sistem */}
          {currentTab === 'settings' && (
            <SettingsPage 
              onOpenDbModal={() => setIsDbModalOpen(true)}
              onRecordAudit={recordAudit}
            />
          )}

          {/* 12. Profil Administrator */}
          {currentTab === 'profile' && (
            <ProfilePage />
          )}

          {/* 13. Status Cloudflare & DB Deployment */}
          {currentTab === 'deployment' && (
            <DeploymentStatusView />
          )}

          {/* 14. 403 & 404 Fallbacks */}
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
