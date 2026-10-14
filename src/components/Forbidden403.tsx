import React from 'react';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

interface Forbidden403Props {
  onBackToDashboard: () => void;
  requiredRole?: string;
  userRole?: string;
}

export const Forbidden403: React.FC<Forbidden403Props> = ({ 
  onBackToDashboard, 
  requiredRole,
  userRole 
}) => {
  return (
    <div className="min-h-[500px] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400">
            HTTP 403 — Akses Ditolak
          </span>
          <h2 className="text-xl font-bold text-white">Otorisasi Tidak Memadai</h2>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Akun Anda ({userRole ? <strong className="text-slate-200">{userRole}</strong> : 'pengguna saat ini'}) tidak memiliki izin untuk mengakses modul operasional ini.
          {requiredRole && (
            <span> Membutuhkan peran: <strong className="text-emerald-400">{requiredRole}</strong>.</span>
          )}
        </p>

        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-center gap-2">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>Setiap upaya akses tanpa izin dicatat ke dalam audit log.</span>
        </div>

        <button
          onClick={onBackToDashboard}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Dashboard Utama
        </button>
      </div>
    </div>
  );
};
