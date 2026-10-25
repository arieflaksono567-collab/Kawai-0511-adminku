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
  ArrowRight,
  Package
} from 'lucide-react';
import { Order, Driver, OrderStatus } from '../types/database';
import {
  ACTIVE_DRIVER_STATUSES,
  canAssignDriver,
  isDriverAssignable,
  nextStatusActions,
  normalizeOrderStatus,
} from '../../shared/orderLifecycle';

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

  // Driver yang boleh ditugaskan: terverifikasi dan tidak sedang menangani order aktif
  const busyDriverIds = new Set(
    orders
      .filter(o => o.driver_id && ACTIVE_DRIVER_STATUSES.includes(normalizeOrderStatus(o.status) as any))
      .map(o => o.driver_id as string)
  );
  const activeDrivers = drivers.filter(d =>
    isDriverAssignable(d) && !busyDriverIds.has(d.user_id || d.id) && !busyDriverIds.has(d.id)
  );

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.origin_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.destination_address.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || normalizeOrderStatus(order.status) === statusFilter;
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
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-red-600" />
            Manajemen Pesanan &amp; Live Dispatch (0511)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pantau arus trip real-time, lakukan intervensi dispatch manual, verifikasi pembayaran, dan tangani komplain trip.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs bg-slate-50 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 font-mono">
            Total Trip: <span className="font-bold text-red-600">{orders.length}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-100 p-3.5 rounded-xl shadow-2xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode pesanan, nama penumpang, lokasi penjemputan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-400"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Status Trip:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="searching">Mencari Driver (Searching)</option>
            <option value="assigned">Driver Ditugaskan (Assigned)</option>
            <option value="arrived">Driver Tiba (Arrived)</option>
            <option value="in_trip">Dalam Perjalanan (In-Trip)</option>
            <option value="completed">Selesai (Completed)</option>
            <option value="cancelled">Dibatalkan (Cancelled)</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="grid grid-cols-1 gap-3.5">
        {filteredOrders.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-400 text-xs shadow-sm">
            Tidak ada pesanan yang sesuai dengan filter.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const statusBadgeClasses: Record<string, string> = {
              pending: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse',
              searching: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse',
              assigned: 'bg-teal-50 text-teal-700 border-teal-200',
              arrived: 'bg-indigo-50 text-indigo-700 border-indigo-200',
              in_trip: 'bg-amber-50 text-amber-700 border-amber-200 font-bold',
              in_progress: 'bg-amber-50 text-amber-700 border-amber-200 font-bold',
              completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
            };

            const statusText: Record<string, string> = {
              pending: 'Mencari Driver',
              searching: 'Mencari Driver',
              assigned: 'Driver Ditugaskan',
              arrived: 'Driver Tiba',
              in_trip: 'Sedang Mengantar',
              in_progress: 'Sedang Mengantar',
              completed: 'Trip Selesai',
              cancelled: 'Dibatalkan',
            };

            return (
              <div
                key={order.id}
                className="bg-white border border-slate-100 hover:border-slate-200 hover:shadow-md rounded-2xl p-4.5 transition-all shadow-sm text-xs space-y-3"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">{order.order_number}</span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-medium text-[11px]">
                      {order.service === 'ride_motor' ? 'KAWAI Motor' :
                       order.service === 'ride_car' ? 'KAWAI Mobil' :
                       order.service === 'food' ? 'KAWAI Kuliner' : 'KAWAI Kurir'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${statusBadgeClasses[order.status]}`}>
                      {statusText[order.status]}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-base font-extrabold text-slate-900">{formatIDR(order.fare_amount)}</span>
                      <p className="text-[10px] text-slate-400">
                        Metode: <span className="uppercase text-slate-600 font-semibold">{order.payment_method}</span> ({order.payment_status})
                      </p>
                    </div>
                  </div>
                </div>

                {/* Route & Customer row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">Penjemputan</p>
                        <p className="text-slate-800 font-medium">{order.origin_address}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">Tujuan Pengantaran</p>
                        <p className="text-slate-800 font-medium">{order.destination_address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-slate-200/60 md:pl-3 pt-2 md:pt-0">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Jarak Tempuh:</span>
                      <span className="text-slate-900 font-bold font-mono">{order.distance_km} KM</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Penumpang:</span>
                      <span className="text-slate-800 font-medium">{order.customer_name} ({order.customer_phone})</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Mitra Driver:</span>
                      <span className="text-slate-800 font-semibold text-red-600">
                        {order.driver_name || 'Belum ada driver'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions & Financial Split */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
                  <div className="flex items-center gap-3">
                    <span>Komisi Platform: <strong className="text-slate-800">{formatIDR(order.platform_fee)}</strong></span>
                    <span>Pendapatan Mitra: <strong className="text-emerald-600">{formatIDR(order.driver_net)}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    {onSelectOrder && (
                      <button
                        onClick={() => onSelectOrder(order)}
                        className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors font-medium text-[11px]"
                      >
                        Rincian
                      </button>
                    )}

                    {canAssignDriver(order.status) && (
                      <button
                        onClick={() => {
                          setSelectedOrderForAssign(order);
                          setSelectedDriverId(activeDrivers[0]?.id || '');
                        }}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm shadow-red-500/20"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        {normalizeOrderStatus(order.status) === 'assigned' ? 'Ganti Driver' : 'Tugaskan Driver Manual'}
                      </button>
                    )}

                    {nextStatusActions(order.status).map((action) => (
                      <button
                        key={action.to}
                        onClick={() => onUpdateOrderStatus(
                          order.id,
                          action.to,
                          action.to === 'cancelled' ? 'Dibatalkan oleh dispatcher admin' : undefined,
                        )}
                        className={
                          action.tone === 'success'
                            ? 'px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors'
                            : action.tone === 'danger'
                            ? 'px-3 py-1 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 rounded-lg transition-colors'
                            : action.tone === 'neutral'
                            ? 'px-3 py-1 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg transition-colors'
                            : 'px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors'
                        }
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Dispatch Modal */}
      {selectedOrderForAssign && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-red-600" />
                Intervensi Dispatch Manual
              </h3>
              <button 
                onClick={() => setSelectedOrderForAssign(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-600">
              Pilih driver aktif terdekat di Kota Banjarmasin untuk pesanan <strong className="text-slate-900 font-mono">{selectedOrderForAssign.order_number}</strong>:
            </p>

            <div className="space-y-2">
              <label className="block text-slate-600 font-semibold">Driver Aktif Tersedia:</label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-red-500"
              >
                {activeDrivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.full_name} — {driver.plate_number} ({driver.vehicle_type === 'motor' ? 'Motor' : 'Mobil'}, ★ {driver.rating.toFixed(1)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedOrderForAssign(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmAssign}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-sm"
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
