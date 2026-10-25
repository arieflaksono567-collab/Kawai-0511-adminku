// ==============================================================================
// KAWAI 0511 — Security headers (satu sumber untuk Cloudflare `_headers` dan Express)
// ==============================================================================

export interface SecurityHeaderOptions {
  /** URL project Supabase, mis. https://xxxx.supabase.co */
  supabaseUrl?: string;
  /** URL backend terpisah (VITE_API_URL), bila frontend tidak memanggil same-origin */
  apiUrl?: string;
}

function toOrigin(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.hostname === 'localhost' ? u.origin : null;
  } catch {
    return null;
  }
}

export function buildContentSecurityPolicy(opts: SecurityHeaderOptions = {}): string {
  const connect = new Set<string>(["'self'", 'https://*.supabase.co', 'wss://*.supabase.co']);
  const supa = toOrigin(opts.supabaseUrl);
  if (supa) {
    connect.add(supa);
    connect.add(supa.replace(/^http/, 'ws'));
  }
  const api = toOrigin(opts.apiUrl);
  if (api) connect.add(api);

  return [
    "default-src 'self'",
    "script-src 'self'",
    // Tailwind & atribut style React membutuhkan inline style; script tetap ketat.
    "style-src 'self' 'unsafe-inline'",
    // Avatar/dokumen bisa berasal dari storage eksternal (HTTPS).
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${[...connect].join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export function buildSecurityHeaders(opts: SecurityHeaderOptions = {}): Record<string, string> {
  return {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(self), camera=(), microphone=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': buildContentSecurityPolicy(opts),
  };
}

/** Isi file `_headers` Cloudflare Pages. */
export function renderCloudflareHeadersFile(opts: SecurityHeaderOptions = {}): string {
  const lines = ['/*'];
  for (const [k, v] of Object.entries(buildSecurityHeaders(opts))) lines.push(`  ${k}: ${v}`);
  lines.push('', '/api/*', '  Cache-Control: no-store', '');
  return lines.join('\n');
}
