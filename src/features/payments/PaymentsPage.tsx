import React, { useState } from 'react';
import { CreditCard, Search, ArrowUpRight, CheckCircle2, Clock, AlertCircle, Download, DollarSign } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { api } from '../../lib/api';
import { useAuth } from '../auth/AuthContext';
import { PaymentRow, PaymentUiStatus, summarizePayments, toPaymentRow } from './paymentModel';

const DEMO_TRANSACTIONS: PaymentRow[] = [
  { id: 'TXN-DEMO-001', order_id: null, order_number: 'KAW-DEMO-001', customer_label: 'Budi Santoso', amount: 18000, fee: 2700, payment_method: 'QRIS', payment_status: 'paid', created_at: '2025-04-20T10:24:00Z' },
  { id: 'TXN-DEMO-002', order_id: null, order_number: 'KAW-DEMO-002', customer_label: 'Siti Rahayu', amount: 45000, fee: 6750, payment_method: 'Dompet KAWAI Pay', payment_status: 'paid', created_at: '2025-04-20T10:18:00Z' },
  { id: 'TXN-DEMO-003', order_id: null, order_number: 'KAW-DEMO-003', customer_label: 'Ahmad Fauzi', amount: 22000, fee: 3300, payment_method: 'Tunai (Cash)', payment_status: 'pending', created_at: '2025-04-20T09:56:00Z' },
];

export const PaymentsPage: React.FC = () => {
  const { can } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentUiStatus>('all');
  const [transactions, setTransactions] = useState<PaymentRow[]>(isSupabaseConfigured ? [] : DEMO_TRANSACTIONS);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setIsLoading(true);
    const res = await api.getPaymentTransactions();
    setIsLoading(false);
    if (res.error) { setError(res.error); return; }
    setError(null);
    setTransactions(res.data.map(toPaymentRow));
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleConfirm = async (row: PaymentRow) => {
    if (!can('payment.confirm')) { setError('Peran Anda tidak memiliki izin untuk mengonfirmasi pembayaran.'); return; }
    setBusyId(row.id);
    const res = await api.confirmPayment(row.id);
    setBusyId(null);
    if (res.error) { setError(res.error); return; }
    setTransactions(prev => prev.map(t => t.id === row.id ? toPaymentRow(res.data) : t));
    void api.logAudit('CONFIRM_PAYMENT', 'payment_transaction', row.id, { order_id: row.order_id, amount_idr: row.amount });
  };

  const summary = summarizePayments(transactions);

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
  };

  const filtered = transactions.filter((t) => {
    const matchesSearch = 
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customer_label.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-red-600" />
            Manajemen Pembayaran &amp; Transaksi
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Rekonsiliasi transaksi pelanggan, komisi platform, QRIS, dan saldo dompet mitra KAWAI 0511.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200 font-mono">
            {isSupabaseConfigured ? 'Terkoneksi ke payment_transactions' : 'Dataset Evaluasi'}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-semibold">Tutup</button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total Volume Transaksi</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{formatIDR(summary.volume)}</h3>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">{summary.count} transaksi, {summary.pendingCount} menunggu konfirmasi</p>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Pendapatan Komisi KAWAI</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{formatIDR(summary.fee)}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Estimasi 15% dari transaksi lunas</p>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Metode QRIS &amp; E-Wallet</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{summary.nonCashPct}%</h3>
          <p className="text-[11px] text-slate-400 mt-1">Porsi transaksi non-tunai</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-100 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari ID transaksi, no pesanan, nama pelanggan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-400"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Status Pembayaran:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="paid">Lunas (Paid)</option>
            <option value="pending">Menunggu (Pending)</option>
            <option value="refunded">Dikembalikan (Refunded)</option>
            <option value="failed">Gagal (Failed)</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100 font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">ID Transaksi</th>
                <th className="py-3 px-4">No. Pesanan</th>
                <th className="py-3 px-4">Pelanggan</th>
                <th className="py-3 px-4">Metode Pembayaran</th>
                <th className="py-3 px-4">Nominal Trip</th>
                <th className="py-3 px-4">Komisi Platform</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-800">{t.id}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{t.order_number}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">{t.customer_label}</td>
                  <td className="py-3.5 px-4 text-slate-600">{t.payment_method}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{formatIDR(t.amount)}</td>
                  <td className="py-3.5 px-4 font-medium text-red-600">{formatIDR(t.fee)}</td>
                  <td className="py-3.5 px-4">
                    {t.payment_status === 'paid' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Lunas
                      </span>
                    )}
                    {t.payment_status === 'pending' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Menunggu
                      </span>
                    )}
                    {t.payment_status === 'refunded' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Refund
                      </span>
                    )}
                    {t.payment_status === 'failed' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        Gagal
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono">{formatDate(t.created_at)}</td>
                  <td className="py-3.5 px-4">
                    {t.payment_status === 'pending' && isSupabaseConfigured && can('payment.confirm') && (
                      <button
                        onClick={() => handleConfirm(t)}
                        disabled={busyId === t.id}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold rounded-lg text-[11px]"
                      >
                        {busyId === t.id ? 'Memproses...' : 'Konfirmasi Lunas'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">Belum ada transaksi.</td>
                </tr>
              )}
              {isLoading && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">Memuat transaksi...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
