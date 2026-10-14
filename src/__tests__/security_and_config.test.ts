import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('1. Cloudflare Pages SPA redirects file verification', () => {
  const redirectsPath = path.resolve(process.cwd(), 'public/_redirects');
  assert.ok(fs.existsSync(redirectsPath), 'public/_redirects must exist');
  const content = fs.readFileSync(redirectsPath, 'utf-8');
  assert.match(content, /\/\*\s+\/index\.html\s+200/, 'Redirects file must rewrite /* to /index.html 200');
});

test('2. Cloudflare Pages security headers verification', () => {
  const headersPath = path.resolve(process.cwd(), 'public/_headers');
  assert.ok(fs.existsSync(headersPath), 'public/_headers must exist');
  const content = fs.readFileSync(headersPath, 'utf-8');
  assert.ok(content.includes('X-Frame-Options: SAMEORIGIN'), 'Must include X-Frame-Options');
  assert.ok(content.includes('X-Content-Type-Options: nosniff'), 'Must include X-Content-Type-Options');
  assert.ok(content.includes('Content-Security-Policy'), 'Must include Content-Security-Policy');
});

test('3. Supabase schema security & RLS verification', () => {
  const schemaPath = path.resolve(process.cwd(), 'supabase/schema.sql');
  assert.ok(fs.existsSync(schemaPath), 'supabase/schema.sql must exist');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  
  // Verify required tables
  assert.ok(sql.includes('public.admin_users'), 'Schema must define admin_users table');
  assert.ok(sql.includes('public.drivers'), 'Schema must define drivers table');
  assert.ok(sql.includes('public.orders'), 'Schema must define orders table');
  assert.ok(sql.includes('public.operational_zones'), 'Schema must define operational_zones table');
  assert.ok(sql.includes('public.audit_logs'), 'Schema must define audit_logs table');

  // Verify RLS enforcement
  assert.ok(sql.includes('ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;'), 'RLS must be enabled on admin_users');
  assert.ok(sql.includes('ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;'), 'RLS must be enabled on drivers');
  assert.ok(sql.includes('ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;'), 'RLS must be enabled on orders');
  assert.ok(sql.includes('ALTER TABLE public.operational_zones ENABLE ROW LEVEL SECURITY;'), 'RLS must be enabled on operational_zones');
  assert.ok(sql.includes('ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;'), 'RLS must be enabled on audit_logs');

  // Verify security definer helper
  assert.ok(sql.includes('FUNCTION public.is_admin()'), 'Must define is_admin() security function');
});

test('4. Zero secret leak check in client code and .env.example', () => {
  const envExamplePath = path.resolve(process.cwd(), '.env.example');
  const envContent = fs.readFileSync(envExamplePath, 'utf-8');
  assert.ok(!envContent.includes('service_role_key_value'), 'No actual secrets in .env.example');
  assert.ok(envContent.includes('VITE_SUPABASE_ANON_KEY'), '.env.example must only ask for anon key');

  const supabaseClientPath = path.resolve(process.cwd(), 'src/lib/supabase.ts');
  const clientContent = fs.readFileSync(supabaseClientPath, 'utf-8');
  assert.ok(!clientContent.includes('service_role'), 'src/lib/supabase.ts must never contain service_role');
});

test('5. Verify all 11 required admin pages & components exist', () => {
  const requiredFiles = [
    'src/features/auth/LoginPage.tsx',
    'src/components/DashboardView.tsx',
    'src/features/users/UsersPage.tsx',
    'src/components/DriversView.tsx',
    'src/components/OrdersView.tsx',
    'src/features/orders/OrderDetailModal.tsx',
    'src/features/analytics/AnalyticsPage.tsx',
    'src/features/settings/SettingsPage.tsx',
    'src/features/profile/ProfilePage.tsx',
    'src/components/Forbidden403.tsx',
    'src/components/NotFound404.tsx',
  ];

  for (const relPath of requiredFiles) {
    const fullPath = path.resolve(process.cwd(), relPath);
    assert.ok(fs.existsSync(fullPath), `Required page/component ${relPath} must exist`);
  }
});

test('6. Verify API data access layer structure and simulation fallback', async () => {
  const apiPath = path.resolve(process.cwd(), 'src/lib/api.ts');
  assert.ok(fs.existsSync(apiPath), 'src/lib/api.ts must exist');
  const content = fs.readFileSync(apiPath, 'utf-8');
  assert.ok(content.includes('isSimulation: boolean'), 'API must return isSimulation flag');
  assert.ok(content.includes('getUsers'), 'API must define getUsers');
  assert.ok(content.includes('getDrivers'), 'API must define getDrivers');
  assert.ok(content.includes('getOrders'), 'API must define getOrders');
});

