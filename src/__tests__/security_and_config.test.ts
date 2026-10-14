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

test('3. Supabase production schema alignment verification', () => {
  const schemaPath = path.resolve(process.cwd(), 'supabase/migrations/20261014000004_align_production_schema.sql');
  assert.ok(fs.existsSync(schemaPath), 'Production alignment migration must exist');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  
  // Verify aligned production tables
  assert.ok(sql.includes('public.user_profiles'), 'Schema must define user_profiles table');
  assert.ok(sql.includes('public.driver_profiles'), 'Schema must define driver_profiles table');
  assert.ok(sql.includes('public.orders'), 'Schema must define orders table');
  assert.ok(sql.includes('public.service_zones'), 'Schema must define service_zones table');
  assert.ok(sql.includes('public.audit_logs'), 'Schema must define audit_logs table');
  assert.ok(sql.includes('public.payment_transactions'), 'Schema must define payment_transactions table');
  assert.ok(sql.includes('public.support_tickets'), 'Schema must define support_tickets table');

  // Verify RLS enforcement
  assert.ok(sql.includes('ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;'), 'RLS must be enabled on user_profiles');
  assert.ok(sql.includes('ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;'), 'RLS must be enabled on driver_profiles');
  assert.ok(sql.includes('ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;'), 'RLS must be enabled on orders');
  assert.ok(sql.includes('ALTER TABLE public.service_zones ENABLE ROW LEVEL SECURITY;'), 'RLS must be enabled on service_zones');
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

test('6. Verify API data access layer structure, error handling, and aligned tables', async () => {
  const apiPath = path.resolve(process.cwd(), 'src/lib/api.ts');
  assert.ok(fs.existsSync(apiPath), 'src/lib/api.ts must exist');
  const content = fs.readFileSync(apiPath, 'utf-8');
  assert.ok(content.includes('isSimulation: boolean'), 'API must return isSimulation flag');
  assert.ok(content.includes('user_profiles'), 'API must reference user_profiles table');
  assert.ok(content.includes('driver_profiles'), 'API must reference driver_profiles table');
  assert.ok(content.includes('service_zones'), 'API must reference service_zones table');
  assert.ok(content.includes('orders'), 'API must reference orders table');
});

test('7. Verify GitHub Actions CI workflow exists', () => {
  const ciPath = path.resolve(process.cwd(), '.github/workflows/ci.yml');
  assert.ok(fs.existsSync(ciPath), '.github/workflows/ci.yml must exist');
});
