import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Database, 
  Clock, 
  Radio, 
  Settings, 
  CheckCircle2, 
  AlertTriangle,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

interface HeaderProps {
  onOpenDbModal: () => void;
  activeOrdersCount: number;
  activeDriversCount: number;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenDbModal, 
  activeOrdersCount, 
  activeDriversCount 
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // WITA (UTC+8) for Banjarmasin 0511
      const formatted = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Makassar',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(now);
      setTimeStr(`${formatted} WITA`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
      {/* Brand & City Tag */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center font-black text-slate-950 text-xl tracking-wider shadow-inner">
          K
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              KAWAI <span className="text-emerald-400">0511</span>
            </h1>
            <span className="text-xs bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 font-mono px-2 py-0.5 rounded">
              v1.0-deploy
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-amber-400" />
            Admin Panel Operasional Banjarmasin & Sekitarnya
          </p>
        </div>
      </div>

      {/* Live Operational Metrics & Clock */}
      <div className="flex items-center space-x-4">
        <div className="hidden lg:flex items-center space-x-3 text-xs bg-slate-800/80 border border-slate-700/60 px-3.5 py-1.5 rounded-lg">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="font-medium">Armada Aktif:</span>
            <span className="text-emerald-400 font-bold">{activeDriversCount}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span className="font-medium">Trip Berjalan:</span>
            <span className="text-amber-400 font-bold">{activeOrdersCount}</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{timeStr || 'Memuat...'}</span>
        </div>

        {/* Supabase Status Trigger */}
        <button
          onClick={onOpenDbModal}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            isSupabaseConfigured
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
              : 'bg-amber-950/50 border-amber-500/40 text-amber-300 hover:bg-amber-900/40'
          }`}
          title="Klik untuk melihat status koneksi Supabase & panduan Cloudflare"
        >
          <Database className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Supabase:</span>
          <span>{isSupabaseConfigured ? 'Terhubung (Prod)' : 'Standby / Audit Mode'}</span>
          {isSupabaseConfigured ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          )}
        </button>

        {/* User Role */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-emerald-400">
            AD
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-semibold text-slate-200">Admin Utama</p>
            <p className="text-[10px] text-emerald-400 font-mono">superadmin</p>
          </div>
        </div>
      </div>
    </header>
  );
};
