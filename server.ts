import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { buildCorsHeaders, handleCreateOrder, OrderEnv } from './shared/orderService';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 3000;
const env = process.env as OrderEnv;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const hasSupabaseKey = Boolean(
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function startServer() {
  const app = express();
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  // CORS: hanya origin yang terdaftar di ALLOWED_ORIGINS (dipisah koma).
  // Permintaan same-origin dari panel ini sendiri tidak membutuhkan CORS.
  app.use((req, res, next) => {
    const headers = buildCorsHeaders(req.headers.origin, env);
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // Health check
  const healthHandler = (_req: express.Request, res: express.Response) => {
    res.status(200).json({
      status: 'healthy',
      subsystem: 'kawai-0511-backend',
      uptime_seconds: process.uptime(),
      timestamp: new Date().toISOString(),
      supabase_configured: Boolean(supabaseUrl && hasSupabaseKey),
      routing_configured: Boolean(process.env.ROUTING_PROVIDER && process.env.ROUTING_PROVIDER !== 'none'),
    });
  };
  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // Order creation (logika bersama dengan Cloudflare Pages Function)
  app.post('/api/orders', async (req, res) => {
    const idemHeader = req.headers['idempotency-key'] ?? req.headers['x-idempotency-key'];
    const result = await handleCreateOrder({
      authHeader: req.headers.authorization,
      idempotencyKey: Array.isArray(idemHeader) ? idemHeader[0] : idemHeader,
      body: req.body,
      env,
    });
    res.status(result.status).json(result.body);
  });

  if (!isProduction) {
    // Development: Vite dev server (dimuat dinamis agar tidak dibutuhkan di produksi)
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom' });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    // Production: sajikan hasil build statis dari dist/
    const distDir = path.resolve(__dirname, 'dist');
    const indexHtml = path.join(distDir, 'index.html');
    if (!fs.existsSync(indexHtml)) {
      console.error(`dist/index.html tidak ditemukan di ${distDir}. Jalankan "npm run build" terlebih dahulu.`);
      process.exit(1);
    }
    app.use(express.static(distDir, { index: false, maxAge: '1h' }));
    app.get('*', (_req, res) => res.sendFile(indexHtml));
  }

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer();
