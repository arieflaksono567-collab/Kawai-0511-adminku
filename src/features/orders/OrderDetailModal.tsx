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
    { label: 'Driver Ditugaskan', time: order.status !== 'pending' ? 'Terkonfirmasi' : '-', done: order.status !== 'pending' },
    { label: 'Dalam Perjalanan', time: order.status === 'in_progress' || order.status === 'completed' ? 'Aktif' : '-', done: order.status === 'in_progress' || order.status === 'completed' },
    { label: 'Pesanan Selesai', time: order.status === 'completed' ? 'Selesai' : '-', done: order.status === 'completed' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl text-xs space-y-5 text-slate-300 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Car className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Rincian Pesanan: <span className="font-mono text-emerald-400">{order.order_number}</span>
              </h3>
              <p className="text-[11px] text-slate-400">ID Sistem: {order.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* State Machine Timeline */}
        <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Riwayat Alur Status (State Machine)</p>
          <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
            {statusHistory.map((step, idx) => (
              <div key={idx} className="space-y-1">
                <div className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center font-bold ${
                  step.done ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                }`}>
                  {step.done ? '✓' : idx + 1}
                </div>
                <p className={step.done ? 'text-slate-200 font-semibold' : 'text-slate-500'}>{step.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Route Details */}
        <div className="space-y-2 bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800">
          <div className="flex items-start gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-1 shrink-0"></div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500">Titik Jemput (Origin)</p>
              <p className="text-slate-200 font-medium text-xs">{order.origin_address}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-400 mt-1 shrink-0"></div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500">Titik Tujuan (Destination)</p>
              <p className="text-slate-200 font-medium text-xs">{order.destination_address}</p>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex justify-between text-slate-400 text-[11px]">
            <span>Estimasi Jarak Tempuh:</span>
            <span className="font-mono font-bold text-white">{order.distance_km} KM</span>
          </div>
        </div>

        {/* Stakeholder Details */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
              <User className="w-3 h-3 text-emerald-400" /> Penumpang
            </span>
            <p className="font-bold text-slate-200">{order.customer_name}</p>
            <p className="text-slate-400 text-[11px] font-mono flex items-center gap-1">
              <Phone className="w-3 h-3" /> {order.customer_phone}
            </p>
          </div>

          <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
              <Car className="w-3 h-3 text-blue-400" /> Mitra Pengemudi
            </span>
            <p className="font-bold text-slate-200">{order.driver_name || 'Belum ditugaskan'}</p>
            <p className="text-slate-400 text-[11px]">
              ID Driver: <span className="font-mono text-slate-300">{order.driver_id || '-'}</span>
            </p>
          </div>
        </div>

        {/* Financial Transparency */}
        <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
            <CreditCard className="w-3 h-3 text-amber-400" /> Rincian Finansial &amp; Komisi
          </span>
          <div className="flex justify-between text-slate-300">
            <span>Total Tarif Pembayaran:</span>
            <span className="font-bold text-white font-mono">{formatIDR(order.fare_amount)}</span>
          </div>
          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>Komisi Platform KAWAI:</span>
            <span className="font-mono text-slate-300">{formatIDR(order.platform_fee)}</span>
          </div>
          <div className="flex justify-between text-emerald-400 font-semibold pt-1 border-t border-slate-800">
            <span>Pendapatan Bersih Driver:</span>
            <span className="font-mono">{formatIDR(order.driver_net)}</span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 pt-1">
            <span>Metode: <strong className="uppercase text-slate-300">{order.payment_method}</strong></span>
            <span>Status Bayar: <strong className="capitalize text-emerald-400">{order.payment_status}</strong></span>
          </div>
        </div>

        {/* Cancellation Reason if applicable */}
        {order.cancellation_reason && (
          <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
            <strong>Catatan Pembatalan:</strong> {order.cancellation_reason}
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-medium"
          >
            Tutup
          </button>

          <div className="flex gap-2">
            {order.status === 'in_progress' && (
              <button
                onClick={() => {
                  onUpdateStatus(order.id, 'completed');
                  onClose();
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl shadow"
              >
                Tandai Selesai
              </button>
            )}

            {(order.status === 'pending' || order.status === 'assigned') && (
              <button
                onClick={() => {
                  onUpdateStatus(order.id, 'cancelled', 'Dibatalkan oleh dispatcher');
                  onClose();
                }}
                className="px-4 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/30 font-medium rounded-xl"
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
