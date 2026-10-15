import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  User, 
  LogOut, 
  ShieldCheck, 
  Database, 
  Menu, 
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { AdminPageView } from '../types/database';

interface HeaderProps {
  onOpenDbModal: () => void;
  onOpenProfile: () => void;
  onToggleMobileMenu?: () => void;
  onSelectTab?: (tab: AdminPageView) => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  activeOrdersCount?: number;
  activeDriversCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenDbModal, 
  onOpenProfile,
  onToggleMobileMenu,
  onSelectTab,
  searchQuery = '',
  onSearchChange,
  activeOrdersCount = 0,
  activeDriversCount = 0
}) => {
  const { user, logout, isDemoSession } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = [
    {
      id: 1,
      title: 'Verifikasi Berkas Mitra',
      desc: '1 calon pengemudi baru mengunggah berkas KTP/SIM.',
      time: '5 mnt lalu',
      actionTab: 'drivers' as AdminPageView,
    },
    {
      id: 2,
      title: 'Pesanan Menunggu Dispatch',
      desc: 'Pesanan di area Banjarmasin Tengah mencari mitra driver.',
      time: '12 mnt lalu',
      actionTab: 'orders' as AdminPageView,
    },
    {
      id: 3,
      title: 'Sistem Terhubung',
      desc: isSupabaseConfigured 
        ? 'Database PostgreSQL Supabase aktif dengan Row Level Security.' 
        : 'Sistem berjalan dalam mode evaluasi lokal aman.',
      time: 'Hari ini',
      actionTab: 'deployment' as AdminPageView,
    },
  ];

  return (
    <header className="bg-white border-b border-slate-200/90 text-slate-800 px-4 md:px-7 py-3 sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Mobile Toggle & Search Bar */}
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Cari pesanan, pengguna, atau mitra..."
              className="w-full bg-slate-50/80 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-red-500 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Right: Notification Bell & Admin Profile Pill */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setIsNotifOpen(!isNotifOpen);
                setIsProfileOpen(false);
              }}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              title="Notifikasi Operasional"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                3
              </span>
            </button>

            {/* Notification Dropdown */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">Notifikasi Operasional</span>
                    <span className="px-1.5 py-0.2 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">
                      3 Baru
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Banjarmasin 0511</span>
                </div>

                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {notifications.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab?.(item.actionTab);
                        setIsNotifOpen(false);
                      }}
                      className="w-full p-3 text-left hover:bg-slate-50 transition-colors flex items-start gap-2.5"
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                          <span>{item.title}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{item.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="p-2 border-t border-slate-100 bg-slate-50/40 text-center">
                  <button
                    onClick={() => {
                      onSelectTab?.('orders');
                      setIsNotifOpen(false);
                    }}
                    className="text-[11px] font-semibold text-red-600 hover:text-red-700"
                  >
                    Buka Semua Pesanan &amp; Antrean
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* Admin Profile Pill */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
                setIsNotifOpen(false);
              }}
              className="flex items-center gap-2.5 p-1 sm:pl-2 sm:pr-3 py-1.5 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all text-left"
            >
              {/* Avatar Circle */}
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs ring-1 ring-slate-300">
                {user?.full_name ? (
                  user.full_name.slice(0, 2).toUpperCase()
                ) : (
                  <User className="w-4 h-4 text-slate-600" />
                )}
              </div>

              {/* Name & Role Text */}
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-slate-800 leading-tight">
                  {user?.full_name || 'Admin KAWAI 0511'}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {user?.role === 'superadmin' ? 'Administrator' : (user?.role || 'Administrator')}
                </div>
              </div>

              <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            </button>

            {/* Profile Menu Dropdown */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-3.5 border-b border-slate-100 bg-slate-50/60">
                  <p className="text-xs font-bold text-slate-900">{user?.full_name || 'Admin KAWAI 0511'}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email || 'admin@kawai0511.id'}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 uppercase">
                      {user?.role || 'Administrator'}
                    </span>
                    {isDemoSession && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                        Demo
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-1.5 text-xs">
                  <button
                    onClick={() => {
                      onOpenProfile();
                      setIsProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Profil Administrator</span>
                  </button>

                  <button
                    onClick={() => {
                      onOpenDbModal();
                      setIsProfileOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Database className="w-4 h-4 text-slate-400" />
                      <span>Status Supabase &amp; Cloudflare</span>
                    </div>
                    {isSupabaseConfigured ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    )}
                  </button>
                </div>

                <div className="p-1.5 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors text-xs"
                  >
                    <LogOut className="w-4 h-4 text-red-600" />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
