import React, { useState, useEffect } from 'react';
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
  ArrowUpRight,
  RefreshCw,
  Inbox
} from 'lucide-react';
import { AnalyticsSummary } from '../../types/database';
import { api } from '../../lib/api';

interface AnalyticsPageProps {
  isSimulation: boolean;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ isSimulation }) => {
  const [period, setPeriod] = useState<'today' | 'this_week' | 'this_month'>('today');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getAnalyticsSummary(period);
      if (res.error) {
        setErrorMsg(res.error);
      }
      setSummary(res.data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal memuat analitik operasional.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'ride_motor': return Bike;
      case 'ride_car': return Car;
      case 'food': return Utensils;
      default: return Package;
    }
  };

  const getServiceLabel = (service: string) => {
    switch (service) {
      case 'ride_motor': return 'KAWAI Motor';
      case 'ride_car': return 'KAWAI Mobil';
      case 'food': return 'KAWAI Kuliner';
      default: return 'KAWAI Kirim';
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulation Banner - Shown ONLY when operating on simulation data */}
      {isSimulation && (
        <div className="bg-amber-950/40 border border-amber-500/30 p-3.5 rounded-2xl flex items-center justify-between text-xs text-amber-300 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>Indikator Data Analitik Simulasi:</strong> Nilai statistik di bawah dihitung dari dataset simulasi dev karena database Supabase belum terhubung.
            </span>
          </div>
          <span className="text-[10px] bg-amber-900/60 text-amber-200 px-2 py-0.5 rounded font-mono border border-amber-500/30">
            SIMULATION
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
            Data agregasi volume pesanan, rasio penyelesaian, dan pembagian layanan operasional wilayah Banjarmasin Raya.
          </p>
        </div>

        {/* Period Selector & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs bg-slate-950/60 border border-slate-700/80 p-1 rounded-xl">
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

          <button
            onClick={fetchAnalytics}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Refresh Analitik"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error State */}
      {errorMsg && (
        <div className="p-4 bg-rose-950/60 border border-rose-500/40 rounded-2xl text-xs text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span><strong>Kesalahan Kueri Analitik:</strong> {errorMsg}</span>
          </div>
          <button onClick={fetchAnalytics} className="underline hover:text-white font-semibold">
            Coba Lagi
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !summary ? (
        <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-3 bg-slate-900 border border-slate-800 rounded-2xl">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
          <p>Mengkalkulasi agregasi data operasional Supabase...</p>
        </div>
      ) : summary && summary.totalOrders === 0 && !isSimulation ? (
        /* Empty State */
        <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-3 bg-slate-900 border border-slate-800 rounded-2xl">
          <Inbox className="w-10 h-10 text-slate-600" />
          <h3 className="text-sm font-bold text-white">Belum Ada Data Transaksi Operasional</h3>
          <p className="max-w-md text-slate-500">
            Tabel <code className="text-emerald-400">orders</code> di Supabase saat ini masih kosong. Data statistik akan teragregasi secara otomatis saat transaksi pesanan mulai masuk.
          </p>
        </div>
      ) : summary ? (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-xs space-y-1">
              <span className="text-slate-400">Total Volume Trip</span>
              <p className="text-2xl font-bold text-white">{summary.totalOrders} Trip</p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" /> Periode aktif
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-xs space-y-1">
              <span className="text-slate-400">Tingkat Penyelesaian (Completion Rate)</span>
              <p className="text-2xl font-bold text-emerald-400">{summary.completedRate}%</p>
              <p className="text-[10px] text-slate-500">
                {summary.completedRate >= 90 ? 'Performa Sangat Baik' : 'Evaluasi Rasio Pembatalan'}
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-xs space-y-1">
              <span className="text-slate-400">Gross Omset Perjalanan</span>
              <p className="text-2xl font-bold text-cyan-400">{formatIDR(summary.totalVolumeIdr)}</p>
              <p className="text-[10px] text-slate-500">Omset transaksi selesai</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-xs space-y-1">
              <span className="text-slate-400">Rata-rata Jarak Tempuh</span>
              <p className="text-2xl font-bold text-amber-400">{summary.averageTripDistanceKm} KM</p>
              <p className="text-[10px] text-slate-500">Radius Banjarmasin &amp; Sekitarnya</p>
            </div>
          </div>

          {/* Hourly Demand Histogram */}
          {summary.hourlyTrends.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Fluktuasi Permintaan Trip per Jam (WITA)</h3>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                  Waktu Indonesia Tengah
                </span>
              </div>

              <div className="space-y-2.5 pt-2">
                {summary.hourlyTrends.map((slot, idx) => {
                  const maxTrips = Math.max(...summary.hourlyTrends.map(t => t.trips), 1);
                  const percent = Math.round((slot.trips / maxTrips) * 100);

                  return (
                    <div key={idx} className="flex items-center gap-3 text-xs">
                      <span className="font-mono text-slate-400 w-12 text-[11px]">{slot.hour}</span>
                      <div className="flex-1 bg-slate-950 h-5 rounded-lg overflow-hidden p-0.5 border border-slate-800">
                        <div 
                          className={`h-full rounded-md transition-all ${
                            percent > 80 ? 'bg-rose-500' : percent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(percent, 4)}%` }}
                        ></div>
                      </div>
                      <span className="font-bold text-white w-14 text-right font-mono text-[11px]">
                        {slot.trips} trip
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Service Type Breakdown Grid */}
          {summary.serviceBreakdown.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Distribusi Pendapatan &amp; Armada per Layanan</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {summary.serviceBreakdown.map((srv, idx) => {
                  const Icon = getServiceIcon(srv.service);
                  const share = summary.totalOrders > 0 ? Math.round((srv.count / summary.totalOrders) * 100) : 0;

                  return (
                    <div key={idx} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{getServiceLabel(srv.service)}</span>
                        <Icon className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-bold text-white">
                          {srv.count} <span className="text-xs font-normal text-slate-400">trip</span>
                        </span>
                        <span className="text-emerald-400 font-bold">{share}%</span>
                      </div>
                      <div className="pt-2 border-t border-slate-800 text-slate-400 text-[11px]">
                        Omset: <strong className="text-slate-200">{formatIDR(srv.volumeIdr)}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};
