# KAWAI 0511 Admin Panel — Implementation Plan

**Objective:** Transition the KAWAI 0511 Admin Panel from a UI scaffold into a hardened, production-ready administrative platform integrated with Supabase and Cloudflare Pages.

---

## Phase 0: Baseline Audit & Gap Analysis (Completed)
- [x] Clone and inspect remote repository `Kawai-0511-adminku`
- [x] Create dedicated branch `feature/admin-production-readiness`
- [x] Audit dependencies, scripts, build pipeline, and file structure
- [x] Identify security gaps (hardcoded admin session, mock data coupling, document privacy)
- [x] Establish `.ai/` documentation suite

---

## Phase 1: Build & Dependency Reliability (In Progress)
- [x] Verify dependency declarations in `package.json`
- [x] Verify lockfile integrity
- [x] Execute TypeScript typecheck (`npm run lint` / `tsc --noEmit`)
- [x] Execute Vite production build (`npm run build`)
- [ ] Add unit/smoke test script in `package.json`
- [x] Ensure asset paths are compatible with Cloudflare Pages subpaths and SPA routing

---

## Phase 2: Supabase Database Architecture & Security Hardening
- [x] Draft initial database schema in `supabase/schema.sql`
- [x] Implement Row Level Security (RLS) policies on all tables
- [ ] Split schema into clean sequential migration files:
  - `supabase/migrations/20261014000001_core_schema.sql`
  - `supabase/migrations/20261014000002_driver_documents_and_storage.sql`
  - `supabase/migrations/20261014000003_rbac_security_policies.sql`
- [ ] Implement dedicated `driver_documents` table for sensitive PII handling (KTP, SIM, STNK, SKCK) with signed URL access
- [ ] Prevent destructive migrations; ensure idempotency and non-disruptive rollouts

---

## Phase 3: Authentication & Real Supabase Integration
- [ ] Create real Supabase Auth screen (Admin Login with Email & Password / Magic Link)
- [ ] Protect all administrative routes and views behind valid session verification
- [ ] Verify user role against `admin_users` table before granting access
- [ ] Provide data fetching hooks that query live Supabase tables when configured, with clean fallback when in disconnected/audit mode
- [ ] Provide real-time subscriptions for incoming orders and driver status updates

---

## Phase 4: Production Deployment & Verification
- [ ] Verify Cloudflare Pages configuration files (`_redirects` and `_headers`)
- [ ] Document exact dashboard setup steps for Cloudflare Pages
- [ ] Validate environment variable sanitation (Zero secret leaks)
- [ ] Perform staging/preview build verification
