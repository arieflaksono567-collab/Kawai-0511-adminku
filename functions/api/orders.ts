// Cloudflare Pages Function: POST /api/orders
// Logika order dipakai bersama dengan server.ts melalui shared/orderService.ts.
import { buildCorsHeaders, handleCreateOrder, OrderEnv } from '../../shared/orderService';

type Context = { request: Request; env: OrderEnv };

export async function onRequestPost({ request, env }: Context): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    ...buildCorsHeaders(request.headers.get('Origin'), env),
  };

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
