# KAWAI 0511 Admin Panel — Security Checklist

## 1. Secrets & Credentials Management
- [x] **No hardcoded secrets:** Verified no API keys, tokens, or passwords exist in source files.
- [x] **Client-side exposure control:** Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are allowed in the frontend.
- [x] **Service Role Key forbidden:** `SUPABASE_SERVICE_ROLE_KEY` is explicitly barred from frontend code and `.env.example`.
- [x] **Sanitized error messages:** Application does not leak connection strings or stack traces to client screens.

## 2. Authentication & Authorization (RBAC)
- [ ] **Admin Authentication Gate:** Real Supabase Auth login form required before dashboard rendering.
- [ ] **Role Verification:** Query `admin_users` table with authenticated `auth.uid()` to verify `is_active = true` and valid role (`superadmin`, `dispatcher`, `finance`, `support`).
- [ ] **Session Expiry & Inactivity Timeout:** Enforce automatic logout or session refresh.

## 3. Database Security & Row Level Security (RLS)
- [x] **RLS Enabled on All Tables:** `admin_users`, `drivers`, `orders`, `operational_zones`, `audit_logs`.
- [x] **Security Definer Function:** `is_admin()` checks admin status safely without exposing underlying auth metadata.
- [x] **Immutable Audit Trail:** Append-only policy on `audit_logs` preventing modification or deletion of historical action logs.

## 4. Privacy & Driver Document Security (UU PDP Compliance)
- [ ] **Private Storage Bucket:** Storage bucket `driver-documents` set to private (non-public).
- [ ] **Signed URL Access:** Driver identification documents (KTP, SIM, STNK, SKCK) are only accessible via short-lived signed URLs generated on-demand for authenticated admins.
- [ ] **Access Logging:** Every view or review of driver PII documents is recorded in `audit_logs`.

## 5. Network & Browser Hardening (Cloudflare Pages)
- [x] **Content-Security-Policy (CSP):** Configured in `public/_headers`.
- [x] **Clickjacking Protection:** `X-Frame-Options: SAMEORIGIN` configured.
- [x] **MIME-Type Sniffing Protection:** `X-Content-Type-Options: nosniff` configured.
- [x] **Referrer Policy:** `strict-origin-when-cross-origin` configured.
- [x] **SPA 404 Prevention:** `public/_redirects` rule active for all client routes.
