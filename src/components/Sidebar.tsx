import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  MapPin, 
  ShieldCheck, 
  Server,
  FileText,
  BadgeAlert
} from 'lucide-react';

export type TabType = 'dashboard' | 'drivers' | 'orders' | 'zones' | 'security' | 'deployment';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  pendingVerifications: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentTab, 
  onSelectTab,
  pendingVerifications
}) => {
  const menuItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Dashboard Operasional',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'drivers' as TabType,
      label: 'Manajemen Driver',
      icon: Users,
      badge: pendingVerifications > 0 ? `${pendingVerifications} Baru` : null,
      badgeColor: 'bg-amber-500 text-slate-950',
    },
    {
      id: 'orders' as TabType,
      label: 'Pesanan & Dispatch',
      icon: Car,
      badge: null,
    },
    {
      id: 'zones' as TabType,
      label: 'Tarif & Zonasi 0511',
      icon: MapPin,
      badge: null,
    },
    {
      id: 'security' as TabType,
      label: 'Keamanan & Audit Log',
      icon: ShieldCheck,
      badge: null,
    },
    {
      id: 'deployment' as TabType,
      label: 'Status Cloudflare & DB',
      icon: Server,
      badge: 'Phase 1-4',
      badgeColor: 'bg-emerald-600 text-white',
    },
  ];

  return (
    <aside className="w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col justify-between shrink-0">
      <div className="p-4 space-y-1">
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
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
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

      {/* Footer System Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="rounded-lg bg-slate-800/40 p-3 border border-slate-700/40 text-xs">
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span className="font-semibold">Target Hosting</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono">
              Pages
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Cloudflare Pages + Supabase PostgreSQL
          </p>
          <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1 font-mono">
            <span>Branch:</span>
            <span className="text-emerald-400">deploy/initial-setup</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
