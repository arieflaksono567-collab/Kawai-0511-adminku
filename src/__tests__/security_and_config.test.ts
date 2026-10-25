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

test('2. Cloudflare Pages security headers verification', async () => {
  // dist/_headers kini dibuat saat build dari shared/securityHeaders.ts
  const { renderCloudflareHeadersFile } = await import('../../shared/securityHeaders');
  const content = renderCloudflareHeadersFile({ supabaseUrl: 'https://abc.supabase.co' });
  assert.ok(content.includes('X-Frame-Options: DENY'), 'Must include X-Frame-Options');
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

test('8. Verify KAWAI 0511 brand identity assets and reference navigation views', () => {
  const brandFiles = [
    'src/components/KawaiLogo.tsx',
    'src/components/KawaiMascot.tsx',
    'src/features/payments/PaymentsPage.tsx',
    'src/features/services/ServicesPage.tsx',
    'src/features/support/SupportPage.tsx',
  ];

  for (const relPath of brandFiles) {
    const fullPath = path.resolve(process.cwd(), relPath);
    assert.ok(fs.existsSync(fullPath), `Brand component ${relPath} must exist`);
  }

  const logoContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/KawaiLogo.tsx'), 'utf-8');
  assert.ok(logoContent.includes('KAWAI'), 'Logo must contain KAWAI product name');
  assert.ok(logoContent.includes('0511'), 'Logo must contain 0511 area identifier');

  const mascotContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/KawaiMascot.tsx'), 'utf-8');
  assert.ok(mascotContent.includes('Bersama KAWAI 0511'), 'Mascot must include slogan text');
});

test('9. Verify DashboardView components matching reference design layout', () => {
  const dashPath = path.resolve(process.cwd(), 'src/components/DashboardView.tsx');
  const dashContent = fs.readFileSync(dashPath, 'utf-8');

  // Verify Header & 4 Stat Cards
  assert.ok(dashContent.includes('Ringkasan Operasional'), 'Dashboard must contain Ringkasan Operasional header');
  assert.ok(dashContent.includes('Pesanan Hari Ini'), 'Card 1: Pesanan Hari Ini');
  assert.ok(dashContent.includes('Mitra Aktif'), 'Card 2: Mitra Aktif');
  assert.ok(dashContent.includes('Pengguna'), 'Card 3: Pengguna');
  assert.ok(dashContent.includes('Pendapatan Hari Ini'), 'Card 4: Pendapatan Hari Ini');

  // Verify Main Grid Sections
  assert.ok(dashContent.includes('Tren Pesanan'), 'Section: Tren Pesanan chart');
  assert.ok(dashContent.includes('Pesanan Terbaru'), 'Section: Pesanan Terbaru table');
  assert.ok(dashContent.includes('Zona Operasional'), 'Section: Zona Operasional list');
  assert.ok(dashContent.includes('Status Sistem'), 'Section: Status Sistem card');

  // Verify Chart & Table features
  assert.ok(dashContent.includes('Selesai'), 'Legend Selesai');
  assert.ok(dashContent.includes('Dibatalkan'), 'Legend Dibatalkan');
  assert.ok(dashContent.includes('Semua sistem berfungsi dengan baik'), 'System health check card');
});

test('10. Verify 13 official Supabase production tables in schema.sql', () => {
  const schemaPath = path.resolve(process.cwd(), 'supabase/schema.sql');
  assert.ok(fs.existsSync(schemaPath), 'schema.sql must exist');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  const requiredTables = [
    'public.user_profiles',
    'public.driver_profiles',
    'public.orders',
    'public.order_status_history',
    'public.service_types',
    'public.service_zones',
    'public.tariff_rules',
    'public.payment_transactions',
    'public.support_tickets',
    'public.admin_settings',
    'public.audit_logs',
    'public.system_change_runs',
    'public.system_readiness_status',
  ];

  for (const table of requiredTables) {
    assert.ok(sql.includes(table), `schema.sql must define ${table}`);
    assert.ok(sql.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`), `RLS must be enabled on ${table}`);
  }
});

test('11. Verify package-lock.json and GitHub Actions cache reproducibility', () => {
  const lockPath = path.resolve(process.cwd(), 'package-lock.json');
  assert.ok(fs.existsSync(lockPath), 'package-lock.json must exist in root for actions/setup-node npm cache');
  
  const lockContent = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
  assert.strictEqual(lockContent.name, 'kawai-0511-admin', 'package-lock.json name must match package.json');
  assert.ok(lockContent.lockfileVersion >= 2, 'Must be valid modern lockfile');

  const ciPath = path.resolve(process.cwd(), '.github/workflows/ci.yml');
  const ciContent = fs.readFileSync(ciPath, 'utf-8');
  assert.ok(ciContent.includes("cache: 'npm'"), 'CI workflow must use npm cache');
  assert.ok(ciContent.includes('npm ci'), 'CI workflow must use npm ci for reproducible installs');
});

test('12. Verify active Supabase enum types and data transparency in types & views', () => {
  const dbTypesPath = path.resolve(process.cwd(), 'src/types/database.ts');
  const typesContent = fs.readFileSync(dbTypesPath, 'utf-8');
  
  // Official vehicle types
  assert.ok(typesContent.includes("'motorcycle' | 'car' | 'van' | 'other'"), 'DbVehicleType must match active schema');
  // Official order statuses
  assert.ok(typesContent.includes("'searching' | 'assigned' | 'arrived' | 'in_trip' | 'completed' | 'cancelled'"), 'DbOrderStatus must match active schema');

  // Verify DashboardView transparency banner exists
  const dashPath = path.resolve(process.cwd(), 'src/components/DashboardView.tsx');
  const dashContent = fs.readFileSync(dashPath, 'utf-8');
  assert.ok(dashContent.includes('Status Transparansi Data: Live vs Evaluasi'), 'DashboardView must have transparency banner');
  assert.ok(dashContent.includes('Belum ada data pesanan pada database Supabase'), 'DashboardView must handle zero orders without fake data');
});

test('13. Verify 6 official Governance tables (KIGS) and old_status schema synchronization', () => {
  const schemaPath = path.resolve(process.cwd(), 'supabase/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  const governanceTables = [
    'governance.canonical_terms',
    'governance.term_proposals',
    'governance.change_requests',
    'governance.audit_events',
    'governance.rollback_events',
    'governance.registry_state',
  ];

  for (const table of governanceTables) {
    assert.ok(sql.includes(table), `schema.sql must define ${table}`);
    assert.ok(sql.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`), `RLS must be enabled on ${table}`);
  }

  // Verify old_status in order_status_history
  assert.ok(sql.includes('old_status TEXT'), 'order_status_history must contain old_status column');

  // Verify types in src/types/database.ts
  const dbTypesPath = path.resolve(process.cwd(), 'src/types/database.ts');
  const typesContent = fs.readFileSync(dbTypesPath, 'utf-8');
  assert.ok(typesContent.includes('DbCanonicalTerm'), 'types/database.ts must define DbCanonicalTerm');
  assert.ok(typesContent.includes('DbChangeRequest'), 'types/database.ts must define DbChangeRequest');
  assert.ok(typesContent.includes('DbRegistryState'), 'types/database.ts must define DbRegistryState');
  assert.ok(typesContent.includes('old_status: string | null'), 'DbOrderStatusHistory must define old_status');
});


