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
