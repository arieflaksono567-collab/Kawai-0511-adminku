// ==============================================================================
// KAWAI 0511 — Peta hak akses per peran (RBAC)
//
// Satu sumber kebenaran untuk:
//   - menu & halaman panel (TAB_ACCESS)
//   - tombol aksi di panel (ACTION_ACCESS)
//   - policy RLS database (DB_PERMISSIONS) → harus sama dengan migrasi
//     supabase/migrations/20261026000001_rbac_per_role.sql (dicek oleh tes)
//
// superadmin & admin selalu punya akses penuh dan tidak perlu dicantumkan.
// ==============================================================================

export type StaffRole = 'superadmin' | 'admin' | 'dispatcher' | 'finance' | 'support';
export type LimitedRole = 'dispatcher' | 'finance' | 'support';

export const STAFF_ROLES: readonly StaffRole[] = ['superadmin', 'admin', 'dispatcher', 'finance', 'support'];
export const FULL_ACCESS_ROLES: readonly StaffRole[] = ['superadmin', 'admin'];
export const LIMITED_ROLES: readonly LimitedRole[] = ['dispatcher', 'finance', 'support'];

export const ROLE_LABELS: Record<StaffRole, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  dispatcher: 'Dispatcher',
  finance: 'Finance',
  support: 'Support',
};

// ------------------------------------------------------------------------------
// Halaman panel
// ------------------------------------------------------------------------------
export const TAB_ACCESS: Record<string, readonly LimitedRole[]> = {
  dashboard: ['dispatcher', 'finance', 'support'],
  profile: ['dispatcher', 'finance', 'support'],
  orders: ['dispatcher', 'finance', 'support'],
  users: ['dispatcher', 'finance', 'support'],
  drivers: ['dispatcher', 'finance', 'support'],
  zones: ['dispatcher', 'finance'],
  payments: ['finance'],
  services: ['finance'],
  support: ['support'],
  analytics: ['dispatcher', 'finance'],
  security: [], // Audit log: hanya superadmin/admin
  settings: [], // Pengaturan sistem: hanya superadmin/admin
  deployment: [],
  forbidden: ['dispatcher', 'finance', 'support'],
  not_found: ['dispatcher', 'finance', 'support'],
};

// ------------------------------------------------------------------------------
// Aksi di panel
// ------------------------------------------------------------------------------
export const ACTION_ACCESS = {
  'order.assign_driver': ['dispatcher'],
  'order.update_status': ['dispatcher'],
  'user.update_status': [], // suspend/aktifkan pengguna: hanya superadmin/admin
  'driver.update_status': ['dispatcher'],
  'driver.approve_documents': ['dispatcher'],
  'driver.create': ['dispatcher'],
  'zone.update': ['dispatcher', 'finance'],
  'settings.update': [],
} as const satisfies Record<string, readonly LimitedRole[]>;

export type StaffAction = keyof typeof ACTION_ACCESS;

const isFullAccess = (role: string | null | undefined) =>
  FULL_ACCESS_ROLES.includes(role as StaffRole);

export function canAccessTab(role: string | null | undefined, tab: string): boolean {
  if (!STAFF_ROLES.includes(role as StaffRole)) return false;
  if (isFullAccess(role)) return true;
  return (TAB_ACCESS[tab] ?? []).includes(role as LimitedRole);
}

export function canPerform(role: string | null | undefined, action: StaffAction): boolean {
  if (!STAFF_ROLES.includes(role as StaffRole)) return false;
  if (isFullAccess(role)) return true;
  return (ACTION_ACCESS[action] as readonly LimitedRole[]).includes(role as LimitedRole);
}

export function rolesForTab(tab: string): StaffRole[] {
  return [...FULL_ACCESS_ROLES, ...(TAB_ACCESS[tab] ?? [])];
}

// ------------------------------------------------------------------------------
// Database (RLS) — operasi yang diizinkan untuk peran terbatas.
// DELETE tidak pernah diberikan ke peran terbatas.
// ------------------------------------------------------------------------------
export type DbOp = 'SELECT' | 'INSERT' | 'UPDATE';

export const DB_PERMISSIONS: Record<string, Partial<Record<DbOp, readonly LimitedRole[]>>> = {
  orders: { SELECT: ['dispatcher', 'finance', 'support'], UPDATE: ['dispatcher'] },
  order_status_history: { SELECT: ['dispatcher', 'finance', 'support'], INSERT: ['dispatcher'] },
  user_profiles: { SELECT: ['dispatcher', 'finance', 'support'] },
  driver_profiles: { SELECT: ['dispatcher', 'finance', 'support'], INSERT: ['dispatcher'], UPDATE: ['dispatcher'] },
  driver_documents: { SELECT: ['dispatcher', 'support'], UPDATE: ['dispatcher'] },
  service_zones: { SELECT: ['dispatcher', 'finance', 'support'], UPDATE: ['dispatcher', 'finance'] },
  tariff_rules: { INSERT: ['finance'], UPDATE: ['finance'] }, // SELECT: semua pengguna login
  service_types: { INSERT: ['finance'], UPDATE: ['finance'] }, // SELECT: semua pengguna login
  payment_transactions: { SELECT: ['finance'], INSERT: ['finance'], UPDATE: ['finance'] },
  support_tickets: { SELECT: ['support'], INSERT: ['support'], UPDATE: ['support'] },
  audit_logs: { INSERT: ['dispatcher', 'finance', 'support'] }, // membaca: hanya superadmin/admin
  admin_settings: {}, // hanya superadmin/admin
};

/**
 * Kolom yang tidak boleh diubah peran terbatas walaupun mereka boleh UPDATE
 * barisnya (dijaga trigger guard_limited_staff_columns).
 */
export const PROTECTED_COLUMNS: Record<string, readonly string[]> = {
  orders: [
    'customer_id', 'service_type_id', 'idempotency_key',
    'pickup_address', 'pickup_lat', 'pickup_lng',
    'dropoff_address', 'dropoff_lat', 'dropoff_lng',
    'estimated_distance_km', 'estimated_fare_idr', 'final_fare_idr',
    'tariff_version', 'calculation_details', 'created_at',
  ],
  driver_profiles: ['user_id', 'wallet_balance', 'rating', 'total_trips', 'created_at'],
};
