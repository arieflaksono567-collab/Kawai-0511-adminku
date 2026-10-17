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
import { getUserDisplayName } from '../../types/database';

export const ProfilePage: React.FC = () => {
  const { user, isDemoSession, logout } = useAuth();

  if (!user) return null;

  const displayName = getUserDisplayName(user);
  const initials = displayName.slice(0, 2).toUpperCase() || 'AD';

  const roleLabels: Record<string, { label: string; desc: string; color: string }> = {
    superadmin: {
      label: 'Super Administrator',
      desc: 'Otoritas tertinggi: pengelolaan user, driver, tarif zonasi, dan audit forensik.',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    dispatcher: {
      label: 'Operator Dispatcher',
      desc: 'Pengawasan live fleet, penugasan driver manual, dan monitoring rute pesanan.',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    finance: {
      label: 'Administrator Keuangan',
      desc: 'Pencairan saldo dompet mitra, rincian komisi platform, dan rekonsiliasi.',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    support: {
      label: 'Customer Support Care',
      desc: 'Penanganan keluhan pelanggan, verifikasi awal berkas driver, dan peninjauan tiket.',
      color: 'bg-purple-50 text-purple-700 border-purple-200',
    },
  };

  const roleInfo = roleLabels[user.role] || {
    label: user.role,
    desc: 'Administrator sistem KAWAI 0511',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-red-600" />
            Profil &amp; Otoritas Administrator
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Informasi kredensial, tingkatan hak akses RBAC, dan parameter sesi operasional Anda.
          </p>
        </div>

        <button
          onClick={logout}
          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Keluar Sesi (Logout)
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-6 text-xs">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-400 flex items-center justify-center text-white font-black text-2xl shadow-sm">
            {initials}
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">{displayName}</h3>
            <p className="text-slate-500 font-mono flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> {user.email || 'admin@kawai0511.com'}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${roleInfo.color}`}>
                {roleInfo.label}
              </span>
              {isDemoSession ? (
                <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-mono px-2 py-0.5 rounded">
                  Sesi Evaluasi / Demo
                </span>
              ) : (
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono px-2 py-0.5 rounded">
                  Supabase Live Session
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Role Permissions Description */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Cakupan Hak Akses Peran ({user.role})
          </span>
          <p className="text-slate-700 text-xs leading-relaxed">
            {roleInfo.desc}
          </p>
          <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Akses Monitoring Dispatch</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verifikasi Berkas Pengemudi</span>
            </div>
            <div className="flex items-center gap-1.5">
              {user.role === 'superadmin' || user.role === 'finance' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <span className="text-slate-300">✕</span>
              )}
              <span>Pengaturan Tarif &amp; Komisi</span>
            </div>
            <div className="flex items-center gap-1.5">
              {user.role === 'superadmin' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <span className="text-slate-300">✕</span>
              )}
              <span>Manajemen Superadmin</span>
            </div>
          </div>
        </div>

        {/* Security Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Wilayah Penugasan</span>
            <p className="font-bold text-slate-800 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-red-600" />
              Banjarmasin &amp; Kalsel (0511)
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Zona Waktu Operasional</span>
            <p className="font-mono font-bold text-slate-800 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              WITA (UTC+8)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
