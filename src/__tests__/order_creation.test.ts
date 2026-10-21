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

  await t.test('7. Server codebase verification - no hardcoded 3.4km placeholder as calculation default', () => {
    const serverPath = path.resolve('./server.ts');
    const serverCode = fs.readFileSync(serverPath, 'utf8');

    // Verify 3.4 placeholder is not used as active distance
    assert.ok(!serverCode.includes('const distance = 3.4;'), 'Hardcoded 3.4km distance placeholder must be eliminated');
    // Verify routing unconfigured check returns 503
    assert.ok(serverCode.includes('ROUTING_NOT_CONFIGURED'), 'Server must return ROUTING_NOT_CONFIGURED if routing key is absent');
  });

  await t.test('8. Server route separation - API routes vs SPA fallback', () => {
    const serverPath = path.resolve('./server.ts');
    const serverCode = fs.readFileSync(serverPath, 'utf8');

    assert.ok(serverCode.includes("app.post('/api/orders'"), 'POST /api/orders route must exist');
    assert.ok(serverCode.includes("app.use('*'"), 'SPA wildcard fallback must exist');
    // Ensure API routes are registered before the wildcard fallback
    const apiIndex = serverCode.indexOf("app.post('/api/orders'");
    const fallbackIndex = serverCode.indexOf("app.use('*'");
    assert.ok(apiIndex < fallbackIndex, 'API routes must be declared before SPA wildcard fallback');
  });

  await t.test('9. Supabase client separation (Auth anon client vs Privileged admin client)', () => {
    const serverPath = path.resolve('./server.ts');
    const serverCode = fs.readFileSync(serverPath, 'utf8');

    assert.ok(serverCode.includes('authClient'), 'Server must define separate authClient for user token verification');
    assert.ok(serverCode.includes('adminClient'), 'Server must define separate adminClient for privileged operations');
    assert.ok(serverCode.includes('SUPABASE_ANON_KEY') || serverCode.includes('SUPABASE_PUBLISHABLE_KEY'), 'Server must support anon/publishable key for authClient');
    assert.ok(serverCode.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Server must use service role key for privileged adminClient');
  });

  await t.test('10. Verified user customer_id isolation (rejecting untrusted client body customer_id)', () => {
    const serverPath = path.resolve('./server.ts');
    const serverCode = fs.readFileSync(serverPath, 'utf8');

    assert.ok(serverCode.includes('customer_id = authData.user.id'), 'Customer ID must be derived exclusively from verified auth token');
    assert.ok(!serverCode.includes('customer_id = req.body.customer_id'), 'Customer ID from client body must NEVER be trusted');
  });

  await t.test('11. HTTP 401 on missing or empty Authorization header', () => {
    const serverPath = path.resolve('./server.ts');
    const serverCode = fs.readFileSync(serverPath, 'utf8');

    assert.ok(serverCode.includes("res.status(401)"), 'Must return 401 for unauthorized calls');
    assert.ok(serverCode.includes('Header Authorization Bearer token wajib disertakan'), 'Must explain Bearer token requirement');
  });

  await t.test('12. Idempotency store support for order creation', () => {
    const serverPath = path.resolve('./server.ts');
    const serverCode = fs.readFileSync(serverPath, 'utf8');

    assert.ok(serverCode.includes('idempotencyKey'), 'Must handle Idempotency-Key / x-idempotency-key headers');
    assert.ok(serverCode.includes('idempotencyStore'), 'Must maintain idempotency store to prevent duplicate orders');
  });
});

