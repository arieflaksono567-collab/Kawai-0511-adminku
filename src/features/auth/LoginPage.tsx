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
  Database
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { AdminRole } from '../../types/database';
import { KawaiLogo } from '../../components/KawaiLogo';

export const LoginPage: React.FC = () => {
  const { loginWithPassword, loginAsDemoAdmin, isDemoAllowed } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    const targetEmail = email.trim();
    if (!targetEmail || !password) {
      setErrorMsg('Email dan kata sandi wajib diisi.');
      setIsSubmitting(false);
      return;
    }

    const res = await loginWithPassword(targetEmail, password);
    if (!res.success) {
      setErrorMsg(res.error || 'Autentikasi gagal.');
    }
    setIsSubmitting(false);
  };

  const handleDemoLogin = (role: AdminRole) => {
    const res = loginAsDemoAdmin(role);
    if (!res.success && res.error) {
      setErrorMsg(res.error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 selection:bg-red-500/20 selection:text-red-900">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header with Kawai Logo */}
        <div className="text-center space-y-3 flex flex-col items-center">
          <KawaiLogo size="lg" className="justify-center" />
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1 font-medium">
            <MapPin className="w-3.5 h-3.5 text-red-500" />
            Portal Administrator Operasional Banjarmasin (Area 0511)
          </p>
        </div>

        {/* Database Status Alert */}
        <div className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
          isSupabaseConfigured
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <Database className={`w-4 h-4 shrink-0 mt-0.5 ${isSupabaseConfigured ? 'text-emerald-600' : 'text-amber-600'}`} />
          <div className="space-y-0.5">
            <p className="font-bold">
              {isSupabaseConfigured 
                ? 'Supabase Database: Online & Terhubung' 
                : 'Mode Standby / Evaluasi Audit'}
            </p>
            <p className="text-[11px] text-slate-600">
              {isSupabaseConfigured
                ? 'Login menggunakan akun terverifikasi di auth.users & user_profiles.'
                : 'Koneksi database langsung belum aktif di environment. ' + (isDemoAllowed ? 'Gunakan Mode Evaluasi di bawah untuk peninjauan antarmuka.' : 'Hubungi DevOps.')}
            </p>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-600" />
              Autentikasi Administrator
            </h2>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono font-medium">
              RLS-Protected
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-600 text-xs font-semibold mb-1.5">
                Email Administrator
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@kawai0511.id"
                  autoComplete="username"
                  required
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-red-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 text-xs font-semibold mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kata sandi"
                  autoComplete="current-password"
                  required
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-red-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? 'Memverifikasi...' : 'Masuk ke Dashboard Operasional'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Section (Active in dev/preview) */}
          {isDemoAllowed ? (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Mode Evaluasi &amp; Audit Akses:</span>
                <span className="text-[10px] text-amber-600 font-bold">Pilih Role</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleDemoLogin('superadmin')}
                  className="p-2.5 bg-slate-50 hover:bg-red-50/60 rounded-xl border border-slate-200 hover:border-red-200 text-left transition-colors"
                >
                  <div className="font-bold text-red-600 text-[11px]">Super Admin</div>
                  <div className="text-[10px] text-slate-500">Hak akses penuh 100%</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoLogin('dispatcher')}
                  className="p-2.5 bg-slate-50 hover:bg-blue-50/60 rounded-xl border border-slate-200 hover:border-blue-200 text-left transition-colors"
                >
                  <div className="font-bold text-blue-600 text-[11px]">Dispatcher</div>
                  <div className="text-[10px] text-slate-500">Armada &amp; pesanan live</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoLogin('finance')}
                  className="p-2.5 bg-slate-50 hover:bg-emerald-50/60 rounded-xl border border-slate-200 hover:border-emerald-200 text-left transition-colors"
                >
                  <div className="font-bold text-emerald-600 text-[11px]">Finansial</div>
                  <div className="text-[10px] text-slate-500">Omset &amp; komisi platform</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoLogin('support')}
                  className="p-2.5 bg-slate-50 hover:bg-purple-50/60 rounded-xl border border-slate-200 hover:border-purple-200 text-left transition-colors"
                >
                  <div className="font-bold text-purple-600 text-[11px]">Support Care</div>
                  <div className="text-[10px] text-slate-500">Tiket &amp; verifikasi</div>
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-100 text-center text-xs space-y-1">
              <p className="flex items-center justify-center gap-1.5 text-slate-600 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Mode Keamanan Produksi Aktif
              </p>
              <p className="text-[11px] text-slate-500">
                Akses demo dinonaktifkan. Seluruh sesi diautentikasi langsung ke Supabase Auth.
              </p>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p className="flex items-center justify-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Dilindungi oleh Row Level Security (RLS) PostgreSQL Supabase
          </p>
          <p>Akses tanpa otorisasi administrator operasional otomatis diblokir (403 Forbidden).</p>
        </div>
      </div>
    </div>
  );
};
