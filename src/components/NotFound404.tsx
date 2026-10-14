import React from 'react';
import { HelpCircle, ArrowLeft } from 'lucide-react';

interface NotFound404Props {
  onBackToDashboard: () => void;
}

export const NotFound404: React.FC<NotFound404Props> = ({ onBackToDashboard }) => {
  return (
    <div className="min-h-[500px] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-400 border border-slate-700 mx-auto flex items-center justify-center">
          <HelpCircle className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
            HTTP 404 — Halaman Tidak Ditemukan
          </span>
          <h2 className="text-xl font-bold text-white">Rute Navigasi Tidak Valid</h2>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Modul atau tautan administrasi yang Anda tuju tidak tersedia atau telah dipindahkan.
        </p>

        <button
          onClick={onBackToDashboard}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded-xl text-xs font-bold shadow transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Dashboard Utama
        </button>
      </div>
    </div>
  );
};
