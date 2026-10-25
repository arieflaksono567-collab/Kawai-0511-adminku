import { createClient } from '@supabase/supabase-js';

// Global edge idempotency cache for duplicate request prevention
const edgeIdempotencyStore = new Map<string, any>();

export async function onRequestPost(context: { request: Request; env: Record<string, string> }): Promise<Response> {
  const { request, env } = context;

  const corsHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key, x-idempotency-key',
  };

  const jsonResponse = (data: any, status = 200) => {
    return new Response(JSON.stringify(data), { status, headers: corsHeaders });
  };

  // 1. Validate Authorization header
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({
      error: 'Otorisasi ditolak: Header Authorization Bearer token wajib disertakan.',
      code: 'UNAUTHORIZED'
    }, 401);
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return jsonResponse({
      error: 'Otorisasi ditolak: Bearer token tidak boleh kosong.',
      code: 'UNAUTHORIZED'
    }, 401);
  }

  // 2. Supabase Environment Configuration
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || '';
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || (!supabaseAnonKey && !supabaseServiceRoleKey)) {
    return jsonResponse({
      error: 'Layanan database Supabase belum dikonfigurasi pada server backend (SUPABASE_URL atau kunci Supabase belum disetel).',
      code: 'SUPABASE_NOT_CONFIGURED'
    }, 503);
  }

  // 3. User verification using authClient
  const authClient = supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } })
    : createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let customer_id: string;
  try {
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData?.user) {
      return jsonResponse({
        error: 'Sesi token tidak valid atau telah kedaluwarsa.',
        code: 'INVALID_TOKEN'
      }, 401);
    }
    customer_id = authData.user.id;
  } catch {
    return jsonResponse({
      error: 'Gagal memverifikasi token autentikasi.',
      code: 'INVALID_TOKEN'
    }, 401);
  }

  // 4. Idempotency Check
  const idempotencyKey = request.headers.get('Idempotency-Key') || request.headers.get('idempotency-key') || request.headers.get('x-idempotency-key');
  if (idempotencyKey && edgeIdempotencyStore.has(idempotencyKey.trim())) {
    return jsonResponse(edgeIdempotencyStore.get(idempotencyKey.trim()), 200);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({
      error: 'Format body JSON tidak valid.',
      code: 'INVALID_JSON'
    }, 400);
  }

  const {
    service_type_id,
    pickup_lat,
    pickup_lng,
    dropoff_lat,
    dropoff_lng,
    pickup_address,
    dropoff_address,
    notes
  } = body || {};

  if (!service_type_id || !pickup_address || !dropoff_address) {
    return jsonResponse({
      error: 'Parameter tidak lengkap: service_type_id, pickup_address, dan dropoff_address wajib diisi.',
      code: 'INVALID_PARAMETERS'
    }, 400);
  }

  // 5. Coordinate validation
  const latP = Number(pickup_lat);
  const lngP = Number(pickup_lng);
  const latD = Number(dropoff_lat);
  const lngD = Number(dropoff_lng);

  if (
    isNaN(latP) || isNaN(lngP) || isNaN(latD) || isNaN(lngD) ||
    latP < -90 || latP > 90 || latD < -90 || latD > 90 ||
    lngP < -180 || lngP > 180 || lngD < -180 || lngD > 180
  ) {
    return jsonResponse({
      error: 'Koordinat tidak valid: Lintang harus antara -90 dan 90, bujur antara -180 dan 180.',
      code: 'INVALID_COORDINATES'
    }, 400);
  }

  // 6. DB Client setup
  const dbClient = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } }
      });

  try {
    // 7. Fetch active tariff rule
    const { data: rules, error: rulesError } = await dbClient
      .from('tariff_rules')
      .select('*')
      .eq('service_type_id', service_type_id)
      .eq('status', 'active')
      .maybeSingle();

    if (rulesError || !rules) {
      return jsonResponse({
        error: `Aturan tarif aktif untuk service_type_id "${service_type_id}" tidak ditemukan dalam database.`,
        code: 'TARIFF_NOT_FOUND'
      }, 404);
    }

    // 8. Routing distance calculation
    const provider = env.ROUTING_PROVIDER || 'none';
    if (!provider || provider === 'none') {
      return jsonResponse({
        error: 'Penyedia routing jalan nyata belum dikonfigurasi (ROUTING_PROVIDER belum disetel pada environment server). Tarif tidak dapat dihitung tanpa jarak jalan nyata.',
        code: 'ROUTING_NOT_CONFIGURED'
      }, 503);
    }

    let distanceKm: number;
    let routingProviderName = provider;

    if (provider === 'osrm') {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${lngP},${latP};${lngD},${latD}?overview=false`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!resp.ok) {
          return jsonResponse({
            error: 'Layanan routing gagal mengembalikan jarak jalan nyata.',
            code: 'ROUTING_FAILED'
          }, 502);
        }
        const routingData = await resp.json() as any;
        if (!routingData.routes || !routingData.routes[0]) {
          return jsonResponse({
            error: 'Tidak ditemukan rute jalan yang dapat dilalui antara titik penjemputan dan tujuan.',
            code: 'NO_ROUTE_FOUND'
          }, 422);
        }
        distanceKm = Number((routingData.routes[0].distance / 1000).toFixed(2));
        routingProviderName = 'osrm';
      } catch (routingErr: any) {
        return jsonResponse({
          error: `Gagal menghubungi penyedia routing jalan: ${routingErr.message || 'Network / Timeout error'}`,
          code: 'ROUTING_FAILED'
        }, 502);
      }
    } else {
      return jsonResponse({
        error: `Penyedia routing "${provider}" belum didukung atau memerlukan konfigurasi tambahan.`,
        code: 'UNSUPPORTED_ROUTING_PROVIDER'
      }, 503);
    }

    // 9. Calculate Fare
    const includedKm = Number(rules.included_distance_km) || 0;
    const additionalDistance = Math.max(0, distanceKm - includedKm);
    const distanceFare = Math.round(additionalDistance * Number(rules.fare_per_km_idr));
    const bookingFee = Number(rules.booking_fee_idr) || 0;
    const calculatedFare = Number(rules.base_fare_idr) + distanceFare + bookingFee;
    const finalFare = Math.max(calculatedFare, Number(rules.minimum_fare_idr));

    // 10. Prepare Snapshot
    const calculation_details = {
      rule_id: rules.id,
      rule_version: rules.version,
      service_type_id: rules.service_type_id,
      base_fare_idr: rules.base_fare_idr,
      included_distance_km: includedKm,
      fare_per_km_idr: rules.fare_per_km_idr,
      minimum_fare_idr: rules.minimum_fare_idr,
      booking_fee_idr: bookingFee,
      measured_distance_km: distanceKm,
      routing_provider: routingProviderName,
      distance_fare_idr: distanceFare,
      calculated_fare_idr: calculatedFare,
      final_fare_idr: finalFare,
      calculated_at: new Date().toISOString()
    };

    // 11. Insert Order
    const { data: order, error: insertError } = await dbClient
      .from('orders')
      .insert([{
        customer_id,
        service_type_id,
        pickup_address,
        pickup_lat: latP,
        pickup_lng: lngP,
        dropoff_address,
        dropoff_lat: latD,
        dropoff_lng: lngD,
        notes: notes || null,
        estimated_distance_km: distanceKm,
        estimated_fare_idr: finalFare,
        tariff_version: rules.version.toString(),
        calculation_details,
        status: 'searching'
      }])
      .select()
      .single();

    if (insertError) {
      return jsonResponse({
        error: `Gagal menyimpan pesanan ke database Supabase: ${insertError.message}`,
        code: 'DATABASE_INSERT_FAILED'
      }, 500);
    }

    if (idempotencyKey) {
      edgeIdempotencyStore.set(idempotencyKey.trim(), order);
    }

    return jsonResponse(order, 201);
  } catch (err: any) {
    return jsonResponse({
      error: err.message || 'Terjadi kesalahan internal server saat membuat pesanan.',
      code: 'INTERNAL_SERVER_ERROR'
    }, 500);
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key, x-idempotency-key',
    },
  });
}
