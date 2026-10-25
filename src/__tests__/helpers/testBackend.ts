// Backend uji untuk tes end-to-end.
//
// Meniru subset PostgREST + Supabase Auth di atas PGlite (PostgreSQL in-memory)
// sehingga klien `@supabase/supabase-js` ASLI dapat dipakai oleh kode produksi
// (shared/orderService.ts dan src/lib/api.ts) tanpa tiruan per fungsi.
// Setiap request dijalankan dalam transaksi dengan peran database yang sesuai
// token (anon / authenticated + jwt sub / service_role), jadi RLS dan trigger
// berlaku persis seperti di Supabase.
//
// Hanya untuk tes. Tidak ada rahasia: kunci di sini adalah string dummy.
import type { PGlite } from '@electric-sql/pglite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { serverClientOptions } from '../../../shared/orderService';

export const TEST_URL = 'http://kawai-test.local';
export const TEST_ANON_KEY = 'test-anon-key-not-a-secret';
export const TEST_SERVICE_KEY = 'test-service-key-not-a-secret';
export const userToken = (uid: string) => `test-user:${uid}`;

const ident = (name: string) => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) throw new Error(`Nama kolom/tabel tidak valid: ${name}`);
  return `"${name}"`;
};

type Filter = { sql: string; params: unknown[] };

function parseFilters(search: URLSearchParams, startIndex: number): Filter {
  const parts: string[] = [];
  const params: unknown[] = [];
  let i = startIndex;
  for (const [key, raw] of search.entries()) {
    if (['select', 'order', 'limit', 'offset', 'columns', 'on_conflict'].includes(key)) continue;
    const m = /^(not\.)?(eq|neq|gt|gte|lt|lte|is|in|like|ilike)\.(.*)$/s.exec(raw);
    if (!m) throw new Error(`Filter tidak didukung backend uji: ${key}=${raw}`);
    const [, not, op, value] = m;
    const col = ident(key);
    let expr: string;
    if (op === 'is') {
      expr = `${col} IS ${value === 'null' ? 'NULL' : value === 'true' ? 'TRUE' : 'FALSE'}`;
    } else if (op === 'in') {
      const items = value.replace(/^\(|\)$/g, '').split(',').map((v) => v.replace(/^"|"$/g, ''));
      const ph = items.map((v) => { params.push(v); return `$${i++}`; });
      expr = `${col}::text IN (${ph.join(', ')})`;
    } else {
      params.push(value);
      const sqlOp = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', like: 'LIKE', ilike: 'ILIKE' }[op]!;
      expr = `${col}::text ${sqlOp} $${i++}`;
      if (['gt', 'gte', 'lt', 'lte'].includes(op)) expr = `${col} ${sqlOp} $${i - 1}`;
    }
    parts.push(not ? `NOT (${expr})` : expr);
  }
  return { sql: parts.length ? ` WHERE ${parts.join(' AND ')}` : '', params };
}

function parseSelect(select: string | null): string {
  if (!select || select.trim() === '*') return '*';
  if (select.includes('(')) throw new Error('Embed/relasi tidak didukung backend uji');
  return select.split(',').map((c) => c.trim()).filter(Boolean).map((c) => (c === '*' ? '*' : ident(c))).join(', ');
}

function parseOrder(order: string | null): string {
  if (!order) return '';
  return ' ORDER BY ' + order.split(',').map((o) => {
    const [col, dir] = o.split('.');
    return `${ident(col)} ${dir === 'desc' ? 'DESC' : 'ASC'}`;
  }).join(', ');
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

export function createTestBackend(db: PGlite) {
  // PGlite memakai satu koneksi: request diserialkan agar transaksi tidak bertumpuk.
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = queue.then(fn, fn);
    queue = run.catch(() => undefined);
    return run;
  };

  async function asRole<T>(bearer: string | null, fn: () => Promise<T>): Promise<T> {
    let role = 'anon';
    let sub = '';
    if (bearer === TEST_SERVICE_KEY) role = 'service_role';
    else if (bearer?.startsWith('test-user:')) { role = 'authenticated'; sub = bearer.slice('test-user:'.length); }
    await db.exec('BEGIN');
    try {
      await db.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [sub]);
      await db.exec(`SET LOCAL ROLE ${role}`);
      const out = await fn();
      await db.exec('COMMIT');
      return out;
    } catch (e) {
      await db.exec('ROLLBACK');
      throw e;
    }
  }

  const fetchImpl: typeof fetch = async (input, init) => {
    const req = new Request(input as any, init);
    const url = new URL(req.url);
    const bearer = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '') || null;

    if (url.pathname === '/auth/v1/user') {
      if (bearer?.startsWith('test-user:')) {
        const id = bearer.slice('test-user:'.length);
        return json(200, { id, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() });
      }
      return json(401, { code: 401, error_code: 'bad_jwt', msg: 'invalid JWT' });
    }

    const m = /^\/rest\/v1\/([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(url.pathname);
    if (!m) return json(404, { message: `Path tidak didukung backend uji: ${url.pathname}` });
    const table = `public.${ident(m[1])}`;
    const prefer = req.headers.get('Prefer') || '';
    const wantsObject = (req.headers.get('Accept') || '').includes('application/vnd.pgrst.object+json');
    const method = req.method.toUpperCase();
    const bodyText = method === 'GET' || method === 'HEAD' ? '' : await req.text();

    return serial(async () => {
      try {
        const result = await asRole(bearer, async () => {
          if (method === 'GET' || method === 'HEAD') {
            const f = parseFilters(url.searchParams, 1);
            const limit = url.searchParams.get('limit');
            const rows = (await db.query(
              `SELECT ${parseSelect(url.searchParams.get('select'))} FROM ${table}${f.sql}${parseOrder(url.searchParams.get('order'))}${limit ? ` LIMIT ${Number(limit)}` : ''}`,
              f.params,
            )).rows;
            let count: number | undefined;
            if (/count=exact/.test(prefer)) {
              count = Number(((await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${table}${f.sql}`, f.params)).rows[0]).n);
            }
            return { rows, count, status: 200 };
          }

          if (method === 'POST') {
            const payload = JSON.parse(bodyText || '[]');
            const list: Record<string, unknown>[] = Array.isArray(payload) ? payload : [payload];
            const out: unknown[] = [];
            for (const row of list) {
              const cols = Object.keys(row);
              const params = cols.map((c) => {
                const v = row[c];
                return v !== null && typeof v === 'object' ? JSON.stringify(v) : v;
              });
              const sql = cols.length
                ? `INSERT INTO ${table} (${cols.map(ident).join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`
                : `INSERT INTO ${table} DEFAULT VALUES`;
              const wantsRows = /return=representation/.test(prefer);
              const r = await db.query(wantsRows ? `${sql} RETURNING ${parseSelect(url.searchParams.get('select'))}` : sql, params);
              out.push(...r.rows);
            }
            return { rows: out, status: 201 };
          }

          if (method === 'PATCH') {
            const patch = JSON.parse(bodyText || '{}') as Record<string, unknown>;
            const cols = Object.keys(patch);
            const params = cols.map((c) => {
              const v = patch[c];
              return v !== null && typeof v === 'object' ? JSON.stringify(v) : v;
            });
            const f = parseFilters(url.searchParams, cols.length + 1);
            const wantsRows = /return=representation/.test(prefer);
            const r = await db.query(
              `UPDATE ${table} SET ${cols.map((c, i) => `${ident(c)} = $${i + 1}`).join(', ')}${f.sql}` +
                (wantsRows ? ` RETURNING ${parseSelect(url.searchParams.get('select'))}` : ''),
              [...params, ...f.params],
            );
            return { rows: r.rows, status: 200 };
          }

          throw new Error(`Metode tidak didukung backend uji: ${method}`);
        });

        const headers: Record<string, string> = {};
        if (result.count !== undefined) headers['Content-Range'] = `0-${Math.max(result.rows.length - 1, 0)}/${result.count}`;
        if (method === 'HEAD') return new Response(null, { status: 200, headers });
        if (wantsObject) {
          if (result.rows.length !== 1) {
            return json(406, {
              code: 'PGRST116',
              message: 'JSON object requested, multiple (or no) rows returned',
              details: `The result contains ${result.rows.length} rows`,
              hint: null,
            });
          }
          return json(result.status, result.rows[0], headers);
        }
        if (method !== 'GET' && !/return=representation/.test(prefer)) return new Response(null, { status: 201 });
        return json(result.status, result.rows, headers);
      } catch (e: any) {
        const code = e?.code || 'XX000';
        const status = code === '23505' ? 409 : code === '42501' ? 403 : 400;
        return json(status, { code, message: e?.message || String(e), details: e?.detail ?? null, hint: e?.hint ?? null });
      }
    });
  };

  /** Klien Supabase asli yang bertindak sebagai pengguna tertentu. */
  const clientAs = (uid: string): SupabaseClient =>
    createClient(TEST_URL, TEST_ANON_KEY, serverClientOptions({
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetchImpl, headers: { Authorization: `Bearer ${userToken(uid)}` } },
    }));

  /** Pembuat klien untuk shared/orderService.ts (deps.createClient). */
  const createClientForServer = ((url: string, key: string, options: any = {}) =>
    createClient(url, key, { ...options, global: { ...(options.global || {}), fetch: fetchImpl } })) as typeof createClient;

  return { fetch: fetchImpl, clientAs, createClientForServer };
}
