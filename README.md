# KAWAI 0511 — Admin Panel

Panel administrasi operasional terpadu untuk ekosistem ride-hailing dan delivery KAWAI 0511 (Banjarmasin & Kalimantan Selatan).

---

## 1. Arsitektur Sistem

Aplikasi ini dibangun menggunakan arsitektur modern yang ringan, cepat, dan aman untuk edge deployment:

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS (Single-Page Application).
- **Backend & Database:** Supabase (PostgreSQL 15+, Supabase Auth, Row Level Security, Storage).
- **Hosting Target:** Cloudflare Pages (Global Edge CDN, Static SPA Rewrite).
- **Version Control:** GitHub (`main` & `feature/admin-production-readiness`).

### Batasan Penting (Boundary Architecture):
1. **Aplikasi Penumpang & Pengemudi:** Berada di repositori dan deployment terpisah (Vercel). Admin Panel ini tidak mengubah kode atau konfigurasi aplikasi pengguna/driver.
2. **Penyimpanan Dokumen Sensitif:** Dokumen identitas mitra (KTP, SIM, STNK, SKCK) dikelola di Supabase Storage private bucket (`driver-documents`) dengan akses berbasis Signed URL sementara (kepatuhan UU PDP).
3. **Keamanan Database:** Tidak ada akses data langsung tanpa Row Level Security (RLS) dan validasi hak administrator (`is_admin()`).

---

## 2. Struktur Direktori

```
├── .ai/                       # Dokumentasi arsitektur, status proyek & roadmap
│   ├── CHANGELOG.md
│   ├── DEPLOYMENT_CHECKLIST.md
│   ├── IMPLEMENTATION_PLAN.md
│   ├── PROJECT_STATUS.md
│   └── SECURITY_CHECKLIST.md
├── public/
│   ├── _headers               # Aturan Security Headers (CSP, HSTS, X-Frame-Options)
│   └── _redirects             # Aturan SPA routing Cloudflare Pages (/* /index.html 200)
├── src/
│   ├── __tests__/             # Automated unit & security test suite
│   ├── components/            # Komponen umum (Header, Sidebar, 403, 404)
│   ├── features/
│   │   ├── analytics/         # Analitik operasional & tren permintaan 0511
│   │   ├── auth/              # Autentikasi Supabase & evaluasi role switcher
│   │   ├── orders/            # Detail pesanan modal & state machine
│   │   ├── profile/           # Profil & otorisasi administrator
│   │   ├── settings/          # Pengaturan komisi & hotline operasional
│   │   └── users/             # Manajemen penumpang & fraud suspension
│   ├── lib/
│   │   ├── api.ts             # Lapisan data terpisah (live Supabase / fallback)
│   │   └── supabase.ts        # Inisialisasi Supabase client & diagnostic tester
│   ├── types/
│   │   └── database.ts        # TypeScript schema & entity definitions
│   ├── App.tsx                # Routing & layout orchestration
│   ├── index.css
│   └── main.tsx
├── supabase/
│   ├── migrations/            # Version-controlled SQL migrations
│   │   ├── 20261014000001_core_schema.sql
│   │   ├── 20261014000002_driver_documents.sql
│   │   └── 20261014000003_rbac_and_rls_policies.sql
│   ├── schema.sql             # Skema gabungan konsolidasi
│   └── seed.sql               # Data awal zona Banjarmasin 0511
├── .env.example               # Template environment variables (Zero Secrets)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 3. Prasyarat & Instalasi

- **Node.js:** Versi 20+ (Rekomendasi v20.x atau v22.x).
- **Package Manager:** npm atau bun.

### Instalasi Dependensi:
```bash
npm install
```

### Menjalankan Mode Development:
```bash
npm run dev
```
Aplikasi berjalan pada `http://localhost:3000`.

---

## 4. Pengujian & Validasi Kualitas

### Menjalankan Test Otomatis (Security & Configuration):
```bash
npm run test
```
Menguji berkas redirect Cloudflare Pages, security headers, skema SQL RLS, sanitasi secrets, serta kelengkapan seluruh 11 halaman/komponen.

### Menjalankan Type Checking (Linting):
```bash
npm run lint
```

### Membuat Production Build:
```bash
npm run build
```
Menghasilkan folder `dist/` siap deploy.

---

## 5. Konfigurasi Environment Variables

Salin `.env.example` ke `.env.local`:
```bash
cp .env.example .env.local
```

Isi variabel publik Supabase Anda:
```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key-here"
VITE_APP_ENV="production"
VITE_APP_NAME="KAWAI 0511 Admin Panel"
```

> **PERINGATAN KEAMANAN:**  
> JANGAN PERNAH memasukkan `SUPABASE_SERVICE_ROLE_KEY` ke dalam berkas environment frontend atau source code.

---

## 6. Integrasi Supabase & Migrasi Database

1. Buka dashboard project Supabase Anda.
2. Masuk ke **SQL Editor**.
3. Jalankan berkas migrasi secara berurutan dari folder `supabase/migrations/`:
   - `20261014000001_core_schema.sql` (Tabel inti operasional)
   - `20261014000002_driver_documents.sql` (Tabel PII berkas mitra)
   - `20261014000003_rbac_and_rls_policies.sql` (Aturan RLS & fungsi `is_admin()`)
4. Buat Storage Bucket private dengan nama `driver-documents`.
5. Daftarkan akun admin pertama Anda di `auth.users` dan tautkan ID-nya ke tabel `public.admin_users` dengan role `superadmin`.

---

## 7. Panduan Deployment Cloudflare Pages

1. Buka dashboard Cloudflare &rarr; **Workers & Pages** &rarr; **Create application** &rarr; tab **Pages**.
2. Pilih **Connect to Git** dan hubungkan repositori ini.
3. Konfigurasi build:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/`
4. Masukkan Environment Variables di Cloudflare:
   - `NODE_VERSION`: `20`
   - `VITE_SUPABASE_URL`: `https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `your-anon-key`
   - `VITE_APP_ENV`: `production`
5. Klik **Save and Deploy**.
