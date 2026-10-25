// Tes regresi hak akses per peran.
//  1. Peta izin panel (shared/rbac.ts) — menu & aksi.
//  2. Tes database sungguhan (PGlite, PostgreSQL in-memory): migrasi
//     20261025000002 + 20261026000001 dijalankan pada skema tiruan mirip
//     produksi, lalu setiap peran × tabel × operasi dicoba langsung
//     terhadap RLS. Data seluruhnya sintetis.
import { test, before } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import {
  canAccessTab,
  canPerform,
  rolesForTab,
  ACTION_ACCESS,
  DB_PERMISSIONS,
  PROTECTED_COLUMNS,
  TAB_ACCESS,
  LIMITED_ROLES,
  type DbOp,
  type StaffAction,
} from '../../shared/rbac';

const ROOT = path.resolve(import.meta.dirname, '../..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ------------------------------------------------------------------------------
// 1. Peta izin panel
// ------------------------------------------------------------------------------
test('RBAC panel: superadmin & admin boleh semua halaman dan aksi', () => {
  for (const role of ['superadmin', 'admin']) {
    for (const tab of Object.keys(TAB_ACCESS)) assert.ok(canAccessTab(role, tab), `${role} → ${tab}`);
    for (const a of Object.keys(ACTION_ACCESS) as StaffAction[]) assert.ok(canPerform(role, a), `${role} → ${a}`);
  }
});

test('RBAC panel: peran non-staf dan nilai kosong selalu ditolak', () => {
  for (const role of ['customer', 'driver', '', null, undefined, 'SUPERADMIN']) {
    assert.equal(canAccessTab(role, 'dashboard'), false);
    assert.equal(canPerform(role, 'order.assign_driver'), false);
  }
});

test('RBAC panel: halaman per peran sesuai matriks', () => {
  const expect: Record<string, string[]> = {
    dispatcher: ['dashboard', 'orders', 'users', 'drivers', 'zones', 'analytics'],
    finance: ['dashboard', 'orders', 'users', 'drivers', 'zones', 'payments', 'services', 'analytics'],
    support: ['dashboard', 'orders', 'users', 'drivers', 'support'],
  };
  const menu = ['dashboard', 'orders', 'users', 'drivers', 'zones', 'payments', 'services', 'support', 'analytics', 'security', 'settings', 'deployment'];
  for (const [role, allowed] of Object.entries(expect)) {
    for (const tab of menu) {
      assert.equal(canAccessTab(role, tab), allowed.includes(tab), `${role} → ${tab}`);
    }
  }
  assert.equal(canAccessTab('dispatcher', 'halaman-tidak-dikenal'), false);
  assert.deepEqual(rolesForTab('security'), ['superadmin', 'admin']);
});

test('RBAC panel: aksi per peran sesuai matriks', () => {
  assert.ok(canPerform('dispatcher', 'order.assign_driver'));
  assert.ok(canPerform('dispatcher', 'driver.approve_documents'));
  assert.ok(canPerform('finance', 'zone.update'));
  assert.equal(canPerform('finance', 'order.assign_driver'), false);
  assert.equal(canPerform('support', 'order.update_status'), false);
  assert.equal(canPerform('support', 'driver.approve_documents'), false);
  for (const role of LIMITED_ROLES) {
    assert.equal(canPerform(role, 'user.update_status'), false, `${role} tidak boleh suspend pengguna`);
    assert.equal(canPerform(role, 'settings.update'), false);
  }
});

test('RBAC panel: Sidebar & App memakai peta izin bersama', () => {
  const sidebar = read('src/components/Sidebar.tsx');
  assert.ok(sidebar.includes('canAccess(item.id)'), 'Sidebar harus memfilter menu per peran');
  const app = read('src/App.tsx');
  assert.ok(app.includes('const tabAllowed = canAccess(currentTab)'));
  for (const a of ['user.update_status', 'driver.update_status', 'driver.approve_documents', 'driver.create',
                   'order.assign_driver', 'order.update_status', 'zone.update']) {
    assert.ok(app.includes(`denyUnless('${a}')`), `App harus menjaga aksi ${a}`);
  }
  assert.ok(!/\{currentTab === '/.test(app), 'Semua halaman harus melewati tabAllowed');
});

test('RBAC: matriks di migrasi SQL sama dengan shared/rbac.ts', () => {
  const sql = read('supabase/migrations/20261026000001_rbac_per_role.sql');
  const rows = [...sql.matchAll(/\('(\w+)',\s*'(SELECT|INSERT|UPDATE)',\s*ARRAY\[([^\]]*)\]\)/g)];
  const fromSql: Record<string, Record<string, string[]>> = {};
  for (const [, tbl, op, roles] of rows) {
    (fromSql[tbl] ??= {})[op] = roles.split(',').map(s => s.trim().replace(/'/g, '')).filter(Boolean);
  }
  for (const [tbl, ops] of Object.entries(DB_PERMISSIONS)) {
    if (tbl === 'audit_logs' || tbl === 'admin_settings') continue; // ditangani khusus
    assert.deepEqual(fromSql[tbl] ?? {}, ops, `matriks ${tbl}`);
  }
  for (const [tbl, cols] of Object.entries(PROTECTED_COLUMNS)) {
    for (const c of cols) assert.ok(sql.includes(`'${c}'`), `kolom terlindungi ${tbl}.${c} ada di trigger`);
  }
});

// ------------------------------------------------------------------------------
// 2. Tes database (RLS sungguhan)
// ------------------------------------------------------------------------------
const uid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const USERS = {
  superadmin: uid(1),
  admin: uid(2),
  dispatcher: uid(3),
  finance: uid(4),
  support: uid(5),
  customer: uid(6),
  suspended_dispatcher: uid(7),
  driver: uid(8),
  other: uid(9),
};
const ROW_ID = uid(100); // baris target milik "other"

const TABLES = [
  'user_profiles', 'orders', 'order_status_history', 'driver_profiles', 'driver_documents',
  'service_zones', 'tariff_rules', 'service_types', 'payment_transactions', 'support_tickets',
  'audit_logs', 'admin_settings',
];

const STUB_SCHEMA = `
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;

CREATE TABLE public.user_profiles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text, phone text,
  role text DEFAULT 'customer', status text DEFAULT 'active', is_active boolean DEFAULT true,
  is_admin boolean DEFAULT false, note text, updated_at timestamptz);
CREATE TABLE public.orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid, driver_id uuid,
  status text DEFAULT 'searching', estimated_fare_idr int, final_fare_idr int, pickup_address text,
  accepted_at timestamptz, note text, updated_at timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE public.order_status_history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid, status text, note text);
CREATE TABLE public.driver_profiles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid,
  verification_status text, wallet_balance int DEFAULT 0, rating numeric, note text, updated_at timestamptz);
CREATE TABLE public.driver_documents(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), driver_id uuid, status text, note text);
CREATE TABLE public.service_zones(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, is_active boolean, note text);
CREATE TABLE public.tariff_rules(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), service_type_id uuid, note text);
CREATE TABLE public.service_types(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, note text);
CREATE TABLE public.payment_transactions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, amount int, note text);
CREATE TABLE public.support_tickets(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, subject text, note text);
CREATE TABLE public.audit_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid, action text, note text);
CREATE TABLE public.admin_settings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text, note text);
CREATE VIEW public.admin_users AS SELECT id, phone, full_name, role, status FROM public.user_profiles WHERE role = 'admin';
CREATE VIEW public.operational_zones AS SELECT * FROM public.service_zones;

-- Kondisi lama di produksi: policy "Admins have full access" memakai is_admin()
CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[${TABLES.map(t => `'${t}'`).join(',')}] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated, service_role', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
                   'Admins have full access to ' || t, t);
  END LOOP;
END $$;
CREATE POLICY own_profile_select ON public.user_profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY own_profile_update ON public.user_profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY own_orders_select ON public.orders FOR SELECT TO authenticated USING (customer_id = auth.uid() OR driver_id = auth.uid());
GRANT SELECT ON public.admin_users, public.operational_zones TO anon, authenticated;
`;

let db: PGlite;

async function asUser<T = unknown>(user: string, sql: string, params: unknown[] = []):
  Promise<{ ok: true; rows: T[]; affected: number } | { ok: false; error: string }> {
  await db.exec('BEGIN');
  try {
    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [user]);
    await db.exec('SET LOCAL ROLE authenticated');
    const r = await db.query<T>(sql, params);
    return { ok: true, rows: r.rows, affected: r.affectedRows ?? r.rows.length };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  } finally {
    await db.exec('ROLLBACK');
  }
}

/** Apakah operasi berhasil memengaruhi/melihat baris target? */
async function attempt(user: string, table: string, op: DbOp | 'DELETE'): Promise<boolean> {
  const sql = {
    SELECT: `SELECT id FROM public.${table} WHERE id = '${ROW_ID}'`,
    // Tanpa RETURNING, sama seperti panel (RETURNING butuh izin SELECT).
    INSERT: `INSERT INTO public.${table} (note) VALUES ('rbac-test')`,
    UPDATE: `UPDATE public.${table} SET note = 'rbac-test' WHERE id = '${ROW_ID}' RETURNING id`,
    DELETE: `DELETE FROM public.${table} WHERE id = '${ROW_ID}' RETURNING id`,
  }[op];
  const r = await asUser(user, sql);
  return r.ok && (op === 'INSERT' ? r.affected > 0 : r.rows.length > 0);
}

before(async () => {
  db = new PGlite();
  await db.exec(STUB_SCHEMA);
  await db.exec(read('supabase/migrations/20261025000002_security_audit_fixes.sql'));
  await db.exec(read('supabase/migrations/20261026000001_rbac_per_role.sql'));

  const profiles: [string, string, string, boolean][] = [
    [USERS.superadmin, 'superadmin', 'active', true],
    [USERS.admin, 'admin', 'active', true],
    [USERS.dispatcher, 'dispatcher', 'active', true],
    [USERS.finance, 'finance', 'active', true],
    [USERS.support, 'support', 'active', true],
    [USERS.customer, 'customer', 'active', true],
    [USERS.suspended_dispatcher, 'dispatcher', 'suspended', false],
    [USERS.driver, 'driver', 'active', true],
    [USERS.other, 'customer', 'active', true],
  ];
  for (const [id, role, status, active] of profiles) {
    await db.query(`INSERT INTO public.user_profiles(id, role, status, is_active, full_name) VALUES ($1,$2,$3,$4,'Sintetis')`,
      [id, role, status, active]);
  }
  await db.query(`INSERT INTO public.user_profiles(id, role, full_name) VALUES ($1, 'customer', 'Target')`, [ROW_ID]);
  const seed: Record<string, string> = {
    orders: `INSERT INTO public.orders(id, customer_id, estimated_fare_idr, pickup_address) VALUES ('${ROW_ID}', '${USERS.other}', 15000, 'Siring')`,
    order_status_history: `INSERT INTO public.order_status_history(id, status) VALUES ('${ROW_ID}', 'searching')`,
    driver_profiles: `INSERT INTO public.driver_profiles(id, user_id, verification_status, wallet_balance) VALUES ('${ROW_ID}', '${USERS.other}', 'pending', 50000)`,
    driver_documents: `INSERT INTO public.driver_documents(id, status) VALUES ('${ROW_ID}', 'pending')`,
    service_zones: `INSERT INTO public.service_zones(id, name, is_active) VALUES ('${ROW_ID}', 'Banjarmasin', true)`,
    tariff_rules: `INSERT INTO public.tariff_rules(id) VALUES ('${ROW_ID}')`,
    service_types: `INSERT INTO public.service_types(id, name) VALUES ('${ROW_ID}', 'Motor')`,
    payment_transactions: `INSERT INTO public.payment_transactions(id, user_id, amount) VALUES ('${ROW_ID}', '${USERS.other}', 15000)`,
    support_tickets: `INSERT INTO public.support_tickets(id, user_id, subject) VALUES ('${ROW_ID}', '${USERS.other}', 'Tes')`,
    audit_logs: `INSERT INTO public.audit_logs(id, actor_id, action) VALUES ('${ROW_ID}', '${USERS.admin}', 'SEED')`,
    admin_settings: `INSERT INTO public.admin_settings(id, key) VALUES ('${ROW_ID}', 'maintenance')`,
  };
  for (const s of Object.values(seed)) await db.exec(s);
});

test('RLS: matriks peran × tabel × operasi', async () => {
  const failures: string[] = [];
  const PUBLIC_READ = new Set(['tariff_rules', 'service_types']); // dibaca semua pengguna login
  const testers = ['superadmin', 'admin', 'dispatcher', 'finance', 'support', 'customer', 'driver', 'suspended_dispatcher'] as const;

  for (const table of TABLES) {
    const perms = DB_PERMISSIONS[table] ?? {};
    for (const who of testers) {
      for (const op of ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] as const) {
        let expected: boolean;
        if (who === 'superadmin' || who === 'admin') expected = true;
        else if (op === 'SELECT' && PUBLIC_READ.has(table)) expected = true;
        else if (who === 'dispatcher' || who === 'finance' || who === 'support') {
          expected = op !== 'DELETE' && (perms[op as DbOp] ?? []).includes(who);
        } else expected = false;

        const got = await attempt(USERS[who], table, op);
        if (got !== expected) failures.push(`${who} ${op} ${table}: diharapkan ${expected}, hasil ${got}`);
      }
    }
  }
  assert.deepEqual(failures, []);
});

test('RLS: dispatcher boleh assign driver tapi tidak boleh mengubah tarif order', async () => {
  const ok = await asUser(USERS.dispatcher,
    `UPDATE public.orders SET driver_id = $1, status = 'assigned', accepted_at = now() WHERE id = $2 RETURNING status`,
    [USERS.driver, ROW_ID]);
  assert.ok(ok.ok && ok.rows.length === 1, JSON.stringify(ok));

  const fare = await asUser(USERS.dispatcher, `UPDATE public.orders SET estimated_fare_idr = 1 WHERE id = $1 RETURNING id`, [ROW_ID]);
  assert.equal(fare.ok, false);
  assert.match((fare as { error: string }).error, /tidak boleh mengubah kolom orders\.estimated_fare_idr/);

  const cust = await asUser(USERS.dispatcher, `UPDATE public.orders SET customer_id = $1 WHERE id = $2 RETURNING id`, [USERS.dispatcher, ROW_ID]);
  assert.equal(cust.ok, false);

  const admin = await asUser(USERS.admin, `UPDATE public.orders SET estimated_fare_idr = 20000 WHERE id = $1 RETURNING id`, [ROW_ID]);
  assert.ok(admin.ok && admin.rows.length === 1, 'admin tetap boleh koreksi tarif');
});

test('RLS: dispatcher boleh verifikasi driver tapi tidak boleh mengubah saldo', async () => {
  const ok = await asUser(USERS.dispatcher,
    `UPDATE public.driver_profiles SET verification_status = 'verified', updated_at = now() WHERE id = $1 RETURNING id`, [ROW_ID]);
  assert.ok(ok.ok && ok.rows.length === 1);
  const wallet = await asUser(USERS.dispatcher, `UPDATE public.driver_profiles SET wallet_balance = 9999999 WHERE id = $1 RETURNING id`, [ROW_ID]);
  assert.equal(wallet.ok, false);
});

test('RLS: hanya superadmin/admin yang bisa mengubah peran atau status pengguna', async () => {
  for (const who of ['dispatcher', 'finance', 'support'] as const) {
    const self = await asUser(USERS[who], `UPDATE public.user_profiles SET role = 'admin' WHERE id = $1 RETURNING id`, [USERS[who]]);
    assert.ok(!self.ok || self.rows.length === 0, `${who} tidak boleh menaikkan perannya sendiri`);
    const other = await asUser(USERS[who], `UPDATE public.user_profiles SET status = 'suspended' WHERE id = $1 RETURNING id`, [ROW_ID]);
    assert.ok(!other.ok || other.rows.length === 0, `${who} tidak boleh suspend pengguna`);
  }
  const admin = await asUser(USERS.admin, `UPDATE public.user_profiles SET status = 'suspended', is_active = false WHERE id = $1 RETURNING id`, [ROW_ID]);
  assert.ok(admin.ok && admin.rows.length === 1);
});

test('RLS: audit log dicatat atas nama sendiri dan hanya dibaca superadmin/admin', async () => {
  const own = await asUser(USERS.support, `INSERT INTO public.audit_logs(actor_id, action) VALUES ($1, 'VIEW')`, [USERS.support]);
  assert.ok(own.ok, JSON.stringify(own));
  const forged = await asUser(USERS.support, `INSERT INTO public.audit_logs(actor_id, action) VALUES ($1, 'FORGED')`, [USERS.admin]);
  assert.equal(forged.ok, false, 'tidak boleh memalsukan actor_id');
  const cust = await asUser(USERS.customer, `INSERT INTO public.audit_logs(actor_id, action) VALUES ($1, 'X')`, [USERS.customer]);
  assert.equal(cust.ok, false);
  for (const who of ['dispatcher', 'finance', 'support'] as const) {
    const r = await asUser(USERS[who], `SELECT count(*)::int AS n FROM public.audit_logs`);
    assert.ok(r.ok && (r.rows[0] as { n: number }).n === 0, `${who} tidak boleh membaca audit log`);
  }
});

test('RLS: fungsi bantu peran', async () => {
  const q = async (who: keyof typeof USERS) => {
    const r = await asUser(USERS[who],
      `SELECT public.is_admin() a, public.is_staff() s, public.has_staff_role(ARRAY['finance']) f`);
    assert.ok(r.ok);
    return r.rows[0];
  };
  assert.deepEqual(await q('superadmin'), { a: true, s: true, f: true });
  assert.deepEqual(await q('dispatcher'), { a: false, s: true, f: false });
  assert.deepEqual(await q('finance'), { a: false, s: true, f: true });
  assert.deepEqual(await q('suspended_dispatcher'), { a: false, s: false, f: false });
  assert.deepEqual(await q('customer'), { a: false, s: false, f: false });
});

test('Migrasi RBAC idempoten (aman dijalankan ulang)', async () => {
  await db.exec(read('supabase/migrations/20261026000001_rbac_per_role.sql'));
  const r = await db.query<{ n: number }>(`SELECT count(*)::int n FROM pg_policies WHERE policyname LIKE 'rbac\\_%'`);
  // 22 baris matriks + 1 policy audit_logs
  assert.equal(r.rows[0].n, 23);
});
