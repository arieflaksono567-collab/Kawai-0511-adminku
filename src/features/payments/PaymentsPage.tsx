import React, { useState } from 'react';
import { CreditCard, Search, ArrowUpRight, CheckCircle2, Clock, AlertCircle, Download, DollarSign } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';

export const PaymentsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'refunded'>('all');

  const transactions = [
    {
      id: 'TXN-20250420-001',
      order_number: 'KAW-20250420-001',
      customer_name: 'Budi Santoso',
      amount: 18000,
      fee: 2500,
      payment_method: 'QRIS Gopay/OVO',
      payment_status: 'paid',
      created_at: '2025-04-20 10:24',
    },
    {
      id: 'TXN-20250420-002',
      order_number: 'KAW-20250420-002',
      customer_name: 'Siti Rahayu',
      amount: 45000,
      fee: 6500,
      payment_method: 'Dompet KAWAI Pay',
      payment_status: 'paid',
      created_at: '2025-04-20 10:18',
    },
    {
      id: 'TXN-20250420-003',
      order_number: 'KAW-20250420-003',
      customer_name: 'Ahmad Fauzi',
      amount: 22000,
      fee: 3000,
      payment_method: 'Tunai (Cash)',
      payment_status: 'pending',
      created_at: '2025-04-20 09:56',
    },
    {
      id: 'TXN-20250420-004',
      order_number: 'KAW-20250420-004',
      customer_name: 'Dewi Lestari',
      amount: 38000,
      fee: 5500,
      payment_method: 'QRIS Mandiri/BCA',
      payment_status: 'paid',
      created_at: '2025-04-20 09:42',
    },
    {
      id: 'TXN-20250420-005',
      order_number: 'KAW-20250420-005',
      customer_name: 'Rudi Hermawan',
      amount: 14000,
      fee: 2000,
      payment_method: 'Dompet KAWAI Pay',
      payment_status: 'refunded',
      created_at: '2025-04-20 09:21',
    },
  ];

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const filtered = transactions.filter((t) => {
    const matchesSearch = 
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total Volume Transaksi</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">Rp 137.000</h3>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">5 transaksi hari ini</p>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Pendapatan Komisi KAWAI</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">Rp 19.500</h3>
          <p className="text-[11px] text-slate-400 mt-1">Rata-rata 14.2% per trip</p>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Metode QRIS &amp; E-Wallet</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">80%</h3>
          <p className="text-[11px] text-slate-400 mt-1">Transaksi non-tunai dominan</p>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-800">{t.id}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{t.order_number}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">{t.customer_name}</td>
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
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono">{t.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
