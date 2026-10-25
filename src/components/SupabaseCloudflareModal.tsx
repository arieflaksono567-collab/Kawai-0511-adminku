import React, { useState } from 'react';
import { 
  X, 
  Database, 
  Cloud, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { checkSupabaseHealth, isSupabaseConfigured, ConnectionStatus } from '../lib/supabase';

interface SupabaseCloudflareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseCloudflareModal: React.FC<SupabaseCloudflareModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ConnectionStatus | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    const res = await checkSupabaseHealth();
    setResult(res);
    setTesting(false);
  };

  const copyConfigSnippet = () => {
    const snippet = `VITE_SUPABASE_URL="https://rbfnjgrnojvzvrpyryms.supabase.co"\nVITE_SUPABASE_ANON_KEY="<masukkan-anon-key-anda>"`;
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-5 text-xs text-slate-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Diagnostik Supabase & Konfigurasi Cloudflare Pages
              </h3>
              <p className="text-[11px] text-slate-400">
                Pemeriksaan koneksi PostgreSQL, otorisasi RLS, dan parameter hosting.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Overview Banner */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
          isSupabaseConfigured
            ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
            : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
        }`}>
          <div className="flex items-center gap-3">
            {isSupabaseConfigured ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
            )}
            <div>
              <p className="font-bold text-white text-xs">
                {isSupabaseConfigured ? 'Supabase Credentials Terdeteksi' : 'Mode Audit / Standby Aktif'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isSupabaseConfigured 
                  ? 'Aplikasi berjalan menggunakan koneksi Supabase terkonfigurasi.'
                  : 'Aplikasi berjalan dengan mock dataset aman (in-memory) untuk verifikasi UI.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleTest}
            disabled={testing}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-[11px] border border-slate-700 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Activity className={`w-3.5 h-3.5 text-emerald-400 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Menguji...' : 'Uji Ping Host'}
          </button>
        </div>

        {result && (
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] space-y-1">
            <p className="text-slate-400">Endpoint: <span className="text-white">{result.url}</span></p>
            <p className="text-slate-400">Status: <span className={result.connected ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{result.message}</span></p>
            {result.latencyMs !== undefined && (
              <p className="text-slate-400">Latensi Roundtrip: <span className="text-emerald-400">{result.latencyMs} ms</span></p>
            )}
          </div>
        )}

        {/* Steps to deploy to Cloudflare */}
        <div className="space-y-3">
          <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
            <Cloud className="w-4 h-4 text-amber-400" />
            Panduan Menghubungkan ke Cloudflare Pages:
          </h4>

          <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2 text-[11px] leading-relaxed">
            <p>1. Di dashboard <strong>Cloudflare &rarr; Workers & Pages &rarr; Create &rarr; Pages &rarr; Connect to Git</strong>.</p>
            <p>2. Hubungkan repo <code className="text-amber-300">arieflaksono567-collab/Kawai-0511-admin</code>.</p>
            <p>3. Konfigurasi build:</p>
            <div className="grid grid-cols-2 gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-[10px] font-mono">
              <div>Framework: <span className="text-emerald-400">Vite</span></div>
              <div>Build command: <span className="text-emerald-400">npm run build</span></div>
              <div>Output dir: <span className="text-emerald-400">dist</span></div>
              <div>Node Version: <span className="text-emerald-400">NODE_VERSION=20</span></div>
            </div>
            <p>4. Masukkan Environment Variables di Cloudflare Pages:</p>
            <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 text-[10px] font-mono text-emerald-300">
              <span>VITE_SUPABASE_URL &amp; VITE_SUPABASE_ANON_KEY</span>
              <button
                onClick={copyConfigSnippet}
                className="text-slate-400 hover:text-white flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                {copied ? 'Tersalin' : 'Salin Snippet'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            File migrasi: <code className="text-slate-400">supabase/schema.sql</code>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl shadow transition-colors"
          >
            Selesai &amp; Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
