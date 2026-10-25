// Cloudflare Pages Function: POST /api/orders
// Logika order dipakai bersama dengan server.ts melalui shared/orderService.ts.
import { buildCorsHeaders, createRateLimiter, handleCreateOrder, OrderEnv } from '../../shared/orderService';

// Best-effort per isolate. Untuk perlindungan penuh di edge, tambahkan juga
// aturan Rate Limiting Cloudflare (WAF) untuk path /api/orders.
const ipLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });

type Context = { request: Request; env: OrderEnv };

export async function onRequestPost({ request, env }: Context): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    ...buildCorsHeaders(request.headers.get('Origin'), env),
  };

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const limit = ipLimiter.hit(ip);
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({ error: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.', code: 'RATE_LIMITED' }),
      { status: 429, headers: { ...headers, 'Retry-After': String(limit.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Format body JSON tidak valid.', code: 'INVALID_JSON' }),
      { status: 400, headers },
    );
  }

  const result = await handleCreateOrder({
    authHeader: request.headers.get('Authorization'),
    idempotencyKey: request.headers.get('Idempotency-Key') || request.headers.get('x-idempotency-key'),
    body,
    env,
  });

  return new Response(JSON.stringify(result.body), { status: result.status, headers });
}

export async function onRequestOptions({ request, env }: Context): Promise<Response> {
  return new Response(null, { status: 204, headers: buildCorsHeaders(request.headers.get('Origin'), env) });
}
