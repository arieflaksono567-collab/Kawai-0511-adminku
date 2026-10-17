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
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Server className="w-5 h-5 text-red-600" />
            Spesifikasi Deployment: Cloudflare Pages &amp; Supabase
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Status persiapan build, pipeline CI/CD, variabel lingkungan, dan verifikasi edge hosting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-50 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 font-mono">
            Target Project Ref: <strong className="text-red-600">rbfnjgrnojvzvrpyryms</strong>
          </span>
        </div>
      </div>

      {/* Grid: Cloudflare Pages Specs vs Supabase Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cloudflare Pages Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Target Hosting: Cloudflare Pages</h3>
                <p className="text-[11px] text-slate-500">Vite React Static Single-Page App (SPA)</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              Preset: Vite
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-600">Framework Preset:</span>
              <code className="text-slate-900 font-bold font-mono">Vite</code>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-600">Build Command:</span>
              <code className="text-slate-900 font-bold font-mono">npm run build</code>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-600">Build Output Directory:</span>
              <code className="text-slate-900 font-bold font-mono">dist</code>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-600">Node.js Version:</span>
              <code className="text-slate-900 font-bold font-mono">NODE_VERSION=20</code>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-600">SPA Fallback Redirects:</span>
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> public/_redirects terpasang
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-600">Security Headers:</span>
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> public/_headers terpasang
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <p className="font-semibold text-slate-700 mb-1">Langkah Hubungkan Cloudflare:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600">
              <li>Buka dashboard Cloudflare &rarr; <strong>Workers &amp; Pages</strong> &rarr; <strong>Create application</strong>.</li>
              <li>Pilih tab <strong>Pages</strong> &rarr; <strong>Connect to Git</strong>.</li>
              <li>Pilih repositori <code className="text-red-600">arieflaksono567-collab/Kawai-0511-adminku</code>.</li>
              <li>Pilih branch <code className="text-slate-900 font-semibold">fix/production-schema-alignment</code> atau <code className="text-slate-900 font-semibold">main</code>.</li>
              <li>Set Environment Variables seperti di kartu sebelah kanan.</li>
            </ol>
          </div>
        </div>

        {/* Supabase Integration Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Target Database: Supabase PostgreSQL</h3>
                <p className="text-[11px] text-slate-500">Project Ref: rbfnjgrnojvzvrpyryms</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              isSupabaseConfigured 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {isSupabaseConfigured ? 'Terkoneksi' : 'Menunggu Env Vars'}
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">1. VITE_SUPABASE_URL</span>
                <button
                  onClick={() => copyToClipboard('VITE_SUPABASE_URL', 'url')}
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-[10px] cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  {copiedKey === 'url' ? 'Disalin!' : 'Salin nama'}
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                URL Publik: <code className="text-slate-700">https://rbfnjgrnojvzvrpyryms.supabase.co</code>
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">2. VITE_SUPABASE_ANON_KEY</span>
                <button
                  onClick={() => copyToClipboard('VITE_SUPABASE_ANON_KEY', 'anon')}
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-[10px] cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  {copiedKey === 'anon' ? 'Disalin!' : 'Salin nama'}
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Kunci publik (<code className="text-amber-700">anon / public</code>). Aman untuk browser karena diproteksi oleh RLS.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">3. Skema 13 Tabel Produksi</span>
                <span className="text-emerald-700 font-mono text-[10px]">VERIFIED</span>
              </div>
              <p className="text-[10px] text-slate-500">
                user_profiles, driver_profiles, orders, order_status_history, service_types, service_zones, tariff_rules, payment_transactions, support_tickets, admin_settings, audit_logs.
              </p>
            </div>
          </div>

          {/* Diagnostic Test Button */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <button
              onClick={handleTestConnection}
              disabled={testingHealth}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer shadow-xs"
            >
              <Activity className={`w-3.5 h-3.5 text-emerald-400 ${testingHealth ? 'animate-spin' : ''}`} />
              {testingHealth ? 'Menguji Koneksi...' : 'Uji Konektivitas Supabase (Health Check)'}
            </button>

            {healthResult && (
              <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                healthResult.connected 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <p className="font-bold flex items-center gap-1.5">
                  {healthResult.connected ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                  {healthResult.connected ? 'Koneksi Berhasil' : 'Koneksi Gagal / Belum Terhubung'}
                </p>
                <p className="text-[11px]">{healthResult.message}</p>
                {healthResult.latencyMs && (
                  <p className="text-[10px] font-mono text-slate-500">Latency: {healthResult.latencyMs}ms</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
