import React from 'react';
import { 
  X, 
  Car, 
  MapPin, 
  Phone, 
  User, 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ShieldCheck,
  FileText
} from 'lucide-react';
import { Order, OrderStatus } from '../../types/database';

interface OrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: OrderStatus, reason?: string) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  onClose,
  onUpdateStatus,
}) => {
  if (!order) return null;

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const statusHistory = [
    { label: 'Pesanan Dibuat', time: order.created_at, done: true },
    { label: 'Driver Ditugaskan', time: order.status !== 'pending' && order.status !== 'searching' ? 'Terkonfirmasi' : '-', done: order.status !== 'pending' && order.status !== 'searching' },
    { label: 'Dalam Perjalanan', time: order.status === 'in_progress' || order.status === 'in_trip' || order.status === 'completed' ? 'Aktif' : '-', done: order.status === 'in_progress' || order.status === 'in_trip' || order.status === 'completed' },
    { label: 'Pesanan Selesai', time: order.status === 'completed' ? 'Selesai' : '-', done: order.status === 'completed' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-xl p-6 shadow-2xl text-xs space-y-5 text-slate-700 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-100">
              <Car className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Rincian Pesanan: <span className="font-mono text-red-600">{order.order_number}</span>
              </h3>
              <p className="text-[11px] text-slate-400">ID Sistem: {order.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* State Machine Timeline */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-[10px] uppercase font-bold text-slate-500 mb-2.5">Alur Status Pesanan (State Machine)</p>
          <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
            {statusHistory.map((step, idx) => (
              <div key={idx} className="space-y-1">
                <div className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center font-bold text-xs ${
                  step.done ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {step.done ? '✓' : idx + 1}
                </div>
                <p className={step.done ? 'text-slate-800 font-semibold' : 'text-slate-400'}>{step.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Route Details */}
        <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
          <div className="flex items-start gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0"></div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Titik Jemput (Pickup)</p>
              <p className="text-slate-800 font-medium text-xs">{order.origin_address}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1 shrink-0"></div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Titik Tujuan (Dropoff)</p>
              <p className="text-slate-800 font-medium text-xs">{order.destination_address}</p>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-200/60 flex justify-between text-slate-600 text-[11px]">
            <span>Estimasi Jarak Tempuh:</span>
            <span className="font-mono font-bold text-slate-900">{order.distance_km} KM</span>
          </div>
        </div>

        {/* Stakeholder Details */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <User className="w-3 h-3 text-red-600" /> Penumpang
            </span>
            <p className="font-bold text-slate-900">{order.customer_name}</p>
            <p className="text-slate-500 text-[11px] font-mono flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-400" /> {order.customer_phone}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Car className="w-3 h-3 text-blue-600" /> Mitra Pengemudi
            </span>
            <p className="font-bold text-slate-900">{order.driver_name || 'Belum ditugaskan'}</p>
            <p className="text-slate-500 text-[11px]">
              ID Driver: <span className="font-mono text-slate-700">{order.driver_id ? `${order.driver_id.slice(0, 8)}...` : '-'}</span>
            </p>
          </div>
        </div>

        {/* Financial Transparency */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <CreditCard className="w-3 h-3 text-amber-500" /> Rincian Finansial &amp; Komisi
          </span>
          <div className="flex justify-between text-slate-700">
            <span>Total Tarif Pembayaran:</span>
            <span className="font-bold text-slate-900 font-mono">{formatIDR(order.fare_amount)}</span>
          </div>
          <div className="flex justify-between text-slate-500 text-[11px]">
            <span>Komisi Platform KAWAI (15%):</span>
            <span className="font-mono text-slate-700">{formatIDR(order.platform_fee)}</span>
          </div>
          <div className="flex justify-between text-emerald-700 font-semibold pt-1 border-t border-slate-200/60">
            <span>Pendapatan Bersih Mitra (85%):</span>
            <span className="font-mono">{formatIDR(order.driver_net)}</span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 pt-1">
            <span>Metode: <strong className="uppercase text-slate-800">{order.payment_method}</strong></span>
            <span>Status Bayar: <strong className="capitalize text-emerald-600">{order.payment_status}</strong></span>
          </div>
        </div>

        {/* Cancellation Reason if applicable */}
        {order.cancellation_reason && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
            <strong>Catatan Pembatalan / Status:</strong> {order.cancellation_reason}
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium cursor-pointer"
          >
            Tutup
          </button>

          <div className="flex gap-2">
            {(order.status === 'in_progress' || order.status === 'in_trip') && (
              <button
                onClick={() => {
                  onUpdateStatus(order.id, 'completed');
                  onClose();
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Tandai Selesai
              </button>
            )}

            {(order.status === 'pending' || order.status === 'searching' || order.status === 'assigned') && (
              <button
                onClick={() => {
                  onUpdateStatus(order.id, 'cancelled', 'Dibatalkan oleh dispatcher');
                  onClose();
                }}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-medium rounded-xl cursor-pointer"
              >
                Batalkan Trip
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
