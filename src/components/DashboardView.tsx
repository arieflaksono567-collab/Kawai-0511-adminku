import React from 'react';
import { 
  Users, 
  Car, 
  TrendingUp, 
  DollarSign, 
  AlertCircle, 
  Clock, 
  MapPin, 
  CheckCircle,
  ArrowUpRight,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { Driver, Order, DashboardMetrics } from '../types/database';

interface DashboardViewProps {
  drivers: Driver[];
  orders: Order[];
  onSelectTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  drivers, 
  orders, 
  onSelectTab 
}) => {
  const activeDrivers = drivers.filter(d => d.status === 'active');
  const pendingVerifications = drivers.filter(d => d.status === 'pending_verification');
  const activeOrders = orders.filter(o => o.status === 'in_progress' || o.status === 'assigned');
  const completedOrders = orders.filter(o => o.status === 'completed');

  const grossRevenue = completedOrders.reduce((acc, curr) => acc + curr.fare_amount, 0) + 
    activeOrders.reduce((acc, curr) => acc + curr.fare_amount, 0);

  const platformNet = completedOrders.reduce((acc, curr) => acc + curr.platform_fee, 0);

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Live Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Pusat Komando Operasional 0511 Banjarmasin
          </div>
          <h2 className="text-xl font-bold text-white">Monitoring Live Armada & Dispatch</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Sistem pengawasan terpadu untuk armada ojek & mobil KAWAI 0511 di wilayah Banjarmasin dan sekitarnya. Terintegrasi ke Supabase DB dengan perlindungan RLS.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectTab('orders')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5"
          >
            <Car className="w-3.5 h-3.5" />
            Dispatch Trip Baru
          </button>
          <button
            onClick={() => onSelectTab('drivers')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl border border-slate-700 transition-colors"
          >
            Kelola Driver ({drivers.length})
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Drivers */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Driver On-Duty</span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">{activeDrivers.length}</span>
            <span className="text-[11px] text-emerald-400 flex items-center font-medium">
              {Math.round((activeDrivers.length / (drivers.length || 1)) * 100)}% aktif
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total {drivers.length} mitra terdaftar</p>
        </div>

        {/* Active Trips */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Trip Sedang Berjalan</span>
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Car className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">{activeOrders.length}</span>
            <span className="text-[11px] text-amber-400 flex items-center font-medium">
              Live Dispatch
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{completedOrders.length} trip selesai hari ini</p>
        </div>

        {/* Gross Revenue Today */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Gross Omset Trip</span>
            <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-xl font-bold text-white">{formatIDR(grossRevenue)}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Estimasi kotor penumpang</p>
        </div>

        {/* Verifikasi Tertunda */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Verifikasi Berkas</span>
            <span className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">{pendingVerifications.length}</span>
            {pendingVerifications.length > 0 ? (
              <button 
                onClick={() => onSelectTab('drivers')}
                className="text-[11px] text-amber-400 underline font-medium hover:text-amber-300"
              >
                Review Dokumen
              </button>
            ) : (
              <span className="text-[11px] text-emerald-400 font-medium">Semua Clear</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">KTP, SIM, STNK, SKCK</p>
        </div>
      </div>

      {/* Main Grid: Live Order Dispatch & Radar Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Trip Activity Stream (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Live Stream Pesanan & Antrean</h3>
            </div>
            <button 
              onClick={() => onSelectTab('orders')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
            >
              Lihat Semua ({orders.length}) <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {orders.slice(0, 4).map((order) => {
              const statusColors = {
                pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                assigned: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                in_progress: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse',
                completed: 'bg-slate-700/30 text-slate-400 border-slate-700/40',
                cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
              };

              const serviceLabels = {
                ride_motor: 'KAWAI Motor',
                ride_car: 'KAWAI Mobil',
                delivery: 'KAWAI Kirim',
                food: 'KAWAI Kuliner',
              };

              return (
                <div 
                  key={order.id} 
                  className="bg-slate-800/40 border border-slate-700/40 hover:border-slate-600 rounded-xl p-3.5 transition-all text-xs"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-200">{order.order_number}</span>
                      <span className="bg-slate-800 text-slate-300 font-medium px-2 py-0.5 rounded text-[10px]">
                        {serviceLabels[order.service]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${statusColors[order.status]}`}>
                        {order.status === 'in_progress' ? 'Dalam Perjalanan' :
                         order.status === 'assigned' ? 'Driver Menuju Titik' :
                         order.status === 'pending' ? 'Mencari Driver' :
                         order.status === 'completed' ? 'Selesai' : 'Dibatalkan'}
                      </span>
                      <span className="font-bold text-emerald-400">{formatIDR(order.fare_amount)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 mt-2">
                    <div className="flex items-start gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0"></div>
                      <span className="text-slate-400 truncate">Jemput: <span className="text-slate-200">{order.origin_address}</span></span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-rose-400 mt-1 shrink-0"></div>
                      <span className="text-slate-400 truncate">Tujuan: <span className="text-slate-200">{order.destination_address}</span></span>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <div>
                      Pelanggan: <span className="text-slate-300 font-medium">{order.customer_name}</span> ({order.customer_phone})
                    </div>
                    <div>
                      Driver: <span className="text-slate-300 font-medium">{order.driver_name || 'Belum ditugaskan'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 0511 Fleet Radar / Banjarmasin Points (1 col) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Compass className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '8s' }} />
                <h3 className="text-sm font-bold text-white">Radar Titik Ramai 0511</h3>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">Banjarmasin</span>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Distribusi armada motor & mobil aktif di titik strategis Kota Seribu Sungai:
            </p>

            <div className="space-y-2.5 text-xs">
              {[
                { name: 'Siring Menara Pandang & Pierre Tendean', drivers: 8, demand: 'Tinggi', surge: '1.0x' },
                { name: 'Duta Mall & Koridor A. Yani KM 2', drivers: 12, demand: 'Sangat Tinggi', surge: '1.2x' },
                { name: 'Kayu Tangi & Kampus ULM', drivers: 7, demand: 'Normal', surge: '1.0x' },
                { name: 'RSUD Ulin & Veteran', drivers: 5, demand: 'Tinggi', surge: '1.1x' },
                { name: 'Kertak Hanyar & Gambut (A. Yani KM 7-11)', drivers: 4, demand: 'Sedang', surge: '1.0x' },
              ].map((loc, idx) => (
                <div key={idx} className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-200">{loc.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Demand: <span className={loc.demand === 'Sangat Tinggi' ? 'text-rose-400 font-bold' : loc.demand === 'Tinggi' ? 'text-amber-400 font-bold' : 'text-emerald-400'}>{loc.demand}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-400">{loc.drivers} Unit</p>
                    <span className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.2 rounded border border-slate-800 font-mono">
                      Surge {loc.surge}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> RLS Supabase Aktif
            </span>
            <button
              onClick={() => onSelectTab('zones')}
              className="text-emerald-400 hover:underline font-medium"
            >
              Atur Tarif Wilayah &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
