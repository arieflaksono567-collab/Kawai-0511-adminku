# KAWAI 0511 Admin Panel — Deployment Checklist

## Target Architecture: Cloudflare Pages + Supabase

### 1. Pre-Deployment Verification (Local / CI)
- [x] Package dependencies resolve cleanly (`bun.lock` / `node_modules`).
- [x] TypeScript compiler passes without errors (`npm run lint` / `tsc --noEmit`).
- [x] Vite production build succeeds (`npm run build`).
- [x] Distribution bundle (`dist/`) contains:
  - `index.html`
  - `assets/*.js` and `assets/*.css`
  - `_redirects` (for SPA routing)
  - `_headers` (for security response headers)

### 2. Supabase Configuration (User Dashboard)
- [ ] Execute `supabase/schema.sql` (or sequential migrations) in Supabase SQL Editor.
- [ ] Optional: Execute `supabase/seed.sql` for initial Banjarmasin 0511 zones.
- [ ] Create initial Superadmin in Supabase Auth and insert corresponding record in `public.admin_users`.
- [ ] Verify Row Level Security is active and blocking unauthenticated reads.
- [ ] Create private storage bucket `driver-documents`.

### 3. Cloudflare Pages Dashboard Setup
- [ ] Log in to Cloudflare Dashboard &rarr; **Workers & Pages**.
- [ ] Click **Create application** &rarr; **Pages** &rarr; **Connect to Git**.
- [ ] Select repository: `arieflaksono567-collab/Kawai-0511-adminku`.
- [ ] Set Production Branch: `main` (or `feature/admin-production-readiness` for staging preview).
- [ ] Set Build Configuration:
  - **Framework Preset:** `Vite`
  - **Build Command:** `npm run build`
  - **Build Output Directory:** `dist`
- [ ] Set Environment Variables:
  - `NODE_VERSION`: `20`
  - `VITE_SUPABASE_URL`: `https://your-project.supabase.co`
  - `VITE_SUPABASE_ANON_KEY`: `your-anon-key-here`
  - `VITE_APP_ENV`: `production`
- [ ] Click **Save and Deploy**.

### 4. Post-Deployment Verification
- [ ] Verify direct URL access (HTTP 200).
- [ ] Verify deep linking (e.g. refresh `/drivers`, `/orders` without 404).
- [ ] Verify SSL certificate issued by Cloudflare.
- [ ] Verify HTTP response headers match `_headers` specifications.
- [ ] Test admin authentication login flow with Supabase credentials.
- [ ] Test database operations with live PostgreSQL tables.
