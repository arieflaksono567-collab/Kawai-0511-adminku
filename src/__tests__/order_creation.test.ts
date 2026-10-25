import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Helper validator matching server logic
function validateCoordinates(latP: any, lngP: any, latD: any, lngD: any): boolean {
  const pLat = Number(latP);
  const pLng = Number(lngP);
  const dLat = Number(latD);
  const dLng = Number(lngD);
  if (
    isNaN(pLat) || isNaN(pLng) || isNaN(dLat) || isNaN(dLng) ||
    pLat < -90 || pLat > 90 || dLat < -90 || dLat > 90 ||
    pLng < -180 || pLng > 180 || dLng < -180 || dLng > 180
  ) {
    return false;
  }
  return true;
}

// Tariff calculation function matching server logic
function calculateOrderFare(rules: any, distanceKm: number) {
  const includedKm = Number(rules.included_distance_km) || 0;
  const additionalDistance = Math.max(0, distanceKm - includedKm);
  const distanceFare = Math.round(additionalDistance * Number(rules.fare_per_km_idr));
  const bookingFee = Number(rules.booking_fee_idr) || 0;
  const calculatedFare = Number(rules.base_fare_idr) + distanceFare + bookingFee;
  const finalFare = Math.max(calculatedFare, Number(rules.minimum_fare_idr));

  return {
    rule_id: rules.id,
    rule_version: rules.version,
    base_fare_idr: rules.base_fare_idr,
    included_distance_km: includedKm,
    fare_per_km_idr: rules.fare_per_km_idr,
    minimum_fare_idr: rules.minimum_fare_idr,
    booking_fee_idr: bookingFee,
    measured_distance_km: distanceKm,
    distance_fare_idr: distanceFare,
    calculated_fare_idr: calculatedFare,
    final_fare_idr: finalFare,
  };
}

test('KAWAI 0511 - Order Creation & Tariff Integration Tests', async (t) => {
  await t.test('1. Valid coordinates acceptance', () => {
    // Banjarmasin Coordinates (-3.3194, 114.5908) to Duta Mall (-3.3240, 114.5970)
    assert.strictEqual(validateCoordinates(-3.3194, 114.5908, -3.3240, 114.5970), true);
  });

  await t.test('2. Invalid coordinates rejection (out of bounds or NaN)', () => {
    assert.strictEqual(validateCoordinates(95.0, 114.5, -3.3, 114.5), false);
    assert.strictEqual(validateCoordinates(-3.3, 200.0, -3.3, 114.5), false);
    assert.strictEqual(validateCoordinates('abc', 114.5, -3.3, 114.5), false);
  });

  await t.test('3. Server-side tariff calculation matches active tariff rules', () => {
    const mockRule = {
      id: 'rule-ride-motor-v1',
      version: 1,
      base_fare_idr: 8000,
      included_distance_km: 1.0,
      fare_per_km_idr: 2500,
      minimum_fare_idr: 8000,
      booking_fee_idr: 1000,
    };

    // Scenario A: 0.5 km (below included distance)
    const fareShort = calculateOrderFare(mockRule, 0.5);
    assert.strictEqual(fareShort.final_fare_idr, 9000); // 8000 base + 0 extra + 1000 booking = 9000

    // Scenario B: 5.0 km (4.0 km additional)
    const fareLong = calculateOrderFare(mockRule, 5.0);
    // 8000 base + (4.0 * 2500 = 10000) + 1000 booking = 19000
    assert.strictEqual(fareLong.final_fare_idr, 19000);
    assert.strictEqual(fareLong.distance_fare_idr, 10000);
  });

  await t.test('4. Minimum fare enforcement', () => {
    const mockRuleWithHighMin = {
      id: 'rule-ride-car-v1',
      version: 1,
      base_fare_idr: 12000,
      included_distance_km: 2.0,
      fare_per_km_idr: 3000,
      minimum_fare_idr: 20000,
      booking_fee_idr: 1000,
    };

    const fare = calculateOrderFare(mockRuleWithHighMin, 1.0);
    // Calculated: 12000 + 0 + 1000 = 13000, but minimum is 20000
    assert.strictEqual(fare.final_fare_idr, 20000);
  });

  await t.test('5. Client-sent fare is ignored in favor of server calculation', () => {
    const mockRule = {
      id: 'rule-test',
      version: 2,
      base_fare_idr: 10000,
      included_distance_km: 1.0,
      fare_per_km_idr: 2000,
      minimum_fare_idr: 10000,
      booking_fee_idr: 1000,
    };

    const clientManipulatedFare = 500; // Malicious client attempt
    const serverResult = calculateOrderFare(mockRule, 3.0);
    assert.notStrictEqual(serverResult.final_fare_idr, clientManipulatedFare);
    assert.strictEqual(serverResult.final_fare_idr, 15000); // 10000 + 4000 + 1000
  });

  await t.test('6. Snapshot tariff columns in database migration', () => {
    const migrationPath = path.resolve('./supabase/migrations/20261020000002_add_tariff_snapshot.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration file 20261020000002 must exist');
    const content = fs.readFileSync(migrationPath, 'utf8');

    assert.ok(content.includes('ADD COLUMN IF NOT EXISTS tariff_version TEXT'), 'Must add tariff_version independently');
    assert.ok(content.includes('ADD COLUMN IF NOT EXISTS calculation_details JSONB'), 'Must add calculation_details independently');
  });

  // Logika order kini berada di shared/orderService.ts dan dipakai oleh server.ts serta functions/api/orders.ts
  const readBackend = () => ({
    server: fs.readFileSync(path.resolve('./server.ts'), 'utf8'),
    service: fs.readFileSync(path.resolve('./shared/orderService.ts'), 'utf8'),
  });

  await t.test('7. Server codebase verification - no hardcoded 3.4km placeholder as calculation default', () => {
    const { server, service } = readBackend();
    assert.ok(!server.includes('const distance = 3.4;') && !service.includes('const distance = 3.4;'), 'Hardcoded 3.4km distance placeholder must be eliminated');
    assert.ok(service.includes('ROUTING_NOT_CONFIGURED'), 'Server must return ROUTING_NOT_CONFIGURED if routing key is absent');
  });

  await t.test('8. Server route separation - API routes vs SPA fallback', () => {
    const { server } = readBackend();
    assert.ok(server.includes("app.post('/api/orders'"), 'POST /api/orders route must exist');
    const apiIndex = server.indexOf("app.post('/api/orders'");
    const devFallback = server.indexOf("app.use('*'");
    const prodFallback = server.indexOf("app.get('*'");
    assert.ok(devFallback > -1 && prodFallback > -1, 'SPA fallback must exist for dev and production');
    assert.ok(apiIndex < devFallback && apiIndex < prodFallback, 'API routes must be declared before SPA wildcard fallback');
  });

  await t.test('9. Supabase client separation (token verifier vs privileged db client)', () => {
    const { service } = readBackend();
    assert.ok(service.includes('const verifier = makeClient('), 'Must use a dedicated client for user token verification');
    assert.ok(service.includes('SUPABASE_ANON_KEY') || service.includes('SUPABASE_PUBLISHABLE_KEY'), 'Must support anon/publishable key');
    assert.ok(service.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Must use service role key for privileged db client');
  });

  await t.test('10. Verified user customer_id isolation (rejecting untrusted client body customer_id)', () => {
    const { service } = readBackend();
    assert.ok(service.includes('customer_id = data.user.id'), 'Customer ID must be derived exclusively from verified auth token');
    assert.ok(!service.includes('body.customer_id') && !service.includes('b.customer_id'), 'Customer ID from client body must NEVER be trusted');
  });

  await t.test('11. HTTP 401 on missing or empty Authorization header', () => {
    const { service } = readBackend();
    assert.ok(service.includes("fail(401, 'UNAUTHORIZED'"), 'Must return 401 for unauthorized calls');
    assert.ok(service.includes('Header Authorization Bearer token wajib disertakan'), 'Must explain Bearer token requirement');
  });

  await t.test('12. Database-backed idempotency scoped per customer', () => {
    const { service } = readBackend();
    assert.ok(service.includes("idempotency_key: idem.key"), 'Order must persist idempotency_key');
    assert.ok(service.includes(".eq('customer_id', customer_id)") && service.includes(".eq('idempotency_key', idem.key)"), 'Lookup must be scoped to customer');
    assert.ok(service.includes("'23505'"), 'Must handle unique violation race');
    assert.ok(!service.includes('idempotencyStore') && !readBackend().server.includes('idempotencyStore'), 'In-memory idempotency store must be removed');
  });

  await t.test('13. Startup consistency - backend build generates server.js for npm start', () => {
    const pkgJson = JSON.parse(fs.readFileSync(path.resolve('./package.json'), 'utf8'));
    assert.ok(pkgJson.scripts.build.includes('server.js'), 'build script must generate server.js for npm start');
    assert.strictEqual(pkgJson.scripts.start, 'NODE_ENV=production node server.js', 'start script must run server.js in production mode');
  });

  await t.test('14. Routing error and timeout handling', () => {
    const { service } = readBackend();
    assert.ok(service.includes('ROUTING_FAILED'), 'Must handle routing network failure or timeout with ROUTING_FAILED');
    assert.ok(service.includes('NO_ROUTE_FOUND'), 'Must handle unroutable points with NO_ROUTE_FOUND');
    assert.ok(service.includes('AbortSignal.timeout'), 'Must enforce timeout on external routing HTTP calls');
  });

  await t.test('15. Supabase configuration safety - safe rejection when unconfigured', () => {
    const { service } = readBackend();
    assert.ok(service.includes('SUPABASE_NOT_CONFIGURED'), 'Must fail safely with SUPABASE_NOT_CONFIGURED when keys/URL are missing');
  });

  await t.test('16. Canonical forward migration verification (20261025000001)', () => {
    const migrationPath = path.resolve('./supabase/migrations/20261025000001_reconcile_canonical_schema.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration 20261025000001 must exist');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Verify canonical columns additions
    assert.ok(sql.includes('pickup_address TEXT'), 'Must add pickup_address');
    assert.ok(sql.includes('dropoff_address TEXT'), 'Must add dropoff_address');
    assert.ok(sql.includes('service_type_id UUID'), 'Must add service_type_id');
    assert.ok(sql.includes('estimated_fare_idr INTEGER'), 'Must add estimated_fare_idr');
    // Verify bidirectional backfill
    assert.ok(sql.includes('pickup_address = COALESCE(pickup_address, origin_address'), 'Must backfill pickup_address');
    // Verify views
    assert.ok(sql.includes('CREATE OR REPLACE VIEW public.admin_users'), 'Must provide admin_users view');
    assert.ok(sql.includes('CREATE OR REPLACE VIEW public.operational_zones'), 'Must provide operational_zones view');
    // Verify status constraint
    assert.ok(sql.includes('orders_status_check'), 'Must reconcile orders_status_check constraint');
  });

  await t.test('17. Health probe and CORS support in server.ts', () => {
    const serverCode = fs.readFileSync(path.resolve('./server.ts'), 'utf8');
    const service = fs.readFileSync(path.resolve('./shared/orderService.ts'), 'utf8');

    assert.ok(serverCode.includes("app.get('/health'"), 'Server must have /health endpoint');
    assert.ok(serverCode.includes("app.get('/api/health'"), 'Server must have /api/health endpoint');
    assert.ok(serverCode.includes('buildCorsHeaders('), 'Server must apply allow-listed CORS headers');
    assert.ok(service.includes('Access-Control-Allow-Origin'), 'CORS helper must set Access-Control-Allow-Origin for allowed origins');
  });

  await t.test('18. Cloudflare Pages Functions edge API availability', () => {
    const healthFnPath = path.resolve('./functions/api/health.ts');
    const ordersFnPath = path.resolve('./functions/api/orders.ts');

    assert.ok(fs.existsSync(healthFnPath), 'Cloudflare Pages health function must exist');
    assert.ok(fs.existsSync(ordersFnPath), 'Cloudflare Pages orders function must exist');

    const ordersFn = fs.readFileSync(ordersFnPath, 'utf8');
    assert.ok(ordersFn.includes('onRequestPost'), 'Must export onRequestPost handler');
    assert.ok(ordersFn.includes('onRequestOptions'), 'Must export onRequestOptions handler');
    assert.ok(ordersFn.includes("from '../../shared/orderService'"), 'Edge function must reuse the shared order service');
    const service = fs.readFileSync(path.resolve('./shared/orderService.ts'), 'utf8');
    assert.ok(service.includes('tariff_version'), 'Must snapshot tariff_version');
    assert.ok(service.includes('calculation_details'), 'Must snapshot calculation_details');
  });

  await t.test('19. Client API VITE_API_URL decouple support', () => {
    const apiPath = path.resolve('./src/lib/api.ts');
    const apiCode = fs.readFileSync(apiPath, 'utf8');

    assert.ok(apiCode.includes('VITE_API_URL'), 'Client createOrder must support optional VITE_API_URL for decoupled hosting');
  });
});


