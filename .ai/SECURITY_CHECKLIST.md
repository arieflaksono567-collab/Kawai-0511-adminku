# KAWAI 0511 Admin Panel — Security Checklist

## 1. Secrets & Credentials Management
- [x] **No hardcoded secrets:** Terbukti tidak ada token, password, atau API key yang dimasukkan ke source code.
- [x] **Service Role Exclusion:** `SUPABASE_SERVICE_ROLE_KEY` dilarang total dari frontend dan `.env.example`.
- [x] **Client-side exposure control:** Hanya `VITE_SUPABASE_ANON_KEY` yang digunakan untuk inisialisasi browser SDK.

## 2. Authentication & Authorization (RBAC)
- [x] **Gerbang Autentikasi Admin:** Pengguna wajib login melalui `LoginPage.tsx` sebelum dashboard dimuat.
- [x] **Verifikasi Role di Backend:** Role diverifikasi terhadap tabel `public.admin_users` dengan status `is_active = true`.
- [x] **Halaman 403 Akses Ditolak:** Modul dengan batasan role (misal tarif zonasi) memblokir peran yang tidak berwenang (`Forbidden403.tsx`).
- [x] **Anti-Tampering:** Role tidak dipercayai hanya berdasarkan state frontend atau localStorage tanpa verifikasi session.

## 3. Database Security & Row Level Security (RLS)
- [x] **RLS Enforced:** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` pada seluruh tabel (`admin_users`, `drivers`, `driver_documents`, `orders`, `operational_zones`, `audit_logs`).
- [x] **Fungsi Security Definer:** `is_admin()` dan `has_admin_role()` memvalidasi klaim admin secara aman di level PostgreSQL.
- [x] **Append-Only Audit Trail:** Kebijakan RLS pada tabel `audit_logs` melarang modifikasi (`UPDATE`) atau penghapusan (`DELETE`).

## 4. Privacy & Driver Document Security (UU PDP Compliance)
- [x] **Pemisahan Dokumen:** Berkas KTP, SIM, STNK, SKCK dikelola melalui entitas khusus `driver_documents`.
- [x] **Private Storage Policy:** Dokumen disimpan pada private bucket Supabase Storage dan hanya dapat diakses melalui Signed URLs berdurasi pendek.
- [x] **Pencatatan Audit:** Setiap tindakan verifikasi atau perubahan dokumen dicatat ke log audit.

## 5. Network & Browser Hardening (Cloudflare Pages)
- [x] **Content-Security-Policy (CSP):** Dikonfigurasi di `public/_headers`.
- [x] **Anti-Clickjacking:** `X-Frame-Options: SAMEORIGIN` aktif.
- [x] **Anti-MIME Sniffing:** `X-Content-Type-Options: nosniff` aktif.
- [x] **SPA Routing Fallback:** `public/_redirects` aktif untuk mencegah 404 pada deep link.
