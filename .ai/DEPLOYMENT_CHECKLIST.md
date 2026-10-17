# KAWAI 0511 Admin Panel — Deployment Checklist

## Target Architecture: Cloudflare Pages + Supabase (rbfnjgrnojvzvrpyryms)

### 1. Pre-Deployment Verification (Local / CI)
- [x] Package dependencies resolve cleanly (`bun.lock` / `node_modules`).
- [x] TypeScript compiler passes without errors (`npm run lint` / `tsc --noEmit`).
- [x] Automated test suite passes (`npm test`).
- [x] Vite production build succeeds (`npm run build`).
- [x] Distribution bundle (`dist/`) contains:
  - `index.html`
  - `assets/*.js` and `assets/*.css`
  - `_redirects` (for SPA routing fallback)
  - `_headers` (for strict security response headers)

### 2. Supabase Configuration (Project: rbfnjgrnojvzvrpyryms)
- [x] Verify 13 official production tables:
  1. `public.user_profiles` (id, display_name, phone, avatar_url, role: customer/driver/admin, created_at, updated_at)
  2. `public.driver_profiles` (user_id PK, vehicle_type, vehicle_brand, vehicle_model, vehicle_plate, verification_status, is_online, ...)
  3. `public.orders` (id, customer_id, driver_id, service_type_id, status: searching/assigned/arrived/in_trip/completed/cancelled, ...)
  4. `public.order_status_history` (id, order_id, previous_status, new_status, changed_by, notes, created_at)
  5. `public.service_types` (id, code, name, description, base_fare_idr, fare_per_km_idr, minimum_fare_idr, is_active)
  6. `public.service_zones` (id, code, name, city, region, boundary, is_active)
  7. `public.tariff_rules` (id, service_type_id, name, version, status: draft/active/archived, base_fare_idr, ...)
  8. `public.payment_transactions` (id, order_id, user_id, provider, provider_reference, method, amount_idr, status, paid_at)
  9. `public.support_tickets` (id, customer_id, order_id, subject, category, description, status, priority, assigned_to, resolution)
  10. `public.admin_settings` (key, value, description, updated_by, updated_at)
  11. `public.audit_logs` (id, actor_id, action, entity_type, entity_id, before_data, after_data, metadata, created_at)
  12. `public.system_change_runs`
  13. `public.system_readiness_status`
- [ ] Create initial Administrator account in Supabase Auth and insert corresponding record in `public.user_profiles` with `role = 'admin'`.
- [ ] Verify Row Level Security is active and blocking unauthenticated/non-admin writes.

### 3. Cloudflare Pages Dashboard Setup
- [ ] Log in to Cloudflare Dashboard &rarr; **Workers & Pages**.
- [ ] Click **Create application** &rarr; **Pages** &rarr; **Connect to Git**.
- [ ] Select repository: `arieflaksono567-collab/Kawai-0511-adminku`.
- [ ] Set Production Branch: `main` (or working branch `fix/production-schema-alignment` for preview).
- [ ] Set Build Configuration:
  - **Framework Preset:** `Vite`
  - **Build Command:** `npm run build`
  - **Build Output Directory:** `dist`
- [ ] Set Environment Variables:
  - `NODE_VERSION`: `20`
  - `VITE_SUPABASE_URL`: `https://rbfnjgrnojvzvrpyryms.supabase.co`
  - `VITE_SUPABASE_ANON_KEY`: *(Anon key publik dari dashboard Supabase)*
  - `VITE_APP_ENV`: `production`
  - `VITE_ENABLE_DEMO`: `false`
- [ ] Click **Save and Deploy**.

### 4. Post-Deployment Verification
- [ ] Verify direct URL access (HTTP 200).
- [ ] Verify deep linking (e.g. refresh `/drivers`, `/orders` without 404 via `_redirects`).
- [ ] Verify SSL certificate issued by Cloudflare.
- [ ] Verify HTTP response headers match `_headers` specifications.
- [ ] Test admin authentication login flow with Supabase credentials.
- [ ] Test database operations with live PostgreSQL tables.
