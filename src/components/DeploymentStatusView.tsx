import React, { useState } from 'react';
import { 
  Server, 
  Cloud, 
  Database, 
  GitBranch, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Terminal,
  Activity
} from 'lucide-react';
import { checkSupabaseHealth, isSupabaseConfigured, ConnectionStatus } from '../lib/supabase';

export const DeploymentStatusView: React.FC = () => {
  const [testingHealth, setTestingHealth] = useState(false);
  const [healthResult, setHealthResult] = useState<ConnectionStatus | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setTestingHealth(true);
    const result = await checkSupabaseHealth();
    setHealthResult(result);
    setTestingHealth(false);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-400" />
            Spesifikasi Deployment: Cloudflare Pages & Supabase
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Status persiapan build, pipeline CI/CD, variabel lingkungan, dan verifikasi edge hosting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 font-mono">
            Branch Aktif: <strong className="text-emerald-400">deploy/initial-setup</strong>
          </span>
        </div>
      </div>

      {/* Grid: Cloudflare Pages Specs vs Supabase Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cloudflare Pages Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Target Hosting: Cloudflare Pages</h3>
                <p className="text-[11px] text-slate-400">Vite React Static Single-Page App (SPA)</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/30">
              Preset: Vite
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-400">Framework Preset:</span>
              <code className="text-emerald-400 font-bold font-mono">Vite</code>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-400">Build Command:</span>
              <code className="text-emerald-400 font-bold font-mono">npm run build</code>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-400">Build Output Directory:</span>
              <code className="text-emerald-400 font-bold font-mono">dist</code>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-400">Node.js Version:</span>
              <code className="text-emerald-400 font-bold font-mono">NODE_VERSION=20</code>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-400">SPA Fallback Redirects:</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> public/_redirects terpasang
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-400">Security Headers:</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> public/_headers terpasang
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            <p className="font-semibold text-slate-300 mb-1">Langkah Hubungkan Cloudflare:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-400">
              <li>Buka dashboard Cloudflare &rarr; <strong>Workers & Pages</strong> &rarr; <strong>Create application</strong>.</li>
              <li>Pilih tab <strong>Pages</strong> &rarr; <strong>Connect to Git</strong>.</li>
              <li>Pilih repositori <code className="text-amber-300">Kawai-0511-admin</code>.</li>
              <li>Pilih branch <code className="text-emerald-400">deploy/initial-setup</code> atau <code className="text-emerald-400">main</code>.</li>
              <li>Set Environment Variables seperti di kartu sebelah kanan.</li>
            </ol>
          </div>
        </div>

        {/* Supabase Integration Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Target Database: Supabase PostgreSQL</h3>
                <p className="text-[11px] text-slate-400">RLS Enforced + Client SDK</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              isSupabaseConfigured 
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30' 
                : 'bg-amber-950 text-amber-300 border-amber-500/30'
            }`}>
              {isSupabaseConfigured ? 'Terkoneksi' : 'Menunggu Env Vars'}
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">1. VITE_SUPABASE_URL</span>
                <button
                  onClick={() => copyToClipboard('VITE_SUPABASE_URL', 'url')}
                  className="text-slate-400 hover:text-white flex items-center gap-1 text-[10px]"
                >
                  <Copy className="w-3 h-3" />
                  {copiedKey === 'url' ? 'Disalin!' : 'Salin nama'}
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Didapat dari Supabase Dashboard &rarr; Project Settings &rarr; API &rarr; Project URL.
              </p>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">2. VITE_SUPABASE_ANON_KEY</span>
                <button
                  onClick={() => copyToClipboard('VITE_SUPABASE_ANON_KEY', 'anon')}
                  className="text-slate-400 hover:text-white flex items-center gap-1 text-[10px]"
                >
                  <Copy className="w-3 h-3" />
                  {copiedKey === 'anon' ? 'Disalin!' : 'Salin nama'}
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Kunci publik (<code className="text-amber-300">anon / public</code>). Aman untuk browser karena diproteksi oleh RLS.
              </p>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">3. File Skema SQL Siap Pakai</span>
                <span className="text-emerald-400 font-mono text-[10px]">supabase/schema.sql</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Jalankan script ini di Supabase SQL Editor untuk membuat tabel dan kebijakan keamanan Row Level Security.
              </p>
            </div>
          </div>

          {/* Diagnostic Test Button */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <button
              onClick={handleTestConnection}
              disabled={testingHealth}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2 text-xs"
            >
              <Activity className={`w-3.5 h-3.5 text-emerald-400 ${testingHealth ? 'animate-spin' : ''}`} />
              {testingHealth ? 'Menguji Koneksi...' : 'Uji Konektivitas Supabase (Health Check)'}
            </button>

            {healthResult && (
              <div className={`p-3 rounded-xl border text-xs ${
                healthResult.connected
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
              }`}>
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  {healthResult.connected ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
                  <span>{healthResult.connected ? 'Status: Online & Sehat' : 'Status: Menunggu Konfigurasi'}</span>
                  {healthResult.latencyMs && (
                    <span className="text-[10px] font-mono ml-auto bg-slate-900 px-1.5 py-0.2 rounded">
                      {healthResult.latencyMs}ms
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">{healthResult.message}</p>
                {healthResult.error && (
                  <p className="text-[10px] text-rose-400 font-mono mt-1">{healthResult.error}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
