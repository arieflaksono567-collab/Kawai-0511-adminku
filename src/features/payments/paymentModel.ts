// Model tampilan transaksi pembayaran (dipisah dari komponen agar bisa dites).
import type { DbPaymentTransaction } from '../../types/database';

export type PaymentUiStatus = 'paid' | 'pending' | 'refunded' | 'failed';

export interface PaymentRow {
  id: string;
  order_id: string | null;
  order_number: string;
  customer_label: string;
  amount: number;
  fee: number;
  payment_method: string;
  payment_status: PaymentUiStatus;
  created_at: string;
}

/** Komisi platform (estimasi, sama dengan perhitungan di daftar order). */
export const PLATFORM_FEE_RATE = 0.15;

const METHOD_LABELS: Record<string, string> = {
  cash: 'Tunai (Cash)',
  qris: 'QRIS',
  ewallet: 'E-Wallet',
  wallet: 'Dompet KAWAI Pay',
};

export function toPaymentStatus(status: string | null | undefined): PaymentUiStatus {
  if (status === 'success' || status === 'paid') return 'paid';
  if (status === 'refunded') return 'refunded';
  if (status === 'failed') return 'failed';
  return 'pending';
}

export function toPaymentRow(tx: DbPaymentTransaction): PaymentRow {
  const amount = Number(tx.amount_idr) || 0;
  return {
    id: tx.id,
    order_id: tx.order_id ?? null,
    order_number: tx.order_id ? `ORD-${tx.order_id.slice(0, 8).toUpperCase()}` : '-',
    customer_label: tx.user_id ? `Pelanggan (${tx.user_id.slice(0, 6)})` : '-',
    amount,
    fee: Math.round(amount * PLATFORM_FEE_RATE),
    payment_method: METHOD_LABELS[tx.method] || tx.method || '-',
    payment_status: toPaymentStatus(tx.status),
    created_at: tx.created_at,
  };
}

export function summarizePayments(rows: PaymentRow[]) {
  const settled = rows.filter((r) => r.payment_status === 'paid');
  const volume = settled.reduce((s, r) => s + r.amount, 0);
  const fee = settled.reduce((s, r) => s + r.fee, 0);
  const nonCash = rows.filter((r) => !/tunai|cash/i.test(r.payment_method)).length;
  return {
    count: rows.length,
    pendingCount: rows.filter((r) => r.payment_status === 'pending').length,
    volume,
    fee,
    nonCashPct: rows.length ? Math.round((nonCash / rows.length) * 100) : 0,
  };
}
