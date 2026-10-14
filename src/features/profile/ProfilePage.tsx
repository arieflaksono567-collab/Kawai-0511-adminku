import React from 'react';
import { 
  User, 
  ShieldCheck, 
  Mail, 
  Clock, 
  Key, 
  LogOut, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export const ProfilePage: React.FC = () => {
  const { user, isDemoSession, logout } = useAuth();

  if (!user) return null;

  const roleLabels: Record<string, { label: string; desc: string; color: string }> = {
    superadmin: {
      label: 'Super Administrator',
      desc: 'Otoritas tertinggi: pengelolaan user, driver, tarif zonasi, dan audit forensik.',
      color: 'bg-emerald-950 text-emerald-300 border-emerald-500/40',
    },
    dispatcher: {
      label: 'Operator Dispatcher',
      desc: 'Pengawasan live fleet, penugasan driver manual, dan monitoring rute pesanan.',
      color: 'bg-blue-950 text-blue-300 border-blue-500/40',
    },
    finance: {
      label: 'Administrator Keuangan',
      desc: 'Pencairan saldo dompet mitra, rincian komisi platform, dan rekonsiliasi.',
      color: 'bg-amber-950 text-amber-300 border-amber-500/40',
    },
    support: {
      label: 'Customer Support Care',
      desc: 'Penanganan keluhan pelanggan, verifikasi awal berkas driver, dan peninjauan tiket.',
      color: 'bg-purple-950 text-purple-300 border-purple-500/40',
    },
  };

  const roleInfo = roleLabels[user.role] || {
    label: user.role,
    desc: 'Administrator sistem KAWAI 0511',
    color: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            Profil &amp; Otoritas Administrator
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Informasi kredensial, tingkatan hak akses RBAC, dan parameter sesi operasional Anda.
          </p>
        </div>

        <button
          onClick={logout}
          className="px-4 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Keluar Sesi (Logout)
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 text-xs">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-slate-950 font-black text-2xl shadow-inner">
            {user.full_name.slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">{user.full_name}</h3>
            <p className="text-slate-400 font-mono flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-500" /> {user.email}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${roleInfo.color}`}>
                {roleInfo.label}
              </span>
              {isDemoSession ? (
                <span className="bg-amber-950/80 text-amber-300 border border-amber-500/30 text-[10px] font-mono px-2 py-0.5 rounded">
                  Sesi Evaluasi / Demo
                </span>
              ) : (
                <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono px-2 py-0.5 rounded">
                  Supabase Live Session
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Role Permissions Description */}
        <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Cakupan Hak Akses Peran ({user.role})
          </span>
          <p className="text-slate-300 text-xs leading-relaxed">
            {roleInfo.desc}
          </p>
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Akses Monitoring Dispatch</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verifikasi Berkas Pengemudi</span>
            </div>
            <div className="flex items-center gap-1.5">
              {user.role === 'superadmin' || user.role === 'finance' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <span className="text-slate-600">✕</span>
              )}
              <span>Pengaturan Tarif &amp; Komisi</span>
            </div>
            <div className="flex items-center gap-1.5">
              {user.role === 'superadmin' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <span className="text-slate-600">✕</span>
              )}
              <span>Manajemen Superadmin</span>
            </div>
          </div>
        </div>

        {/* Security Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Wilayah Penugasan</span>
            <p className="font-bold text-slate-200 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              Banjarmasin &amp; Kalsel (0511)
            </p>
          </div>

          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Zona Waktu Operasional</span>
            <p className="font-mono font-bold text-slate-200 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              WITA (UTC+8)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
