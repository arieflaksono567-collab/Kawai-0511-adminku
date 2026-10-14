import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck,
  Car, 
  MapPin, 
  ShieldCheck, 
  Server,
  TrendingUp,
  Settings,
  User
} from 'lucide-react';
import { AdminPageView } from '../types/database';
import { useAuth } from '../features/auth/AuthContext';

interface SidebarProps {
  currentTab: AdminPageView;
  onSelectTab: (tab: AdminPageView) => void;
  pendingVerifications: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentTab, 
  onSelectTab,
  pendingVerifications
}) => {
  const { user } = useAuth();

  const menuItems = [
    {
      id: 'dashboard' as AdminPageView,
      label: 'Dashboard Operasional',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'users' as AdminPageView,
      label: 'Manajemen Pengguna',
      icon: Users,
      badge: null,
    },
    {
      id: 'drivers' as AdminPageView,
      label: 'Manajemen Driver',
      icon: UserCheck,
      badge: pendingVerifications > 0 ? `${pendingVerifications} Baru` : null,
      badgeColor: 'bg-amber-500 text-slate-950',
    },
    {
      id: 'orders' as AdminPageView,
      label: 'Pesanan & Dispatch',
      icon: Car,
      badge: null,
    },
    {
      id: 'analytics' as AdminPageView,
      label: 'Analitik Operasional',
      icon: TrendingUp,
      badge: null,
    },
    {
      id: 'zones' as AdminPageView,
      label: 'Tarif & Zonasi 0511',
      icon: MapPin,
      badge: null,
    },
    {
      id: 'security' as AdminPageView,
      label: 'Keamanan & Audit Log',
      icon: ShieldCheck,
      badge: null,
    },
    {
      id: 'settings' as AdminPageView,
      label: 'Pengaturan Sistem',
      icon: Settings,
      badge: null,
    },
    {
      id: 'deployment' as AdminPageView,
      label: 'Status Cloudflare & DB',
      icon: Server,
      badge: 'Ready',
      badgeColor: 'bg-emerald-600 text-white',
    },
  ];

  return (
    <aside className="w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col justify-between shrink-0">
      <div className="p-4 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Modul Operasional
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-700 text-slate-300'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer System Info & Profile Link */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 space-y-3">
        <button
          onClick={() => onSelectTab('profile')}
          className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left border transition-colors ${
            currentTab === 'profile'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-slate-800/40 border-slate-700/40 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
            {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'AD'}
          </div>
          <div className="truncate flex-1">
            <p className="text-xs font-bold truncate text-slate-200">{user?.full_name || 'Admin Sesi'}</p>
            <p className="text-[10px] text-emerald-400 font-mono capitalize">{user?.role || 'admin'}</p>
          </div>
        </button>

        <div className="rounded-lg bg-slate-800/40 p-2.5 border border-slate-700/40 text-[11px]">
          <div className="flex items-center justify-between text-slate-300 mb-0.5">
            <span className="font-semibold">Target Hosting</span>
            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-mono">
              Pages
            </span>
          </div>
          <p className="text-[10px] text-slate-400 truncate">
            Cloudflare Pages + Supabase
          </p>
        </div>
      </div>
    </aside>
  );
};
