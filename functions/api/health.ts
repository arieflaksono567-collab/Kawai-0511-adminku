// Cloudflare Pages Function: GET /api/health
export async function onRequestGet(context: { request: Request; env: Record<string, string> }): Promise<Response> {
  const { env } = context;
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
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    },
  });
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key, x-idempotency-key',
    },
  });
}
