// ==============================================================================
// KAWAI 0511 — Alur status order (satu sumber kebenaran)
//
// Dipakai panel (tombol aksi), dan harus sama dengan trigger database
// supabase/migrations/20261026000002_order_lifecycle.sql (dicek oleh tes).
//
//   searching ──► assigned ──► arrived ──► in_trip ──► completed
//       │            │  ▲         │           │
//       │            │  └ (lepas driver → searching)
//       └────────────┴────────────┴───────────┴──► cancelled
// ==============================================================================

export const DB_ORDER_STATUSES = ['searching', 'assigned', 'arrived', 'in_trip', 'completed', 'cancelled'] as const;
export type DbOrderStatus = (typeof DB_ORDER_STATUSES)[number];

export const ORDER_TRANSITIONS: Record<DbOrderStatus, readonly DbOrderStatus[]> = {
  searching: ['assigned', 'cancelled'],
  assigned: ['arrived', 'in_trip', 'searching', 'cancelled'],
  arrived: ['in_trip', 'cancelled'],
  in_trip: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

/** Status yang wajib punya driver. */
export const STATUSES_REQUIRING_DRIVER: readonly DbOrderStatus[] = ['assigned', 'arrived', 'in_trip', 'completed'];
/** Status saat driver boleh ditugaskan / diganti. */
export const ASSIGNABLE_STATUSES: readonly DbOrderStatus[] = ['searching', 'assigned'];
/** Status order aktif (driver dianggap sibuk). */
export const ACTIVE_DRIVER_STATUSES: readonly DbOrderStatus[] = ['assigned', 'arrived', 'in_trip'];
/** Nilai verification_status driver yang boleh menerima order. */
export const ASSIGNABLE_DRIVER_VERIFICATION = ['approved', 'verified', 'active'] as const;

/** Menyamakan status lama di UI ('pending', 'in_progress') ke status database. */
export function normalizeOrderStatus(status: string | null | undefined): DbOrderStatus | null {
  if (status === 'pending') return 'searching';
  if (status === 'in_progress') return 'in_trip';
  return (DB_ORDER_STATUSES as readonly string[]).includes(status ?? '') ? (status as DbOrderStatus) : null;
}

export function canTransition(from: string | null | undefined, to: string | null | undefined): boolean {
  const f = normalizeOrderStatus(from);
  const t = normalizeOrderStatus(to);
  if (!f || !t) return false;
  return ORDER_TRANSITIONS[f].includes(t);
}

export function canAssignDriver(status: string | null | undefined): boolean {
  const s = normalizeOrderStatus(status);
  return s !== null && ASSIGNABLE_STATUSES.includes(s);
}

export function isDriverAssignable(driver: { verification_status?: string | null; status?: string | null } | null | undefined): boolean {
  if (!driver) return false;
  if (driver.verification_status) {
    return (ASSIGNABLE_DRIVER_VERIFICATION as readonly string[]).includes(driver.verification_status);
  }
  return driver.status === 'active';
}

export interface OrderAction {
  to: DbOrderStatus;
  label: string;
  tone: 'primary' | 'success' | 'neutral' | 'danger';
}

const ACTION_LABELS: Record<DbOrderStatus, Omit<OrderAction, 'to'>> = {
  searching: { label: 'Lepas Driver', tone: 'neutral' },
  assigned: { label: 'Tugaskan Driver', tone: 'primary' },
  arrived: { label: 'Driver Tiba', tone: 'primary' },
  in_trip: { label: 'Mulai Perjalanan', tone: 'primary' },
  completed: { label: 'Selesaikan Trip', tone: 'success' },
  cancelled: { label: 'Batalkan Trip', tone: 'danger' },
};

/**
 * Tombol perubahan status yang ditampilkan untuk sebuah order.
 * 'assigned' tidak termasuk karena memakai dialog pilih driver.
 */
export function nextStatusActions(status: string | null | undefined): OrderAction[] {
  const s = normalizeOrderStatus(status);
  if (!s) return [];
  return ORDER_TRANSITIONS[s]
    .filter((to) => to !== 'assigned')
    .map((to) => ({ to, ...ACTION_LABELS[to] }));
}

/** Pesan ramah untuk galat dari trigger alur order. */
export function friendlyLifecycleError(message: string): string {
  if (/ORDER_INVALID_TRANSITION/.test(message)) return 'Perubahan status tidak diizinkan dari status order saat ini. Muat ulang data order.';
  if (/ORDER_DRIVER_REQUIRED/.test(message)) return 'Status ini membutuhkan driver yang sudah ditugaskan.';
  if (/ORDER_DRIVER_LOCKED/.test(message)) return 'Driver tidak bisa diganti setelah driver tiba atau perjalanan dimulai.';
  if (/DRIVER_NOT_ELIGIBLE/.test(message)) return 'Driver belum terverifikasi atau akunnya tidak aktif.';
  if (/DRIVER_BUSY/.test(message)) return 'Driver sedang menangani order lain.';
  return message;
}
