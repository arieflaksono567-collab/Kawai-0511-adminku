# KAWAI 0511 Admin Panel — Security & Compliance Audit

## 1. Secrets & Credentials Management
- [x] **No hardcoded secrets:** Terbukti tidak ada token, password, atau API key yang dimasukkan ke source code.
- [x] **Service Role Exclusion:** `SUPABASE_SERVICE_ROLE_KEY` dilarang total dari frontend dan `.env.example`.
- [x] **Client-side exposure control:** Hanya `VITE_SUPABASE_ANON_KEY` yang digunakan untuk inisialisasi browser SDK.

## 2. Authentication & Authorization (RBAC)
- [x] **Gerbang Autentikasi Admin:** Pengguna wajib login melalui `LoginPage.tsx` sebelum dashboard dimuat.
- [x] **Verifikasi Role di Backend:** Role diverifikasi terhadap tabel `public.user_profiles` dengan `role = 'admin'` (hanya customer, driver, admin yang diizinkan).
- [x] **Halaman 403 Akses Ditolak:** Modul dengan batasan hak akses memblokir pengguna biasa (`Forbidden403.tsx`).
- [x] **Anti-Privilege Escalation:** Pengguna biasa (`customer` / `driver`) tidak memiliki hak akses untuk mengubah role dirinya sendiri menjadi `admin`.

## 3. Database Security & Row Level Security (RLS)
- [x] **RLS Enforced pada 13 Tabel Produksi:**
  1. `public.user_profiles`
  2. `public.driver_profiles`
  3. `public.orders`
  4. `public.order_status_history`
  5. `public.service_types`
  6. `public.service_zones`
  7. `public.tariff_rules`
  8. `public.payment_transactions`
  9. `public.support_tickets`
  10. `public.admin_settings`
  11. `public.audit_logs`
  12. `public.system_change_runs`
  13. `public.system_readiness_status`
- [x] **Kebijakan Policy Audit untuk Security Advisor:**
  - `system_change_runs`: Diberikan policy SELECT terbatas hanya untuk administrator (`public.is_admin()`).
  - `system_readiness_status`: Diberikan policy SELECT terbatas hanya untuk administrator (`public.is_admin()`).
- [x] **Fungsi Security Definer:** `public.is_admin()` memvalidasi klaim admin secara aman di level PostgreSQL terhadap `user_profiles`.
- [x] **Append-Only Audit Trail:** Kebijakan RLS pada tabel `audit_logs` melarang modifikasi (`UPDATE`) atau penghapusan (`DELETE`).

## 4. Audit Fungsi Bersama (Shared SECURITY DEFINER Functions)
- [x] **`accept_order`:** Memeriksa identitas pemanggil (`auth.uid()`) agar hanya driver yang ditugaskan/tersedia yang dapat menerima pesanan.
- [x] **`advance_order_status`:** Memvalidasi transisi status alur resmi (`searching` &rarr; `assigned` &rarr; `arrived` &rarr; `in_trip` &rarr; `completed`), mencegah loncatan status ilegal.
- [x] **`list_available_orders`:** Hanya mengembalikan pesanan berstatus `searching` di zona operasional driver aktif.
- [x] **`set_driver_presence`:** Membatasi agar driver hanya dapat memperbarui koordinat GPS (`current_lat`, `current_lng`) dan status `is_online` pada profil milik dirinya sendiri (`user_id = auth.uid()`).
- [x] **Perlindungan Aplikasi Pengguna & Driver:** Fungsi bersama dipertahankan tanpa perubahan destruktif untuk menjaga kelancaran aplikasi penumpang dan pengemudi di Vercel.

## 5. Network & Browser Hardening (Cloudflare Pages)
- [x] **Content-Security-Policy (CSP):** Dikonfigurasi di `public/_headers`.
- [x] **Anti-Clickjacking:** `X-Frame-Options: SAMEORIGIN` aktif.
- [x] **Anti-MIME Sniffing:** `X-Content-Type-Options: nosniff` aktif.
- [x] **SPA Routing Fallback:** `public/_redirects` aktif untuk mencegah 404 pada deep link.
