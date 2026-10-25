// Cloudflare Pages Function: GET /api/health
import { buildCorsHeaders, OrderEnv } from '../../shared/orderService';

type Context = { request: Request; env: OrderEnv & Record<string, string | undefined> };

export async function onRequestGet({ request, env }: Context): Promise<Response> {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const supabaseAnon = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '';
  const supabaseService = env.SUPABASE_SERVICE_ROLE_KEY || '';

  const body = {
    status: 'healthy',
    runtime: 'cloudflare-pages-function',
    subsystem: 'kawai-0511-edge-api',
    timestamp: new Date().toISOString(),
    supabase_configured: Boolean(supabaseUrl && (supabaseAnon || supabaseService)),
    routing_configured: Boolean(env.ROUTING_PROVIDER && env.ROUTING_PROVIDER !== 'none'),
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      ...buildCorsHeaders(request.headers.get('Origin'), env),
    },
  });
}

export async function onRequestOptions({ request, env }: Context): Promise<Response> {
  return new Response(null, { status: 204, headers: buildCorsHeaders(request.headers.get('Origin'), env) });
}
