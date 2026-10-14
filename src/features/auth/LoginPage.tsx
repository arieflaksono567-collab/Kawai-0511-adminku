import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  KeyRound, 
  AlertCircle, 
  CheckCircle2, 
  MapPin, 
  ArrowRight,
  UserCheck,
  Database
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { AdminRole } from '../../types/database';

export const LoginPage: React.FC = () => {
  const { loginWithPassword, loginAsDemoAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    const res = await loginWithPassword(email, password);
    if (!res.success) {
      setErrorMsg(res.error || 'Autentikasi gagal.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-emerald-500/30 selection:text-emerald-200">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 items-center justify-center font-black text-slate-950 text-2xl shadow-xl">
            K
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            KAWAI <span className="text-emerald-400">0511</span>
          </h1>
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            Portal Administrator Operasional Banjarmasin
          </p>
        </div>

        {/* Database Status Alert */}
        <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
          isSupabaseConfigured
            ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
            : 'bg-amber-950/60 border-amber-500/30 text-amber-300'
        }`}>
          <Database className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div className="space-y-0.5">
            <p className="font-bold">
              {isSupabaseConfigured 
                ? 'Supabase Database: Online & Terhubung' 
                : 'Mode Standby / Evaluasi Audit'}
            </p>
            <p className="text-[11px] text-slate-400">
              {isSupabaseConfigured
                ? 'Login menggunakan akun terdaftar di auth.users & admin_users.'
                : 'Belum terhubung ke Supabase live. Gunakan tombol Mode Evaluasi di bawah untuk menguji seluruh fitur.'}
            </p>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              Autentikasi Administrator
            </h2>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
              RLS-Protected
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5">
                Email Administrator
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@kawai0511.id"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Memverifikasi...' : 'Masuk ke Dashboard Operasional'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Evaluation / Quick Demo Section */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Mode Evaluasi & Audit Akses:</span>
              <span className="text-[10px] text-amber-400">Pilih Role</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => loginAsDemoAdmin('superadmin')}
                className="p-2.5 bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700 text-left transition-colors"
              >
                <div className="font-bold text-emerald-400 text-[11px]">Super Admin</div>
                <div className="text-[10px] text-slate-400">Hak akses penuh 100%</div>
              </button>

              <button
                type="button"
                onClick={() => loginAsDemoAdmin('dispatcher')}
                className="p-2.5 bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700 text-left transition-colors"
              >
                <div className="font-bold text-blue-400 text-[11px]">Dispatcher</div>
                <div className="text-[10px] text-slate-400">Armada & pesanan live</div>
              </button>

              <button
                type="button"
                onClick={() => loginAsDemoAdmin('finance')}
                className="p-2.5 bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700 text-left transition-colors"
              >
                <div className="font-bold text-amber-400 text-[11px]">Finansial</div>
                <div className="text-[10px] text-slate-400">Omset & komisi platform</div>
              </button>

              <button
                type="button"
                onClick={() => loginAsDemoAdmin('support')}
                className="p-2.5 bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700 text-left transition-colors"
              >
                <div className="font-bold text-purple-400 text-[11px]">Support Care</div>
                <div className="text-[10px] text-slate-400">Tiket & verifikasi</div>
              </button>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p className="flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Dilindungi oleh Row Level Security (RLS) PostgreSQL Supabase
          </p>
          <p>Akses tanpa hak administrator otomatis diblokir (403 Forbidden).</p>
        </div>
      </div>
    </div>
  );
};
