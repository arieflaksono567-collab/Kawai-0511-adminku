import React, { useState } from 'react';
import { 
  Settings, 
  Sliders, 
  Phone, 
  ShieldCheck, 
  Database, 
  Save, 
  Check, 
  AlertCircle,
  Percent,
  Wallet
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

interface SettingsPageProps {
  onOpenDbModal: () => void;
  onRecordAudit: (action: string, entity_type: string, entity_id: string, details: Record<string, any>) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ 
  onOpenDbModal, 
  onRecordAudit 
}) => {
  const { user, hasRole } = useAuth();
  const [platformFeePercent, setPlatformFeePercent] = useState('15');
  const [emergencyPhone, setEmergencyPhone] = useState('0811-0511-9911');
  const [maxCashoutDaily, setMaxCashoutDaily] = useState('1500000');
  const [isSaved, setIsSaved] = useState(false);

  const canEdit = hasRole(['superadmin', 'finance']);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    onRecordAudit('UPDATE_PLATFORM_SETTINGS', 'system_setting', 'global_0511', {
      platformFeePercent,
      emergencyPhone,
      maxCashoutDaily,
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            Pengaturan Sistem &amp; Kebijakan Operasional
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Konfigurasi persentase komisi KAWAI, hotline darurat, limit penarikan mitra, dan integrasi cloud.
          </p>
        </div>

        <button
          onClick={onOpenDbModal}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          Koneksi Supabase &amp; Cloudflare
        </button>
      </div>

      {!canEdit && (
        <div className="p-3 bg-amber-950/60 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Anda berada dalam mode tampilan read-only. Perubahan konfigurasi hanya dapat dilakukan oleh role <strong>superadmin</strong> atau <strong>finance</strong>.</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Platform Fee */}
          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Percent className="w-4 h-4 text-emerald-400" />
              <span>Komisi Platform Standar</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Persentase potongan otomatis dari setiap trip yang berhasil diselesaikan driver.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="30"
                disabled={!canEdit}
                value={platformFeePercent}
                onChange={(e) => setPlatformFeePercent(e.target.value)}
                className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
              <span className="text-slate-300 font-bold">% per order</span>
            </div>
          </div>

          {/* Emergency SOS Hotline */}
          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Phone className="w-4 h-4 text-rose-400" />
              <span>Hotline Darurat &amp; Dispatch SOS</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Nomor respons cepat 24 jam untuk laporan insiden kecelakaan atau kendala keamanan di jalan.
            </p>
            <input
              type="text"
              disabled={!canEdit}
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Daily Cashout Limit */}
          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Wallet className="w-4 h-4 text-amber-400" />
              <span>Limit Penarikan Saldo Driver / Hari</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Batas maksimum transfer pencairan saldo dompet mitra pengemudi per 24 jam.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono">Rp</span>
              <input
                type="number"
                disabled={!canEdit}
                value={maxCashoutDaily}
                onChange={(e) => setMaxCashoutDaily(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* RBAC Security Level */}
          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Tingkat Kepatuhan DevSecOps</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Seluruh transaksi data wajib mematuhi standar enkripsi SSL/TLS Cloudflare dan RLS PostgreSQL.
            </p>
            <div className="text-[11px] text-emerald-400 font-medium">
              ✓ Row Level Security (RLS) Wajib Aktif
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow ${
                isSaved ? 'bg-emerald-500 text-slate-950' : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950'
              }`}
            >
              {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {isSaved ? 'Pengaturan Disimpan' : 'Simpan Perubahan Kebijakan'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
