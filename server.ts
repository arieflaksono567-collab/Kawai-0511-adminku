import express from 'express';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// User Auth client using anon/publishable key for verifying JWT tokens
const authClient = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } }) 
  : null;

// Privileged administrative client using service_role key for backend operations
const adminClient = (supabaseUrl && supabaseServiceRoleKey) 
  ? createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } }) 
  : null;

async function startServer() {
  const app = express();
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  app.use(vite.middlewares);
  app.use(express.json());

  // CORS middleware for multi-origin hosting and Cloudflare Pages compatibility
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Idempotency-Key, x-idempotency-key');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Health check endpoints for deployment probes & container readiness
  const healthHandler = (_req: express.Request, res: express.Response) => {
    res.status(200).json({
      status: 'healthy',
      subsystem: 'kawai-0511-backend',
      uptime_seconds: process.uptime(),
      timestamp: new Date().toISOString(),
      supabase_configured: Boolean(supabaseUrl && (supabaseAnonKey || supabaseServiceRoleKey)),
      routing_configured: Boolean(process.env.ROUTING_PROVIDER && process.env.ROUTING_PROVIDER !== 'none'),
    });
  };
  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // In-memory idempotency store to prevent duplicate orders
  const idempotencyStore = new Map<string, any>();

  // Backend API Routes
  app.post('/api/orders', async (req, res) => {
    // 1. Validate Authorization header first (Token absence or malformed yields 401)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Otorisasi ditolak: Header Authorization Bearer token wajib disertakan.',
        code: 'UNAUTHORIZED' 
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return res.status(401).json({ 
        error: 'Otorisasi ditolak: Bearer token tidak boleh kosong.',
        code: 'UNAUTHORIZED' 
      });
    }

    // 2. Check Supabase connection readiness
    if (!supabaseUrl || (!supabaseAnonKey && !supabaseServiceRoleKey)) {
      return res.status(503).json({ 
        error: 'Layanan database Supabase belum dikonfigurasi pada server backend (SUPABASE_URL atau kunci Supabase belum disetel).',
        code: 'SUPABASE_NOT_CONFIGURED' 
      });
    }

    // 3. Verify Authentication Token with Supabase Auth
    // Use authClient (anon key) for token verification; fall back to adminClient if only service role is set
    const verifierClient = authClient || adminClient;
    if (!verifierClient) {
      return res.status(503).json({ 
        error: 'Layanan autentikasi Supabase belum dikonfigurasi.',
        code: 'SUPABASE_NOT_CONFIGURED' 
      });
    }

    let customer_id: string;
    try {
      const { data: authData, error: authError } = await verifierClient.auth.getUser(token);
      if (authError || !authData?.user) {
        return res.status(401).json({ 
          error: 'Sesi token tidak valid atau telah kedaluwarsa.',
          code: 'INVALID_TOKEN' 
        });
      }
      // CRITICAL SECURITY RULE: customer_id is strictly derived from verified token, NEVER from client body
      customer_id = authData.user.id;
    } catch (err: any) {
      return res.status(401).json({ 
        error: 'Gagal memverifikasi token autentikasi.',
        code: 'INVALID_TOKEN' 
      });
    }

    // 4. Check Idempotency Key
    const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    if (typeof idempotencyKey === 'string' && idempotencyKey.trim() && idempotencyStore.has(idempotencyKey.trim())) {
      return res.status(200).json(idempotencyStore.get(idempotencyKey.trim()));
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
    } = req.body || {};

    if (!service_type_id || !pickup_address || !dropoff_address) {
      return res.status(400).json({ 
        error: 'Parameter tidak lengkap: service_type_id, pickup_address, dan dropoff_address wajib diisi.',
        code: 'INVALID_PARAMETERS'
      });
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
      return res.status(400).json({ 
        error: 'Koordinat tidak valid: Lintang harus antara -90 dan 90, bujur antara -180 dan 180.',
        code: 'INVALID_COORDINATES'
      });
    }

    // 6. Privileged Database Client Setup
    const dbClient = adminClient || (authClient ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    }) : null);

    if (!dbClient) {
      return res.status(503).json({ 
        error: 'Klien database Supabase tidak tersedia untuk memproses pesanan.',
        code: 'SUPABASE_NOT_CONFIGURED' 
      });
    }

    try {
      // 7. Fetch Active Tariff Rules from Supabase (Source of Truth)
      const { data: rules, error: rulesError } = await dbClient
        .from('tariff_rules')
        .select('*')
        .eq('service_type_id', service_type_id)
        .eq('status', 'active')
        .maybeSingle();

      if (rulesError || !rules) {
        return res.status(404).json({ 
          error: `Aturan tarif aktif untuk service_type_id "${service_type_id}" tidak ditemukan dalam database.`,
          code: 'TARIFF_NOT_FOUND' 
        });
      }

      // 6. Real Road Routing Integration (No Fake / Placeholder Distance)
      const apiKey = process.env.ROUTING_API_KEY;
      const provider = process.env.ROUTING_PROVIDER || 'none';

      let distanceKm: number;
      let routingProviderName: string;

      if (!provider || provider === 'none') {
        return res.status(503).json({ 
          error: 'Penyedia routing jalan nyata belum dikonfigurasi (ROUTING_PROVIDER belum disetel pada environment server). Tarif tidak dapat dihitung tanpa jarak jalan nyata.',
          code: 'ROUTING_NOT_CONFIGURED' 
        });
      }

      if (provider === 'osrm') {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${lngP},${latP};${lngD},${latD}?overview=false`;
          const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
          if (!resp.ok) {
            return res.status(502).json({
              error: 'Layanan routing gagal mengembalikan jarak jalan nyata.',
              code: 'ROUTING_FAILED'
            });
          }
          const routingData = await resp.json() as any;
          if (!routingData.routes || !routingData.routes[0]) {
            return res.status(422).json({
              error: 'Tidak ditemukan rute jalan yang dapat dilalui antara titik penjemputan dan tujuan.',
              code: 'NO_ROUTE_FOUND'
            });
          }
          distanceKm = Number((routingData.routes[0].distance / 1000).toFixed(2));
          routingProviderName = 'osrm';
        } catch (routingErr: any) {
          return res.status(502).json({
            error: `Gagal menghubungi penyedia routing jalan: ${routingErr.message || 'Network / Timeout error'}`,
            code: 'ROUTING_FAILED'
          });
        }
      } else {
        if (!apiKey) {
          return res.status(503).json({ 
            error: `Penyedia routing "${provider}" memerlukan ROUTING_API_KEY yang belum disetel.`,
            code: 'ROUTING_NOT_CONFIGURED' 
          });
        }
        return res.status(503).json({
          error: `Penyedia routing "${provider}" belum didukung atau memerlukan konfigurasi tambahan.`,
          code: 'UNSUPPORTED_ROUTING_PROVIDER'
        });
      }

      // 7. Calculate Fare on Server
      const includedKm = Number(rules.included_distance_km) || 0;
      const additionalDistance = Math.max(0, distanceKm - includedKm);
      const distanceFare = Math.round(additionalDistance * Number(rules.fare_per_km_idr));
      const bookingFee = Number(rules.booking_fee_idr) || 0;
      const calculatedFare = Number(rules.base_fare_idr) + distanceFare + bookingFee;
      const finalFare = Math.max(calculatedFare, Number(rules.minimum_fare_idr));

      // 8. Prepare Tariff Snapshot
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

      // 9. Atomic Order Insertion with Snapshot
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
          calculation_details: calculation_details,
          status: 'searching'
        }])
        .select()
        .single();

      if (insertError) {
        return res.status(500).json({ 
          error: `Gagal menyimpan pesanan ke database Supabase: ${insertError.message}`,
          code: 'DATABASE_INSERT_FAILED'
        });
      }

      // Store in idempotency cache
      if (typeof idempotencyKey === 'string' && idempotencyKey.trim()) {
        idempotencyStore.set(idempotencyKey.trim(), order);
      }

      return res.status(201).json(order);
    } catch (error: any) {
      return res.status(500).json({ 
        error: error.message || 'Terjadi kesalahan internal server saat membuat pesanan.',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  });


  // Frontend Fallback
  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;
    try {
      let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e: any) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });

  app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });
}

startServer();
