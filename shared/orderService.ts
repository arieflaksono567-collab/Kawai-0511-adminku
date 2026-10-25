// ==============================================================================
// KAWAI 0511 — Shared Order Service
// Dipakai bersama oleh server Express (server.ts) dan Cloudflare Pages Function
// (functions/api/orders.ts) agar logika validasi, tarif, dan idempotency identik.
// Modul ini tidak boleh memakai API khusus Node (process, fs) supaya jalan di edge.
// ==============================================================================
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface OrderEnv {
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ROUTING_PROVIDER?: string;
  ROUTING_API_KEY?: string;
  OSRM_BASE_URL?: string;
  ALLOWED_ORIGINS?: string;
  /** Maks. order baru per pelanggan dalam 10 menit (default 5) */
  ORDER_RATE_LIMIT_PER_10_MIN?: string;
  /** Maks. order aktif (belum selesai/batal) per pelanggan (default 2) */
  MAX_ACTIVE_ORDERS_PER_CUSTOMER?: string;
  /** Jarak jalan maksimum satu perjalanan dalam km (default 60) */
  MAX_TRIP_DISTANCE_KM?: string;
  /** Cadangan bila service_zones belum punya polygon: "minLat,minLng,maxLat,maxLng" */
  SERVICE_AREA_BBOX?: string;
}

export interface OrderResult {
  status: number;
  body: Record<string, unknown>;
}

export interface CreateOrderInput {
  authHeader: string | null | undefined;
  idempotencyKey: string | null | undefined;
  body: unknown;
  env: OrderEnv;
  /** Opsional: injeksi untuk pengujian */
  deps?: {
    createClient?: typeof createClient;
    fetch?: typeof fetch;
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9._:-]{8,128}$/;
export const MAX_ADDRESS_LENGTH = 500;
export const MAX_NOTES_LENGTH = 500;

const fail = (status: number, code: string, error: string): OrderResult => ({
  status,
  body: { error, code },
});

// ------------------------------------------------------------------------------
// CORS
// ------------------------------------------------------------------------------
export function parseAllowedOrigins(raw: string | undefined): string[] {
  return (raw || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

/**
 * Mengembalikan origin yang boleh dipantulkan di Access-Control-Allow-Origin,
 * atau null bila origin tidak diizinkan. Wildcard '*' sengaja tidak didukung.
 */
export function resolveCorsOrigin(origin: string | null | undefined, allowed: string[]): string | null {
  if (!origin) return null;
  const normalized = origin.replace(/\/+$/, '');
  return allowed.includes(normalized) ? normalized : null;
}

export function buildCorsHeaders(origin: string | null | undefined, env: OrderEnv): Record<string, string> {
  const allowedOrigin = resolveCorsOrigin(origin, parseAllowedOrigins(env.ALLOWED_ORIGINS));
  const headers: Record<string, string> = { Vary: 'Origin' };
  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Idempotency-Key, x-idempotency-key';
    headers['Access-Control-Max-Age'] = '600';
  }
  return headers;
}

// ------------------------------------------------------------------------------
// Validasi input
// ------------------------------------------------------------------------------
export interface ValidOrderInput {
  service_type_id: string;
  pickup_address: string;
  dropoff_address: string;
  notes: string | null;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
}

const isFiniteNumberLike = (v: unknown) =>
  (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && Number.isFinite(Number(v));

export function validateOrderInput(raw: unknown): { ok: true; value: ValidOrderInput } | { ok: false; result: OrderResult } {
  const b = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const service_type_id = typeof b.service_type_id === 'string' ? b.service_type_id.trim() : '';
  const pickup_address = typeof b.pickup_address === 'string' ? b.pickup_address.trim() : '';
  const dropoff_address = typeof b.dropoff_address === 'string' ? b.dropoff_address.trim() : '';

  if (!service_type_id || !pickup_address || !dropoff_address) {
    return { ok: false, result: fail(400, 'INVALID_PARAMETERS', 'Parameter tidak lengkap: service_type_id, pickup_address, dan dropoff_address wajib diisi.') };
  }
  if (!UUID_RE.test(service_type_id)) {
    return { ok: false, result: fail(400, 'INVALID_PARAMETERS', 'service_type_id harus berupa UUID yang valid.') };
  }
  if (pickup_address.length > MAX_ADDRESS_LENGTH || dropoff_address.length > MAX_ADDRESS_LENGTH) {
    return { ok: false, result: fail(400, 'INVALID_PARAMETERS', `Alamat maksimal ${MAX_ADDRESS_LENGTH} karakter.`) };
  }

  let notes: string | null = null;
  if (b.notes !== undefined && b.notes !== null && b.notes !== '') {
    if (typeof b.notes !== 'string' || b.notes.length > MAX_NOTES_LENGTH) {
      return { ok: false, result: fail(400, 'INVALID_PARAMETERS', `Catatan harus teks maksimal ${MAX_NOTES_LENGTH} karakter.`) };
    }
    notes = b.notes.trim() || null;
  }

  const coords = [b.pickup_lat, b.pickup_lng, b.dropoff_lat, b.dropoff_lng];
  if (!coords.every(isFiniteNumberLike)) {
    return { ok: false, result: fail(400, 'INVALID_COORDINATES', 'Koordinat tidak valid: Lintang harus antara -90 dan 90, bujur antara -180 dan 180.') };
  }
  const [pickup_lat, pickup_lng, dropoff_lat, dropoff_lng] = coords.map(Number);
  if (
    pickup_lat < -90 || pickup_lat > 90 || dropoff_lat < -90 || dropoff_lat > 90 ||
    pickup_lng < -180 || pickup_lng > 180 || dropoff_lng < -180 || dropoff_lng > 180
  ) {
    return { ok: false, result: fail(400, 'INVALID_COORDINATES', 'Koordinat tidak valid: Lintang harus antara -90 dan 90, bujur antara -180 dan 180.') };
  }

  return {
    ok: true,
    value: { service_type_id, pickup_address, dropoff_address, notes, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng },
  };
}

export function normalizeIdempotencyKey(raw: string | null | undefined): { ok: true; key: string | null } | { ok: false; result: OrderResult } {
  if (raw === null || raw === undefined || raw.trim() === '') return { ok: true, key: null };
  const key = raw.trim();
  if (!IDEMPOTENCY_KEY_RE.test(key)) {
    return { ok: false, result: fail(400, 'INVALID_IDEMPOTENCY_KEY', 'Idempotency-Key harus 8–128 karakter (huruf, angka, . _ : -).') };
  }
  return { ok: true, key };
}

// ------------------------------------------------------------------------------
// Rate limiting (per IP, di memori — lapis pertama sebelum cek database)
// ------------------------------------------------------------------------------
export interface RateLimiter {
  /** true bila permintaan diizinkan */
  hit(key: string, now?: number): { allowed: boolean; retryAfterSec: number };
}

/**
 * Sliding-window sederhana dengan batas jumlah key agar memori tidak bocor.
 * Di Cloudflare tiap isolate punya memori sendiri, jadi ini hanya lapis
 * best-effort; lapis utama adalah batas per pelanggan di database.
 */
export function createRateLimiter({ windowMs, max, maxKeys = 10_000 }: { windowMs: number; max: number; maxKeys?: number }): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    hit(key, now = Date.now()) {
      const since = now - windowMs;
      const list = (hits.get(key) || []).filter((t) => t > since);
      if (list.length >= max) {
        hits.set(key, list);
        return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((list[0] + windowMs - now) / 1000)) };
      }
      list.push(now);
      hits.delete(key);
      hits.set(key, list);
      // Buang key tertua bila melebihi kapasitas (Map menjaga urutan sisip)
      while (hits.size > maxKeys) {
        const oldest = hits.keys().next().value as string;
        hits.delete(oldest);
      }
      return { allowed: true, retryAfterSec: 0 };
    },
  };
}

// ------------------------------------------------------------------------------
// Zona layanan
// ------------------------------------------------------------------------------
type Ring = number[][]; // [[lng, lat], ...] (urutan GeoJSON)

function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function pointInPolygonCoords(lng: number, lat: number, rings: Ring[]): boolean {
  if (!rings.length || !pointInRing(lng, lat, rings[0])) return false;
  // Ring berikutnya adalah lubang (hole)
  return !rings.slice(1).some((hole) => pointInRing(lng, lat, hole));
}

const isValidRing = (r: unknown): r is Ring =>
  Array.isArray(r) && r.length >= 4 && r.every((p) => Array.isArray(p) && p.length >= 2 && p.every(Number.isFinite));

/** Mengembalikan daftar polygon (sebagai rings) dari GeoJSON Polygon/MultiPolygon/Feature yang valid. */
export function extractPolygons(geo: any): Ring[][] {
  if (!geo || typeof geo !== 'object') return [];
  if (geo.type === 'Feature') return extractPolygons(geo.geometry);
  if (geo.type === 'FeatureCollection') return (geo.features || []).flatMap(extractPolygons);
  if (geo.type === 'Polygon' && Array.isArray(geo.coordinates) && geo.coordinates.every(isValidRing)) {
    return geo.coordinates.length ? [geo.coordinates] : [];
  }
  if (geo.type === 'MultiPolygon' && Array.isArray(geo.coordinates)) {
    return geo.coordinates.filter((poly: unknown) => Array.isArray(poly) && poly.length && poly.every(isValidRing));
  }
  return [];
}

export function isInsideAnyPolygon(lat: number, lng: number, polygons: Ring[][]): boolean {
  return polygons.some((rings) => pointInPolygonCoords(lng, lat, rings));
}

export function parseBbox(raw: string | undefined): [number, number, number, number] | null {
  if (!raw) return null;
  const parts = raw.split(',').map((x) => Number(x.trim()));
  if (parts.length !== 4 || !parts.every(Number.isFinite)) return null;
  const [minLat, minLng, maxLat, maxLng] = parts;
  return minLat < maxLat && minLng < maxLng ? [minLat, minLng, maxLat, maxLng] : null;
}

async function checkServiceArea(db: SupabaseClient, input: ValidOrderInput, env: OrderEnv): Promise<OrderResult | null> {
  const outside = fail(422, 'OUTSIDE_SERVICE_AREA', 'Titik jemput berada di luar zona layanan KAWAI 0511.');

  const { data, error } = await db.from('service_zones').select('boundary').eq('is_active', true);
  if (error) {
    // Zona adalah aturan bisnis, bukan kontrol akses: jangan blokir order bila tabel bermasalah
    console.error('[orders] service_zones lookup failed', error);
  } else {
    const polygons = (data || []).flatMap((z: any) => extractPolygons(z?.boundary));
    if (polygons.length) {
      return isInsideAnyPolygon(input.pickup_lat, input.pickup_lng, polygons) ? null : outside;
    }
  }

  const bbox = parseBbox(env.SERVICE_AREA_BBOX);
  if (bbox) {
    const [minLat, minLng, maxLat, maxLng] = bbox;
    const inBox = input.pickup_lat >= minLat && input.pickup_lat <= maxLat && input.pickup_lng >= minLng && input.pickup_lng <= maxLng;
    return inBox ? null : outside;
  }
  return null; // Belum ada zona terkonfigurasi
}

// ------------------------------------------------------------------------------
// Batas order per pelanggan (database — berlaku di semua instance/isolate)
// ------------------------------------------------------------------------------
export const ACTIVE_ORDER_STATUSES = ['searching', 'assigned', 'arrived', 'in_trip'];

const intEnv = (raw: string | undefined, fallback: number) => {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

async function checkCustomerLimits(db: SupabaseClient, customer_id: string, env: OrderEnv): Promise<OrderResult | null> {
  const perWindow = intEnv(env.ORDER_RATE_LIMIT_PER_10_MIN, 5);
  const maxActive = intEnv(env.MAX_ACTIVE_ORDERS_PER_CUSTOMER, 2);
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const recent = await db
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customer_id)
    .gte('created_at', since);
  if (recent.error) throw recent.error;
  if ((recent.count ?? 0) >= perWindow) {
    return fail(429, 'RATE_LIMITED', 'Terlalu banyak pesanan dalam waktu singkat. Coba lagi beberapa menit lagi.');
  }

  const active = await db
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customer_id)
    .in('status', ACTIVE_ORDER_STATUSES);
  if (active.error) throw active.error;
  if ((active.count ?? 0) >= maxActive) {
    return fail(409, 'ACTIVE_ORDER_LIMIT', 'Anda masih memiliki pesanan aktif. Selesaikan atau batalkan dulu sebelum memesan lagi.');
  }
  return null;
}

// ------------------------------------------------------------------------------
// Tarif
// ------------------------------------------------------------------------------
export function calculateFare(rules: Record<string, any>, distanceKm: number) {
  const includedKm = Number(rules.included_distance_km) || 0;
  const additionalDistance = Math.max(0, distanceKm - includedKm);
  const distanceFare = Math.round(additionalDistance * Number(rules.fare_per_km_idr));
  const bookingFee = Number(rules.booking_fee_idr) || 0;
  const calculatedFare = Number(rules.base_fare_idr) + distanceFare + bookingFee;
  const finalFare = Math.max(calculatedFare, Number(rules.minimum_fare_idr));
  return { includedKm, distanceFare, bookingFee, calculatedFare, finalFare };
}

// ------------------------------------------------------------------------------
// Routing
// ------------------------------------------------------------------------------
async function measureRoadDistanceKm(
  input: ValidOrderInput,
  env: OrderEnv,
  fetchImpl: typeof fetch,
): Promise<{ ok: true; km: number; provider: string } | { ok: false; result: OrderResult }> {
  const provider = env.ROUTING_PROVIDER || 'none';
  if (provider === 'none') {
    return { ok: false, result: fail(503, 'ROUTING_NOT_CONFIGURED', 'Penyedia routing jalan belum dikonfigurasi. Tarif tidak dapat dihitung.') };
  }
  if (provider !== 'osrm') {
    return { ok: false, result: fail(503, 'UNSUPPORTED_ROUTING_PROVIDER', `Penyedia routing "${provider}" belum didukung.`) };
  }

  // Server publik OSRM hanya untuk demo; set OSRM_BASE_URL ke instance sendiri di produksi.
  const base = (env.OSRM_BASE_URL || 'https://router.project-osrm.org').replace(/\/+$/, '');
  const url = `${base}/route/v1/driving/${input.pickup_lng},${input.pickup_lat};${input.dropoff_lng},${input.dropoff_lat}?overview=false`;
  try {
    const resp = await fetchImpl(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) {
      console.error('[orders] routing HTTP error', resp.status);
      return { ok: false, result: fail(502, 'ROUTING_FAILED', 'Layanan routing gagal mengembalikan jarak jalan.') };
    }
    const data = (await resp.json()) as any;
    const meters = data?.routes?.[0]?.distance;
    if (typeof meters !== 'number') {
      return { ok: false, result: fail(422, 'NO_ROUTE_FOUND', 'Tidak ditemukan rute jalan antara titik jemput dan tujuan.') };
    }
    return { ok: true, km: Number((meters / 1000).toFixed(2)), provider: 'osrm' };
  } catch (err) {
    console.error('[orders] routing request failed', err);
    return { ok: false, result: fail(502, 'ROUTING_FAILED', 'Gagal menghubungi penyedia routing jalan.') };
  }
}

// ------------------------------------------------------------------------------
// Handler utama
// ------------------------------------------------------------------------------
export async function handleCreateOrder({ authHeader, idempotencyKey, body, env, deps }: CreateOrderInput): Promise<OrderResult> {
  const makeClient = deps?.createClient || createClient;
  const fetchImpl = deps?.fetch || fetch;

  // 1. Authorization header
  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
    return fail(401, 'UNAUTHORIZED', 'Otorisasi ditolak: Header Authorization Bearer token wajib disertakan.');
  }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return fail(401, 'UNAUTHORIZED', 'Otorisasi ditolak: Bearer token tidak boleh kosong.');
  }

  // 2. Konfigurasi Supabase
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const anonKey = env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || '';
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || (!anonKey && !serviceKey)) {
    return fail(503, 'SUPABASE_NOT_CONFIGURED', 'Layanan database belum dikonfigurasi pada server.');
  }

  // 3. Verifikasi token — customer_id SELALU dari token, tidak pernah dari body
  const verifier = makeClient(supabaseUrl, anonKey || serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let customer_id: string;
  try {
    const { data, error } = await verifier.auth.getUser(token);
    if (error || !data?.user) {
      return fail(401, 'INVALID_TOKEN', 'Sesi token tidak valid atau telah kedaluwarsa.');
    }
    customer_id = data.user.id;
  } catch (err) {
    console.error('[orders] token verification failed', err);
    return fail(401, 'INVALID_TOKEN', 'Gagal memverifikasi token autentikasi.');
  }

  // 4. Validasi input & idempotency key
  const idem = normalizeIdempotencyKey(idempotencyKey);
  if (!idem.ok) return idem.result;
  const parsed = validateOrderInput(body);
  if (!parsed.ok) return parsed.result;
  const input = parsed.value;

  const db: SupabaseClient = serviceKey
    ? makeClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : makeClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      });

  const findExisting = async () => {
    if (!idem.key) return null;
    const { data, error } = await db
      .from('orders')
      .select('*')
      .eq('customer_id', customer_id)
      .eq('idempotency_key', idem.key)
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  try {
    // 5. Idempotency — dicari per pelanggan, jadi tidak bisa membocorkan order orang lain
    const existing = await findExisting();
    if (existing) return { status: 200, body: existing };

    // 5b. Batas order per pelanggan & zona layanan
    const limited = await checkCustomerLimits(db, customer_id, env);
    if (limited) return limited;
    const outsideArea = await checkServiceArea(db, input, env);
    if (outsideArea) return outsideArea;

    // 6. Aturan tarif aktif
    const { data: rules, error: rulesError } = await db
      .from('tariff_rules')
      .select('*')
      .eq('service_type_id', input.service_type_id)
      .eq('status', 'active')
      .maybeSingle();
    if (rulesError) {
      console.error('[orders] tariff lookup failed', rulesError);
      return fail(500, 'INTERNAL_SERVER_ERROR', 'Terjadi kesalahan internal saat membaca tarif.');
    }
    if (!rules) {
      return fail(404, 'TARIFF_NOT_FOUND', 'Aturan tarif aktif untuk layanan ini tidak ditemukan.');
    }

    // 7. Jarak jalan nyata
    const route = await measureRoadDistanceKm(input, env, fetchImpl);
    if (!route.ok) return route.result;
    const maxTripKm = intEnv(env.MAX_TRIP_DISTANCE_KM, 60);
    if (route.km > maxTripKm) {
      return fail(422, 'TRIP_TOO_LONG', `Jarak perjalanan melebihi batas ${maxTripKm} km.`);
    }

    // 8. Tarif + snapshot
    const fare = calculateFare(rules, route.km);
    const calculation_details = {
      rule_id: rules.id,
      rule_version: rules.version,
      service_type_id: rules.service_type_id,
      base_fare_idr: rules.base_fare_idr,
      included_distance_km: fare.includedKm,
      fare_per_km_idr: rules.fare_per_km_idr,
      minimum_fare_idr: rules.minimum_fare_idr,
      booking_fee_idr: fare.bookingFee,
      measured_distance_km: route.km,
      routing_provider: route.provider,
      distance_fare_idr: fare.distanceFare,
      calculated_fare_idr: fare.calculatedFare,
      final_fare_idr: fare.finalFare,
      calculated_at: new Date().toISOString(),
    };

    // 9. Insert
    const { data: order, error: insertError } = await db
      .from('orders')
      .insert([{
        customer_id,
        service_type_id: input.service_type_id,
        pickup_address: input.pickup_address,
        pickup_lat: input.pickup_lat,
        pickup_lng: input.pickup_lng,
        dropoff_address: input.dropoff_address,
        dropoff_lat: input.dropoff_lat,
        dropoff_lng: input.dropoff_lng,
        notes: input.notes,
        estimated_distance_km: route.km,
        estimated_fare_idr: fare.finalFare,
        tariff_version: String(rules.version),
        calculation_details,
        status: 'searching',
        idempotency_key: idem.key,
      }])
      .select()
      .single();

    if (insertError) {
      // Balapan dua request dengan key sama: unique index menolak yang kedua
      if ((insertError as any).code === '23505' && idem.key) {
        const winner = await findExisting();
        if (winner) return { status: 200, body: winner };
      }
      console.error('[orders] insert failed', insertError);
      return fail(500, 'DATABASE_INSERT_FAILED', 'Gagal menyimpan pesanan.');
    }

    return { status: 201, body: order };
  } catch (err) {
    console.error('[orders] unexpected error', err);
    return fail(500, 'INTERNAL_SERVER_ERROR', 'Terjadi kesalahan internal server saat membuat pesanan.');
  }
}
