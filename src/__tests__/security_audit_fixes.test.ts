import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  handleCreateOrder,
  resolveCorsOrigin,
  parseAllowedOrigins,
  buildCorsHeaders,
  validateOrderInput,
  normalizeIdempotencyKey,
  calculateFare,
} from '../../shared/orderService';

const SERVICE_ID = '11111111-2222-3333-4444-555555555555';
const validBody = {
  service_type_id: SERVICE_ID,
  pickup_address: 'Menara Pandang Siring',
  dropoff_address: 'Duta Mall Banjarmasin',
  pickup_lat: -3.3194, pickup_lng: 114.5908,
  dropoff_lat: -3.3240, dropoff_lng: 114.5970,
};
const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  ROUTING_PROVIDER: 'osrm',
};
const rule = {
  id: 'r1', version: 1, service_type_id: SERVICE_ID,
  base_fare_idr: 8000, included_distance_km: 1, fare_per_km_idr: 2500,
  minimum_fare_idr: 8000, booking_fee_idr: 1000,
};

/** Supabase palsu: menyimpan order di memori dan menegakkan UNIQUE(customer_id, idempotency_key). */
function makeFakeSupabase(userIdForToken: Record<string, string>) {
  const orders: any[] = [];
  const client = (_url: string, _key: string) => ({
    auth: {
      getUser: async (token: string) =>
        userIdForToken[token]
          ? { data: { user: { id: userIdForToken[token] } }, error: null }
          : { data: { user: null }, error: { message: 'bad token' } },
    },
    from(table: string) {
      const filters: Record<string, unknown> = {};
      let pendingInsert: any = null;
      const q: any = {
        select() { return q; },
        eq(col: string, val: unknown) { filters[col] = val; return q; },
        insert(rows: any[]) { pendingInsert = rows[0]; return q; },
        async maybeSingle() {
          if (table === 'tariff_rules') return { data: rule, error: null };
          const found = orders.find(o => Object.entries(filters).every(([k, v]) => o[k] === v));
          return { data: found || null, error: null };
        },
        async single() {
          const row = pendingInsert;
          if (row.idempotency_key && orders.some(o => o.customer_id === row.customer_id && o.idempotency_key === row.idempotency_key)) {
            return { data: null, error: { code: '23505', message: 'duplicate' } };
          }
          const saved = { id: `ord-${orders.length + 1}`, ...row };
          orders.push(saved);
          return { data: saved, error: null };
        },
      };
      return q;
    },
  });
  return { client: client as any, orders };
}

const fakeFetch = (async () => new Response(JSON.stringify({ routes: [{ distance: 5000 }] }), { status: 200 })) as typeof fetch;

test('K3: Idempotency key tidak membocorkan order milik pelanggan lain', async () => {
  const fake = makeFakeSupabase({ tokenA: 'user-a', tokenB: 'user-b' });
  const deps = { createClient: fake.client, fetch: fakeFetch };

  const a = await handleCreateOrder({ authHeader: 'Bearer tokenA', idempotencyKey: 'same-key-123', body: validBody, env, deps });
  assert.strictEqual(a.status, 201);

  const aRetry = await handleCreateOrder({ authHeader: 'Bearer tokenA', idempotencyKey: 'same-key-123', body: validBody, env, deps });
  assert.strictEqual(aRetry.status, 200, 'Ulangan pelanggan yang sama mengembalikan order yang sama');
  assert.strictEqual(aRetry.body.id, a.body.id);

  const b = await handleCreateOrder({ authHeader: 'Bearer tokenB', idempotencyKey: 'same-key-123', body: validBody, env, deps });
  assert.strictEqual(b.status, 201, 'Pelanggan lain dengan key sama mendapat order BARU');
  assert.notStrictEqual(b.body.id, a.body.id);
  assert.strictEqual(b.body.customer_id, 'user-b');
  assert.strictEqual(fake.orders.length, 2);
});

test('K3: customer_id selalu dari token, bukan dari body', async () => {
  const fake = makeFakeSupabase({ tokenA: 'user-a' });
  const r = await handleCreateOrder({
    authHeader: 'Bearer tokenA', idempotencyKey: null,
    body: { ...validBody, customer_id: 'attacker' }, env,
    deps: { createClient: fake.client, fetch: fakeFetch },
  });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.customer_id, 'user-a');
});

test('Order API: token tidak valid ditolak 401', async () => {
  const fake = makeFakeSupabase({});
  const r = await handleCreateOrder({ authHeader: 'Bearer nope', idempotencyKey: null, body: validBody, env, deps: { createClient: fake.client, fetch: fakeFetch } });
  assert.strictEqual(r.status, 401);
  const r2 = await handleCreateOrder({ authHeader: undefined, idempotencyKey: null, body: validBody, env });
  assert.strictEqual(r2.status, 401);
});

test('Order API: validasi input', () => {
  assert.strictEqual(validateOrderInput(validBody).ok, true);
  assert.strictEqual(validateOrderInput({ ...validBody, service_type_id: 'ride_motor' }).ok, false);
  assert.strictEqual(validateOrderInput({ ...validBody, pickup_address: 'x'.repeat(501) }).ok, false);
  assert.strictEqual(validateOrderInput({ ...validBody, notes: 'x'.repeat(501) }).ok, false);
  assert.strictEqual(validateOrderInput({ ...validBody, pickup_lat: 95 }).ok, false);
  assert.strictEqual(validateOrderInput({ ...validBody, pickup_lat: '' }).ok, false);
  assert.strictEqual(validateOrderInput({ ...validBody, pickup_lat: null }).ok, false);
  assert.strictEqual(normalizeIdempotencyKey('short').ok, false);
  assert.strictEqual(normalizeIdempotencyKey('valid-key-123').ok, true);
  assert.deepStrictEqual(normalizeIdempotencyKey(undefined), { ok: true, key: null });
});

test('Order API: perhitungan tarif tidak berubah', () => {
  assert.strictEqual(calculateFare(rule, 0.5).finalFare, 9000);
  assert.strictEqual(calculateFare(rule, 5).finalFare, 19000);
});

test('S1: CORS hanya untuk origin terdaftar, tanpa wildcard', () => {
  const allowed = parseAllowedOrigins('https://admin.kawai0511.id, https://app.kawai0511.id/');
  assert.strictEqual(resolveCorsOrigin('https://app.kawai0511.id', allowed), 'https://app.kawai0511.id');
  assert.strictEqual(resolveCorsOrigin('https://evil.example', allowed), null);
  assert.strictEqual(buildCorsHeaders('https://evil.example', {})['Access-Control-Allow-Origin'], undefined);
  assert.strictEqual(parseAllowedOrigins('*').includes('*'), true);
  assert.strictEqual(resolveCorsOrigin('https://evil.example', parseAllowedOrigins('*')), null);
});

test('K1/K2/T3: migrasi perbaikan keamanan', () => {
  const sql = fs.readFileSync(path.resolve('supabase/migrations/20261025000002_security_audit_fixes.sql'), 'utf8');
  const isAdminFn = sql.slice(sql.indexOf('FUNCTION public.is_admin()'), sql.indexOf('REVOKE EXECUTE ON FUNCTION public.is_admin()'));
  assert.match(isAdminFn, /is_active = true/);
  assert.match(isAdminFn, /status = 'active'/);
  assert.doesNotMatch(isAdminFn, /is_admin = true/, 'Flag is_admin tidak boleh dipercaya');
  assert.match(sql, /ALTER VIEW public\.admin_users SET \(security_invoker = true\)/);
  assert.match(sql, /ALTER VIEW public\.operational_zones SET \(security_invoker = true\)/);
  assert.match(sql, /orders_customer_idempotency_key_uidx[\s\S]*\(customer_id, idempotency_key\)/);
  assert.match(sql, /'is_admin'\)\s+IS DISTINCT FROM/);
  for (const t of ['tariff_rules', 'service_types', 'order_status_history', 'payment_transactions', 'support_tickets']) {
    assert.ok(sql.includes(`'${t}'`), `Policy admin untuk ${t} wajib ada`);
  }
  assert.match(sql, /FOR ALL TO authenticated USING \(public\.is_admin\(\)\) WITH CHECK \(public\.is_admin\(\)\)/);
});

test('T1: Tidak ada kredensial default di halaman login', () => {
  const login = fs.readFileSync(path.resolve('src/features/auth/LoginPage.tsx'), 'utf8');
  assert.doesNotMatch(login, /admin123/);
  assert.doesNotMatch(login, /\|\| 'admin@kawai0511\.id'/);
});

test('T4: Jalur Supabase di api.ts tidak menggabungkan data mock', () => {
  const api = fs.readFileSync(path.resolve('src/lib/api.ts'), 'utf8');
  assert.doesNotMatch(api, /\.\.\.memoryOrders\[0\]/);
  assert.doesNotMatch(api, /memoryUsers\.find\(u => u\.id === userId\) \|\| memoryUsers\[0\]\),/);
});

test('K4: Server produksi tidak memuat Vite dev server', () => {
  const server = fs.readFileSync(path.resolve('server.ts'), 'utf8');
  assert.doesNotMatch(server, /^import \{ createServer as createViteServer \} from 'vite'/m);
  assert.match(server, /express\.static\(distDir/);
  const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
  assert.match(pkg.scripts.start, /NODE_ENV=production/);
});
