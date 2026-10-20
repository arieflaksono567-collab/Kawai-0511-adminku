import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Security RLS Hardening - Migration audit', () => {
  const migrationPath = path.resolve('./supabase/migrations/20261020000001_harden_security.sql');
  const migration = fs.readFileSync(migrationPath, 'utf8');
  
  // Verify search_path is set in functions
  assert.ok(migration.includes('SECURITY DEFINER SET search_path = public'), 'Migration must set search_path on security definer functions');
  
  // Verify RLS policies added
  assert.ok(migration.includes('CREATE POLICY "Users can update their own profile"'), 'Users policy missing');
  assert.ok(migration.includes('CREATE POLICY "Customers can view their own orders"'), 'Customers policy missing');
});
