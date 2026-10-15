import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  UserCheck, 
  MapPin, 
  CreditCard, 
  LayoutGrid, 
  Headphones, 
  FileText, 
  Settings,
  X
} from 'lucide-react';
import { AdminPageView } from '../types/database';
import { KawaiLogo } from './KawaiLogo';
import { KawaiMascot } from './KawaiMascot';

interface SidebarProps {
  currentTab: AdminPageView;
  onSelectTab: (tab: AdminPageView) => void;
  pendingVerifications?: number;
  isOpenOnMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentTab, 
  onSelectTab,
  pendingVerifications = 0,
  isOpenOnMobile = false,
  onCloseMobile
}) => {
  const menuItems = [
    {
      id: 'dashboard' as AdminPageView,
      label: 'Ringkasan',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'orders' as AdminPageView,
      label: 'Pesanan',
      icon: Package,
      badge: null,
    },
    {
      id: 'users' as AdminPageView,
      label: 'Pengguna',
      icon: Users,
      badge: null,
    },
    {
      id: 'drivers' as AdminPageView,
      label: 'Mitra Driver',
      icon: UserCheck,
      badge: pendingVerifications > 0 ? `${pendingVerifications}` : null,
      badgeColor: 'bg-red-100 text-red-600',
    },
    {
      id: 'zones' as AdminPageView,
      label: 'Tarif & Zona',
      icon: MapPin,
      badge: null,
    },
    {
      id: 'payments' as AdminPageView,
      label: 'Pembayaran',
      icon: CreditCard,
      badge: null,
    },
    {
      id: 'services' as AdminPageView,
      label: 'Layanan',
      icon: LayoutGrid,
      badge: null,
    },
    {
      id: 'support' as AdminPageView,
      label: 'Dukungan',
      icon: Headphones,
      badge: null,
    },
    {
      id: 'security' as AdminPageView,
      label: 'Audit Log',
      icon: FileText,
      badge: null,
    },
    {
      id: 'settings' as AdminPageView,
      label: 'Pengaturan',
      icon: Settings,
      badge: null,
    },
  ];

  const handleTabClick = (id: AdminPageView) => {
    onSelectTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenOnMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar */}
      <aside className={`
        fixed lg:static top-0 bottom-0 left-0 z-50
        w-64 bg-white border-r border-slate-200/90
        flex flex-col justify-between shrink-0
        transition-transform duration-200 ease-in-out
        ${isOpenOnMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Top: Logo & Brand */}
        <div>
          <div className="p-4 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
            <KawaiLogo />
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation Menu */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-270px)]">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                    isActive
                      ? 'bg-red-50 text-red-600 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-red-600' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-100 text-slate-600'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Mascot Card with Slogan */}
        <div className="p-3 border-t border-slate-100 bg-white">
          <KawaiMascot />
        </div>
      </aside>
    </>
  );
};
