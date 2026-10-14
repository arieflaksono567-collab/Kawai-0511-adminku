import React, { useState } from 'react';
import { 
  Car, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  MapPin, 
  CreditCard, 
  UserCheck,
  Send,
  ArrowRight
} from 'lucide-react';
import { Order, Driver, OrderStatus } from '../types/database';

interface OrdersViewProps {
  orders: Order[];
  drivers: Driver[];
  onAssignDriver: (orderId: string, driverId: string) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus, reason?: string) => void;
  onSelectOrder?: (order: Order) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  drivers,
  onAssignDriver,
  onUpdateOrderStatus,
  onSelectOrder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState<Order | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');

  const activeDrivers = drivers.filter(d => d.status === 'active');

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.driver_name && order.driver_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      order.origin_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.destination_address.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleConfirmAssign = () => {
    if (!selectedOrderForAssign || !selectedDriverId) return;
    onAssignDriver(selectedOrderForAssign.id, selectedDriverId);
    setSelectedOrderForAssign(null);
    setSelectedDriverId('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Car className="w-5 h-5 text-emerald-400" />
            Manajemen Pesanan & Live Dispatch (0511)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Pantau arus trip real-time, lakukan intervensi dispatch manual, verifikasi pembayaran, dan tangani komplain trip.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 font-mono">
            Total Trip: <span className="font-bold text-emerald-400">{orders.length}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode pesanan, nama penumpang, lokasi penjemputan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-950/60 border border-slate-700/80 rounded-lg px-2 py-1 text-xs">
          <span className="text-slate-400">Status Trip:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-slate-200 focus:outline-none font-medium text-xs cursor-pointer"
          >
            <option value="all" className="bg-slate-900">Semua Status</option>
            <option value="pending" className="bg-slate-900">Mencari Driver (Pending)</option>
            <option value="assigned" className="bg-slate-900">Driver Menuju Lokasi</option>
            <option value="in_progress" className="bg-slate-900">Sedang Diantar (In-Progress)</option>
            <option value="completed" className="bg-slate-900">Selesai</option>
            <option value="cancelled" className="bg-slate-900">Dibatalkan</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="grid grid-cols-1 gap-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
            Tidak ada pesanan yang sesuai dengan filter.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const statusBadgeClasses = {
              pending: 'bg-amber-950/80 text-amber-300 border-amber-500/30 animate-pulse',
              assigned: 'bg-blue-950/80 text-blue-300 border-blue-500/30',
              in_progress: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30 font-bold',
              completed: 'bg-slate-800 text-slate-400 border-slate-700',
              cancelled: 'bg-rose-950/80 text-rose-300 border-rose-500/30',
            };

            const statusText = {
              pending: 'Antrean / Mencari Driver',
              assigned: 'Driver Ditugaskan',
              in_progress: 'Sedang Mengantar',
              completed: 'Trip Selesai',
              cancelled: 'Dibatalkan',
            };

            return (
              <div
                key={order.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all shadow-sm text-xs space-y-3"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-sm">{order.order_number}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium text-[10px]">
                      {order.service === 'ride_motor' ? 'KAWAI Motor' :
                       order.service === 'ride_car' ? 'KAWAI Mobil' :
                       order.service === 'food' ? 'KAWAI Kuliner' : 'KAWAI Kirim'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${statusBadgeClasses[order.status]}`}>
                      {statusText[order.status]}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-base font-bold text-emerald-400">{formatIDR(order.fare_amount)}</span>
                      <p className="text-[10px] text-slate-500">
                        Metode: <span className="uppercase text-slate-300 font-semibold">{order.payment_method}</span> ({order.payment_status})
                      </p>
                    </div>
                  </div>
                </div>

                {/* Route & Customer row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-1 shrink-0"></div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">Penjemputan</p>
                        <p className="text-slate-200 font-medium">{order.origin_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-400 mt-1 shrink-0"></div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">Tujuan Pengantaran</p>
                        <p className="text-slate-200 font-medium">{order.destination_address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-slate-800/80 md:pl-3 pt-2 md:pt-0">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Jarak Tempuh:</span>
                      <span className="text-slate-200 font-bold font-mono">{order.distance_km} KM</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Penumpang:</span>
                      <span className="text-slate-200 font-medium">{order.customer_name} ({order.customer_phone})</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Mitra Driver:</span>
                      <span className="text-slate-200 font-semibold text-emerald-400">
                        {order.driver_name || 'Belum ada driver'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions & Financial Split */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
                  <div className="flex items-center gap-3">
                    <span>Komisi KAWAI: <strong className="text-slate-200">{formatIDR(order.platform_fee)}</strong></span>
                    <span>Bersih Driver: <strong className="text-emerald-400">{formatIDR(order.driver_net)}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    {onSelectOrder && (
                      <button
                        onClick={() => onSelectOrder(order)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors font-medium text-[10px]"
                      >
                        Rincian
                      </button>
                    )}

                    {order.status === 'pending' && (
                      <button
                        onClick={() => {
                          setSelectedOrderForAssign(order);
                          setSelectedDriverId(activeDrivers[0]?.id || '');
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg transition-colors flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Tugaskan Driver Manual
                      </button>
                    )}

                    {order.status === 'assigned' && (
                      <button
                        onClick={() => onUpdateOrderStatus(order.id, 'in_progress')}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                      >
                        Set In-Progress
                      </button>
                    )}

                    {order.status === 'in_progress' && (
                      <button
                        onClick={() => onUpdateOrderStatus(order.id, 'completed')}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg transition-colors"
                      >
                        Selesaikan Trip
                      </button>
                    )}

                    {(order.status === 'pending' || order.status === 'assigned') && (
                      <button
                        onClick={() => onUpdateOrderStatus(order.id, 'cancelled', 'Dibatalkan oleh dispatcher admin')}
                        className="px-3 py-1 bg-slate-800 hover:bg-rose-950 text-rose-300 border border-slate-700 hover:border-rose-500/30 rounded-lg transition-colors"
                      >
                        Batalkan Trip
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Dispatch Modal */}
      {selectedOrderForAssign && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                Intervensi Dispatch Manual
              </h3>
              <button 
                onClick={() => setSelectedOrderForAssign(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-300">
              Pilih driver aktif terdekat di Kota Banjarmasin untuk pesanan <strong className="text-white font-mono">{selectedOrderForAssign.order_number}</strong>:
            </p>

            <div className="space-y-2">
              <label className="block text-slate-400">Driver Aktif Tersedia:</label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
              >
                {activeDrivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.full_name} — {driver.plate_number} ({driver.vehicle_type === 'motor' ? 'Motor' : 'Mobil'}, ★ {driver.rating.toFixed(1)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedOrderForAssign(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmAssign}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl shadow"
              >
                Konfirmasi Tugaskan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
