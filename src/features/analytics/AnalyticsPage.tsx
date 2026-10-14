import React, { useState } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Calendar, 
  Download, 
  Car, 
  Bike, 
  Utensils, 
  Package,
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';
import { AnalyticsSummary } from '../../types/database';

interface AnalyticsPageProps {
  isSimulation: boolean;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ isSimulation }) => {
  const [period, setPeriod] = useState<'today' | 'this_week' | 'this_month'>('today');

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const hourlyData = [
    { hour: '06:00', trips: 14, percent: 32 },
    { hour: '08:00', trips: 38, percent: 86 },
    { hour: '10:00', trips: 22, percent: 50 },
    { hour: '12:00', trips: 29, percent: 65 },
    { hour: '14:00', trips: 18, percent: 40 },
    { hour: '17:00', trips: 44, percent: 100 },
    { hour: '19:00', trips: 31, percent: 70 },
    { hour: '21:00', trips: 16, percent: 36 },
  ];

  const serviceData = [
    { name: 'KAWAI Motor', count: 88, share: 59, revenue: 1680000, icon: Bike, color: 'emerald' },
    { name: 'KAWAI Mobil', count: 32, share: 22, revenue: 2150000, icon: Car, color: 'blue' },
    { name: 'KAWAI Kuliner', count: 20, share: 14, revenue: 820000, icon: Utensils, color: 'amber' },
    { name: 'KAWAI Kirim', count: 8, share: 5, revenue: 240000, icon: Package, color: 'purple' },
  ];

  return (
    <div className="space-y-6">
      {/* Simulation Banner */}
      {isSimulation && (
        <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-2xl flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>Indikator Data Analitik Simulasi:</strong> Tren statistik di bawah dihitung berdasarkan model proyeksi operasional Banjarmasin Raya.
            </span>
          </div>
          <span className="text-[10px] bg-amber-900/60 text-amber-200 px-2 py-0.5 rounded font-mono">
            Proyeksi 0511
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Analitik &amp; Tren Operasional KAWAI 0511
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Pengawasan performa trip harian, rasio penyelesaian layanan, dan pembagian volume armada per kategori.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 text-xs bg-slate-950/60 border border-slate-700/80 p-1 rounded-xl">
          <button
            onClick={() => setPeriod('today')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              period === 'today' ? 'bg-emerald-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Hari Ini
          </button>
          <button
            onClick={() => setPeriod('this_week')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              period === 'this_week' ? 'bg-emerald-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Minggu Ini
          </button>
          <button
            onClick={() => setPeriod('this_month')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              period === 'this_month' ? 'bg-emerald-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Bulan Ini
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-xs space-y-1">
          <span className="text-slate-400">Total Volume Trip</span>
          <p className="text-2xl font-bold text-white">148 Trip</p>
          <p className="text-[10px] text-emerald-400 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> +14.2% dari kemarin
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-xs space-y-1">
          <span className="text-slate-400">Tingkat Penyelesaian (Completion Rate)</span>
          <p className="text-2xl font-bold text-emerald-400">94.6%</p>
          <p className="text-[10px] text-slate-500">Rasio pembatalan hanya 5.4%</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-xs space-y-1">
          <span className="text-slate-400">Gross Omset Terverifikasi</span>
          <p className="text-2xl font-bold text-cyan-400">{formatIDR(4890000)}</p>
          <p className="text-[10px] text-slate-500">Omset kotor transaksi perjalanan</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-xs space-y-1">
          <span className="text-slate-400">Rata-rata Jarak Tempuh</span>
          <p className="text-2xl font-bold text-amber-400">6.8 KM</p>
          <p className="text-[10px] text-slate-500">Radius Kota Banjarmasin</p>
        </div>
      </div>

      {/* Hourly Demand Histogram */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Fluktuasi Permintaan Trip per Jam (WITA)</h3>
          </div>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">Banjarmasin Time</span>
        </div>

        <div className="space-y-2.5 pt-2">
          {hourlyData.map((slot, idx) => (
            <div key={idx} className="flex items-center gap-3 text-xs">
              <span className="font-mono text-slate-400 w-12 text-[11px]">{slot.hour}</span>
              <div className="flex-1 bg-slate-950 h-5 rounded-lg overflow-hidden p-0.5 border border-slate-800">
                <div 
                  className={`h-full rounded-md transition-all ${
                    slot.percent > 80 ? 'bg-rose-500' : slot.percent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${slot.percent}%` }}
                ></div>
              </div>
              <span className="font-bold text-white w-14 text-right font-mono text-[11px]">{slot.trips} trip</span>
            </div>
          ))}
        </div>
      </div>

      {/* Service Type Breakdown Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Distribusi Pendapatan &amp; Armada per Layanan</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {serviceData.map((srv, idx) => {
            const Icon = srv.icon;
            return (
              <div key={idx} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">{srv.name}</span>
                  <Icon className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold text-white">{srv.count} <span className="text-xs font-normal text-slate-400">trip</span></span>
                  <span className="text-emerald-400 font-bold">{srv.share}%</span>
                </div>
                <div className="pt-2 border-t border-slate-800 text-slate-400 text-[11px]">
                  Omset: <strong className="text-slate-200">{formatIDR(srv.revenue)}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
