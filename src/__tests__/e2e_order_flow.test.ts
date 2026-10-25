// Tes END-TO-END alur order KAWAI 0511 (data sintetis, database uji in-memory).
//
//   pelanggan buat order (backend asli: shared/orderService.ts)
//   → dispatcher assign driver (panel asli: src/lib/api.ts)
//   → driver tiba → perjalanan → selesai
//   → pembayaran tercatat → finance konfirmasi lunas
//   + riwayat status, audit log, dan kasus gagal di setiap langkah.
//
// Skema tiruan mengikuti tipe produksi di src/types/database.ts, lalu migrasi
// 20261025000002 → 20261026000001 → 20261026000002 dijalankan berurutan.
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { createTestBackend, TEST_URL, TEST_ANON_KEY, TEST_SERVICE_KEY, userToken } from './helpers/testBackend';
import { handleCreateOrder, OrderEnv } from '../../shared/orderService';
import { setSupabaseClientForTesting } from '../lib/supabase';
import { api } from '../lib/api';
import {
  ORDER_TRANSITIONS,
  canTransition,
  nextStatusActions,
  normalizeOrderStatus,
  isDriverAssignable,
  DB_ORDER_STATUSES,
} from '../../shared/orderLifecycle';
import { toPaymentRow, summarizePayments } from '../features/payments/paymentModel';

const ROOT = path.resolve(import.meta.dirname, '../..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const U = {
  admin: uid(1),
  dispatcher: uid(2),
  finance: uid(3),
  support: uid(4),
  customer: uid(10),
  customer2: uid(11),
  driverOk: uid(20),
  driverOk2: uid(21),
  driverPending: uid(22),
  driverSuspended: uid(23),
};
const SERVICE_MOTOR = uid(100);

const STUB = `
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;

CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY, display_name text, phone text, avatar_url text,
  role text NOT NULL DEFAULT 'customer', status text NOT NULL DEFAULT 'active', is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.driver_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.user_profiles(id), vehicle_type text, vehicle_brand text, vehicle_model text,
  vehicle_plate text, verification_status text NOT NULL DEFAULT 'pending', is_online boolean NOT NULL DEFAULT false,
  current_lat double precision, current_lng double precision, last_location_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.service_types (
  id uuid PRIMARY KEY, code text, name text, description text, base_fare_idr int, fare_per_km_idr int, minimum_fare_idr int,
  is_active boolean DEFAULT true, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE public.service_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text, name text, city text, region text, boundary jsonb,
  is_active boolean DEFAULT true, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE public.tariff_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), service_type_id uuid REFERENCES public.service_types(id), name text,
  version int NOT NULL DEFAULT 1, status text NOT NULL DEFAULT 'draft', currency text DEFAULT 'IDR',
  base_fare_idr int NOT NULL, included_distance_km numeric DEFAULT 0, fare_per_km_idr int NOT NULL,
  minimum_fare_idr int NOT NULL, booking_fee_idr int DEFAULT 0,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.user_profiles(id),
  driver_id uuid REFERENCES public.driver_profiles(user_id),
  service_type_id uuid NOT NULL REFERENCES public.service_types(id),
  status text NOT NULL DEFAULT 'searching' CHECK (status IN ('searching','assigned','arrived','in_trip','completed','cancelled')),
  pickup_address text NOT NULL, pickup_lat double precision NOT NULL, pickup_lng double precision NOT NULL,
  dropoff_address text NOT NULL, dropoff_lat double precision NOT NULL, dropoff_lng double precision NOT NULL,
  notes text, estimated_distance_km numeric NOT NULL, estimated_fare_idr int NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(), accepted_at timestamptz, arrived_at timestamptz, started_at timestamptz,
  completed_at timestamptz, cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  tariff_version text, calculation_details jsonb);
CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.orders(id),
  old_status text, previous_status text, new_status text NOT NULL,
  changed_by uuid REFERENCES public.user_profiles(id), notes text, created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.orders(id),
  user_id uuid REFERENCES public.user_profiles(id), provider text NOT NULL DEFAULT 'cash', provider_reference text,
  method text NOT NULL DEFAULT 'cash', amount_idr int NOT NULL, status text NOT NULL DEFAULT 'pending',
  metadata jsonb, paid_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid, order_id uuid, subject text, category text,
  description text, status text DEFAULT 'open', priority text DEFAULT 'medium', assigned_to uuid, resolution text,
  created_at timestamptz DEFAULT now());
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid, action text NOT NULL, entity_type text, entity_id text,
  before_data jsonb, after_data jsonb, metadata jsonb, created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE public.admin_settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text, value jsonb);
CREATE VIEW public.admin_users AS SELECT id, phone, display_name, role, status FROM public.user_profiles WHERE role = 'admin';
CREATE VIEW public.operational_zones AS SELECT * FROM public.service_zones;

-- Kondisi produksi sebelum migrasi: policy admin penuh + policy pemilik
CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['user_profiles','driver_profiles','service_types','service_zones','tariff_rules','orders',
                           'order_status_history','payment_transactions','support_tickets','audit_logs','admin_settings'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated, service_role', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
                   'Admins have full access to ' || t, t);
  END LOOP;
END $$;
CREATE POLICY own_profile_select ON public.user_profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY own_orders_select ON public.orders FOR SELECT TO authenticated USING (customer_id = auth.uid() OR driver_id = auth.uid());
GRANT SELECT ON public.admin_users, public.operational_zones TO anon, authenticated;
`;

let db: PGlite;
let backend: ReturnType<typeof createTestBackend>;

const env: OrderEnv = {
  SUPABASE_URL: TEST_URL,
  SUPABASE_ANON_KEY: TEST_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: TEST_SERVICE_KEY,
  ROUTING_PROVIDER: 'osrm',
  OSRM_BASE_URL: 'http://osrm.test',
} as OrderEnv;

// Routing palsu: 5,2 km
const fakeOsrm: typeof fetch = async () =>
  new Response(JSON.stringify({ routes: [{ distance: 5200 }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });

const orderBody = {
  service_type_id: SERVICE_MOTOR,
  pickup_address: 'Menara Pandang Siring',
  dropoff_address: 'Duta Mall Banjarmasin',
  pickup_lat: -3.3194, pickup_lng: 114.5908,
  dropoff_lat: -3.3240, dropoff_lng: 114.5970,
};

const createOrder = (customer: string, idempotencyKey?: string, body: unknown = orderBody) =>
  handleCreateOrder({
    authHeader: `Bearer ${userToken(customer)}`,
    idempotencyKey: idempotencyKey ?? null,
    body,
    env,
    deps: { createClient: backend.createClientForServer, fetch: fakeOsrm },
  });

/** Bertindak di panel sebagai staf tertentu (klien Supabase asli + RLS). */
const asStaff = (who: string) => setSupabaseClientForTesting(backend.clientAs(who));

const orderRow = async (id: string) =>
  (await db.query<any>(`SELECT * FROM public.orders WHERE id = $1`, [id])).rows[0];
const history = async (id: string) =>
  (await db.query<any>(`SELECT old_status, new_status, changed_by FROM public.order_status_history WHERE order_id = $1 ORDER BY created_at`, [id])).rows;

before(async () => {
  db = new PGlite();
  backend = createTestBackend(db);
  await db.exec(STUB);
  for (const m of ['20261025000002_security_audit_fixes.sql', '20261026000001_rbac_per_role.sql', '20261026000002_order_lifecycle.sql']) {
    await db.exec(read(`supabase/migrations/${m}`));
  }
  const people: [string, string, string, boolean][] = [
    [U.admin, 'admin', 'active', true],
    [U.dispatcher, 'dispatcher', 'active', true],
    [U.finance, 'finance', 'active', true],
    [U.support, 'support', 'active', true],
    [U.customer, 'customer', 'active', true],
    [U.customer2, 'customer', 'active', true],
    [U.driverOk, 'driver', 'active', true],
    [U.driverOk2, 'driver', 'active', true],
    [U.driverPending, 'driver', 'active', true],
    [U.driverSuspended, 'driver', 'suspended', false],
  ];
  for (const [id, role, status, active] of people) {
    await db.query(`INSERT INTO public.user_profiles(id, role, status, is_active, display_name, phone) VALUES ($1,$2,$3,$4,'Uji Sintetis','08000000')`,
      [id, role, status, active]);
  }
  await db.query(`INSERT INTO public.driver_profiles(user_id, verification_status, vehicle_plate) VALUES
    ($1,'approved','DA 1001 AA'), ($2,'approved','DA 1002 AA'), ($3,'pending','DA 1003 AA'), ($4,'approved','DA 1004 AA')`,
    [U.driverOk, U.driverOk2, U.driverPending, U.driverSuspended]);
  await db.query(`INSERT INTO public.service_types(id, code, name) VALUES ($1, 'ride_motor', 'KAWAI Motor')`, [SERVICE_MOTOR]);
  await db.query(`INSERT INTO public.tariff_rules(service_type_id, name, version, status, base_fare_idr, included_distance_km, fare_per_km_idr, minimum_fare_idr, booking_fee_idr)
    VALUES ($1, 'Motor Banjarmasin', 3, 'active', 8000, 2, 2500, 10000, 0)`, [SERVICE_MOTOR]);
});

after(() => setSupabaseClientForTesting(null));

// ------------------------------------------------------------------------------
// Peta alur (frontend = database)
// ------------------------------------------------------------------------------
test('Alur status: peta di shared/orderLifecycle.ts sama dengan fungsi database', async () => {
  for (const from of DB_ORDER_STATUSES) {
    for (const to of DB_ORDER_STATUSES) {
      if (from === to) continue;
      const r = await db.query<{ ok: boolean }>(`SELECT public.order_transition_allowed($1, $2) AS ok`, [from, to]);
      assert.equal(r.rows[0].ok, ORDER_TRANSITIONS[from].includes(to), `${from} -> ${to}`);
    }
  }
  assert.equal(normalizeOrderStatus('pending'), 'searching');
  assert.equal(normalizeOrderStatus('in_progress'), 'in_trip');
  assert.ok(canTransition('pending', 'assigned'));
  assert.ok(!canTransition('completed', 'cancelled'));
  assert.deepEqual(nextStatusActions('searching').map(a => a.to), ['cancelled']);
  assert.deepEqual(nextStatusActions('in_trip').map(a => a.to), ['completed', 'cancelled']);
  assert.deepEqual(nextStatusActions('completed'), []);
  assert.ok(isDriverAssignable({ verification_status: 'approved' }));
  assert.ok(!isDriverAssignable({ verification_status: 'pending' }));
});

test('Panel: tombol order memakai status database (searching/in_trip), bukan pending/in_progress', () => {
  const view = read('src/components/OrdersView.tsx');
  assert.ok(view.includes('canAssignDriver(order.status)'));
  assert.ok(view.includes('nextStatusActions(order.status)'));
  assert.ok(!/order\.status === 'pending'/.test(view), 'tidak boleh lagi bergantung pada status pending');
  assert.ok(!/order\.status === 'in_progress'/.test(view), 'tidak boleh lagi bergantung pada status in_progress');
  assert.ok(view.includes('isDriverAssignable(d)'), 'pilihan driver hanya yang terverifikasi');
  const pay = read('src/features/payments/PaymentsPage.tsx');
  assert.ok(pay.includes('api.getPaymentTransactions()'), 'halaman pembayaran harus memuat data asli');
});

// ------------------------------------------------------------------------------
// Skenario utama
// ------------------------------------------------------------------------------
test('E2E: order dibuat → ditugaskan → tiba → perjalanan → selesai → dibayar', async () => {
  // 1. Pelanggan membuat order
  const created = await createOrder(U.customer, 'e2e-order-0001');
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const order = created.body as any;
  assert.equal(order.status, 'searching');
  assert.equal(order.customer_id, U.customer);
  // 8000 + (5,2 - 2) × 2500 = 16000
  assert.equal(order.estimated_fare_idr, 16000);
  assert.equal(order.tariff_version, '3');

  // 1b. Kirim ulang (jaringan putus) → order yang sama, bukan duplikat
  const retry = await createOrder(U.customer, 'e2e-order-0001');
  assert.equal(retry.status, 200);
  assert.equal((retry.body as any).id, order.id);

  // 2. Support tidak boleh menugaskan driver
  asStaff(U.support);
  const bySupport = await api.assignDriver(order.id, U.driverOk);
  assert.ok(bySupport.error, 'support harus ditolak');
  assert.equal((await orderRow(order.id)).status, 'searching');

  // 3. Dispatcher: driver belum terverifikasi / disuspend ditolak
  asStaff(U.dispatcher);
  const pending = await api.assignDriver(order.id, U.driverPending);
  assert.match(pending.error || '', /belum terverifikasi/);
  const suspended = await api.assignDriver(order.id, U.driverSuspended);
  assert.match(suspended.error || '', /belum terverifikasi|tidak aktif/);

  // 4. Dispatcher: tidak boleh lompat ke selesai sebelum ada driver
  const skip = await api.updateOrderStatus(order.id, 'completed');
  assert.match(skip.error || '', /tidak diizinkan/);

  // 5. Dispatcher menugaskan driver terverifikasi
  const assigned = await api.assignDriver(order.id, U.driverOk);
  assert.equal(assigned.error, null, assigned.error || '');
  let row = await orderRow(order.id);
  assert.equal(row.status, 'assigned');
  assert.equal(row.driver_id, U.driverOk);
  assert.ok(row.accepted_at);

  // 6. Status maju sesuai alur, timestamp terisi
  assert.equal((await api.updateOrderStatus(order.id, 'arrived')).error, null);
  assert.ok((await orderRow(order.id)).arrived_at);
  const relock = await api.assignDriver(order.id, U.driverOk2);
  assert.ok(relock.error, 'driver tidak bisa diganti setelah tiba');
  assert.equal((await api.updateOrderStatus(order.id, 'in_trip')).error, null);
  assert.ok((await orderRow(order.id)).started_at);
  assert.equal((await api.updateOrderStatus(order.id, 'completed')).error, null);
  row = await orderRow(order.id);
  assert.equal(row.status, 'completed');
  assert.ok(row.completed_at);

  // 7. Order selesai bersifat final
  const reopen = await api.updateOrderStatus(order.id, 'cancelled', 'coba batal');
  assert.match(reopen.error || '', /tidak diizinkan/);
  const fare = await api.updateOrderStatus(order.id, 'in_trip');
  assert.ok(fare.error);

  // 8. Riwayat status lengkap dengan status lama yang benar & pelakunya
  assert.deepEqual(await history(order.id), [
    { old_status: null, new_status: 'searching', changed_by: null },
    { old_status: 'searching', new_status: 'assigned', changed_by: U.dispatcher },
    { old_status: 'assigned', new_status: 'arrived', changed_by: U.dispatcher },
    { old_status: 'arrived', new_status: 'in_trip', changed_by: U.dispatcher },
    { old_status: 'in_trip', new_status: 'completed', changed_by: U.dispatcher },
  ]);

  // 9. Pelanggan bisa melihat riwayat order miliknya
  const custClient = backend.clientAs(U.customer);
  const own = await custClient.from('order_status_history').select('new_status').eq('order_id', order.id);
  assert.equal(own.error, null);
  assert.equal(own.data?.length, 5);

  // 10. Pembayaran tercatat otomatis (sekali) dan dikonfirmasi finance
  const pays = (await db.query<any>(`SELECT * FROM public.payment_transactions WHERE order_id = $1`, [order.id])).rows;
  assert.equal(pays.length, 1);
  assert.equal(pays[0].amount_idr, 16000);
  assert.equal(pays[0].status, 'pending');
  assert.equal(pays[0].user_id, U.customer);

  asStaff(U.dispatcher);
  assert.equal((await api.getPaymentTransactions()).data.length, 0, 'dispatcher tidak melihat pembayaran');
  assert.ok((await api.confirmPayment(pays[0].id)).error, 'dispatcher tidak boleh konfirmasi pembayaran');

  asStaff(U.finance);
  const list = await api.getPaymentTransactions();
  assert.equal(list.error, null);
  const rows = list.data.map(toPaymentRow);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].payment_status, 'pending');
  const confirmed = await api.confirmPayment(pays[0].id);
  assert.equal(confirmed.error, null, confirmed.error || '');
  assert.equal(toPaymentRow(confirmed.data).payment_status, 'paid');
  assert.ok((await api.confirmPayment(pays[0].id)).error, 'tidak bisa dikonfirmasi dua kali');
  const summary = summarizePayments((await api.getPaymentTransactions()).data.map(toPaymentRow));
  assert.equal(summary.volume, 16000);
  assert.equal(summary.pendingCount, 0);

  // 11. Audit log tercatat atas nama staf yang login, hanya admin yang membaca
  await api.logAudit('CONFIRM_PAYMENT', 'payment_transaction', pays[0].id, { amount_idr: 16000 });
  asStaff(U.finance);
  assert.equal((await api.getAuditLogs()).data.length, 0, 'finance tidak membaca audit log');
  const audit = (await db.query<any>(`SELECT actor_id FROM public.audit_logs WHERE action = 'CONFIRM_PAYMENT'`)).rows;
  assert.deepEqual(audit, [{ actor_id: U.finance }]);
  asStaff(U.admin);
  assert.ok((await api.getAuditLogs()).data.length >= 1, 'admin membaca audit log');
});

test('E2E: pembatalan, lepas driver, dan driver sibuk', async () => {
  asStaff(U.dispatcher);

  // Order A ditugaskan ke driverOk2
  const a = (await createOrder(U.customer2, 'e2e-order-a')).body as any;
  assert.equal((await api.assignDriver(a.id, U.driverOk2)).error, null);

  // Order B tidak bisa memakai driver yang sama selama A aktif
  const b = (await createOrder(U.customer2, 'e2e-order-b')).body as any;
  const busy = await api.assignDriver(b.id, U.driverOk2);
  assert.match(busy.error || '', /sedang menangani order lain/);

  // Lepas driver dari A → kembali mencari, driver dikosongkan
  assert.equal((await api.updateOrderStatus(a.id, 'searching')).error, null);
  const aRow = await orderRow(a.id);
  assert.equal(aRow.status, 'searching');
  assert.equal(aRow.driver_id, null);

  // Sekarang driver bebas → bisa ditugaskan ke B
  assert.equal((await api.assignDriver(b.id, U.driverOk2)).error, null);

  // Batalkan A dari status mencari
  assert.equal((await api.updateOrderStatus(a.id, 'cancelled', 'Pelanggan membatalkan')).error, null);
  assert.ok((await orderRow(a.id)).cancelled_at);
  assert.deepEqual((await history(a.id)).map((h: any) => `${h.old_status}->${h.new_status}`), [
    'null->searching', 'searching->assigned', 'assigned->searching', 'searching->cancelled',
  ]);

  // Dispatcher tidak boleh mengubah tarif order
  const dc = backend.clientAs(U.dispatcher);
  const fare = await dc.from('orders').update({ estimated_fare_idr: 1 }).eq('id', b.id).select();
  assert.ok(fare.error, 'tarif terlindungi');

  // Pelanggan tidak bisa mengubah status ordernya sendiri lewat API
  const cc = backend.clientAs(U.customer2);
  const self = await cc.from('orders').update({ status: 'completed' }).eq('id', b.id).select();
  assert.ok(self.error || (self.data ?? []).length === 0);
  assert.equal((await orderRow(b.id)).status, 'assigned');
});

test('E2E: backend menolak order tanpa login, di luar zona, dan batas order aktif', async () => {
  const noAuth = await handleCreateOrder({
    authHeader: null, idempotencyKey: null, body: orderBody, env,
    deps: { createClient: backend.createClientForServer, fetch: fakeOsrm },
  });
  assert.equal(noAuth.status, 401);

  const outside = await createOrder(U.customer, 'e2e-outside', { ...orderBody, pickup_lat: -6.2, pickup_lng: 106.8 });
  assert.equal(outside.status, 422);

  // customer2 punya 1 order aktif (B). Satu lagi masih boleh, berikutnya ditolak (batas 2).
  const second = await createOrder(U.customer2, 'e2e-order-c');
  assert.equal(second.status, 201);
  const third = await createOrder(U.customer2, 'e2e-order-d');
  assert.equal(third.status, 409);
  assert.equal((third.body as any).code, 'ACTIVE_ORDER_LIMIT');
});

test('Migrasi alur order idempoten', async () => {
  await db.exec(read('supabase/migrations/20261026000002_order_lifecycle.sql'));
  await db.exec(read('supabase/migrations/20261026000001_rbac_per_role.sql'));
  const t = await db.query<{ n: number }>(
    `SELECT count(*)::int n FROM pg_trigger WHERE tgrelid = 'public.orders'::regclass AND NOT tgisinternal`);
  // lifecycle (2) + guard kolom staf (1)
  assert.equal(t.rows[0].n, 3);
});

test('Backend order bisa membuat klien Supabase asli di runtime ini (regresi Node 20 tanpa WebSocket)', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const { serverClientOptions } = await import('../../shared/orderService');
  assert.doesNotThrow(() => createClient(TEST_URL, TEST_ANON_KEY, serverClientOptions({ auth: { persistSession: false } })));
  const src = read('shared/orderService.ts');
  assert.equal((src.match(/makeClient\([^)]*serverClientOptions\(/g) || []).length, 3, 'semua klien backend memakai serverClientOptions');
});

test('Skrip audit read-only berjalan di skema mirip produksi dan melaporkan kesiapan alur order', async () => {
  const sql = read('supabase/audit/readonly_security_audit.sql');
  const before = await db.query<{ n: number }>(`SELECT count(*)::int n FROM public.orders`);
  const res = await db.query<{ status: string; kelompok: string; cek: string; objek: string; detail: string }>(sql);
  const after = await db.query<{ n: number }>(`SELECT count(*)::int n FROM public.orders`);
  assert.equal(after.rows[0].n, before.rows[0].n, 'skrip audit tidak boleh mengubah data');
  const c = res.rows.filter(r => r.kelompok === 'C');
  const by = (cek: string) => c.filter(r => r.cek.startsWith(cek));
  assert.equal(by('C1')[0]?.status, 'OK', JSON.stringify(by('C1')));
  assert.equal(by('C3')[0]?.status, 'OK');
  assert.equal(by('C4')[0]?.status, 'OK');
  assert.equal(by('C5')[0]?.status, 'OK');
  assert.equal(by('C7')[0]?.status, 'OK');
  assert.ok(by('C2').every(r => r.status === 'OK'), JSON.stringify(by('C2')));
});
