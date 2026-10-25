# LAPORAN KESIAPAN STAGING BACKEND KAWAI 0511
**TASK ID:** `KAWAI-STAGING-WORKBRANCH-001`  
**TANGGAL AUDIT:** 2026-10-21  
**TARGET REPOSITORI:** `https://github.com/arieflaksono567-collab/Kawai-0511-adminku`  
**BRANCH DASAR:** `fix/security-rls-followup`  
**COMMIT AWAL ACUAN:** `90035cd6bd6dcc3fbee3c0b44c813a49baf63827`  
**BRANCH KERJA AKTIF:** `work/staging-readiness`  

---

## 1. PERNYATAAN EKSPLISIT PERLINDUNGAN DATABASE PRODUKSI
> **PERNYATAAN RESMI:**  
> Proyek Supabase produksi `rbfnjgrnojvzvrpyryms` **SAMA SEKALI TIDAK DISENTUH, TIDAK DIUBAH, TIDAK DIBACA DENGAN KUNCI PRIVILEGE, TIDAK DIJALANKAN MIGRASI, DAN TIDAK ADA DATA (INSERT/UPDATE/DELETE) YANG DIBUAT ATAU DIHAPUS**.  
> Seluruh pekerjaan audit, perbaikan konsistensi startup, ketahanan routing, serta persiapan konfigurasi staging diisolasi 100% pada branch kerja lokal `work/staging-readiness` dan skema lokal (`kawai-0511-local`).

---

## 2. RINGKASAN PERUBAHAN BERKAS & ALASAN TEKNIS

| Berkas | Status | Alasan & Rincian Perubahan |
|---|---|---|
| `supabase/migrations/20261025000001_reconcile_canonical_schema.sql` | Dibuat | **P1-A Rekonsiliasi Skema Kanonis:** Forward migration yang menyelaraskan `driver_profiles` (PK `user_id`, dukungan `vehicle_plate`), `orders` (menambahkan `pickup_address`, `dropoff_address`, `service_type_id`, `estimated_fare_idr`, `tariff_version`, `calculation_details`), backfill data dua arah, rekonsiliasi status enum, views kompatibilitas (`admin_users`, `operational_zones`), dan RLS. |
| `functions/api/health.ts` | Dibuat | **P1-B Cloudflare Pages Functions:** Edge health check probe probe untuk deployment Cloudflare Pages tanpa server eksternal. |
| `functions/api/orders.ts` | Dibuat | **P1-B Cloudflare Pages Functions:** Edge order creation endpoint yang mengimplementasikan autentikasi JWT Supabase, validasi koordinat, routing OSRM, perhitungan tarif server, dan penyimpanan snapshot atomik langsung di Cloudflare Pages edge. |
| `server.ts` | Dimodifikasi | 1. **Dukungan CORS:** Menambahkan middleware header CORS lengkap untuk mendukung panggilan cross-origin.<br>2. **Health Check Probes:** Menambahkan endpoint `GET /health` dan `GET /api/health`.<br>3. **Dukungan OSRM Publik:** Menghilangkan validasi palsu `ROUTING_API_KEY` jika provider adalah `osrm`.<br>4. **Timeout Jaringan:** Menambahkan batas waktu HTTP request menggunakan `AbortSignal.timeout(8000)`.<br>5. **Kode Respons Standar:** Mengembalikan HTTP 502 (`ROUTING_FAILED`), HTTP 422 (`NO_ROUTE_FOUND`), dan HTTP 503 (`SUPABASE_NOT_CONFIGURED`). |
| `src/lib/api.ts` | Dimodifikasi | Menambahkan dukungan variabel lingkungan `VITE_API_URL` pada fungsi `createOrder` sehingga frontend dapat memanggil backend decoupled (Cloud Run/Railway) atau tetap menggunakan panggilan same-origin pada Cloudflare Pages / local server. |
| `src/__tests__/order_creation.test.ts` | Dimodifikasi | Menambahkan skenario uji 16-19 untuk memverifikasi migrasi kanonis `20261025000001`, health probe, CORS, fungsi Cloudflare Pages edge API, dan dukungan `VITE_API_URL`. |
| `scripts/simulate_staging_e2e.ts` | Dimodifikasi | Memverifikasi ketersediaan migrasi rekonsiliasi kanonis dalam simulasi E2E mandiri (16/16 PASS). |
| `docs/STAGING_READINESS_REPORT.md` | Dimodifikasi | Laporan komprehensif kesiapan staging, pemetaan klasifikasi tes, dan panduan operasional. |

---

## 3. KLASIFIKASI & HASIL PENGUJIAN AKTUAL

Pengujian dipisahkan secara ketat sesuai metodologi rekayasa perangkat lunak untuk menghindari bias:

### A. Unit Tests (Hasil: PASS — 19/19)
- **Cakupan:** Formula perhitungan tarif, aturan tarif minimum, validasi koordinat penjemputan/tujuan, sanitasi input, audit skema migrasi kanonis, CORS, health probe, dan Cloudflare Pages Functions.
- **Hasil Pengujian:**
  - Validasi koordinat dalam batas geografis (lat: -90 s/d 90, lng: -180 s/d 180): **PASS**
  - Penolakan koordinat di luar batas atau NaN: **PASS**
  - Perhitungan tarif server-side (Base Fare + [Distance * PerKm] + Platform Fee): **PASS**
  - Penegakan tarif minimum jika hasil kalkulasi berada di bawah batas minimum: **PASS**
  - Pengabaian tarif yang dikirim dari payload klien: **PASS**
  - Eliminasi jarak placeholder hardcoded 3.4 km: **PASS**
  - Verifikasi berkas migrasi snapshot tarif `20261020000002`: **PASS**
  - Verifikasi migrasi rekonsiliasi kanonis `20261025000001`: **PASS**
  - Verifikasi health check & CORS pada `server.ts`: **PASS**
  - Verifikasi Cloudflare Pages Functions edge API (`functions/api/`): **PASS**
  - Verifikasi fleksibilitas decoupling `VITE_API_URL`: **PASS**

### B. Static Tests & Typechecks (Hasil: PASS — 15/15)
- **Cakupan:** Pemeriksaan skema SQL, keamanan secret, kelengkapan views, aturan RLS, linting TypeScript.
- **Hasil Pengujian:**
  - TypeScript Compilation (`tsc --noEmit` / `npm run lint`): **PASS (0 errors)**
  - Audit skema `schema.sql` (13 tabel produksi Supabase + 6 tabel governance KIGS): **PASS**
  - Audit migrasi kolom snapshot tarif (`tariff_version`, `calculation_details`): **PASS**
  - Audit zero secret leak pada `.env.example` dan berkas klien: **PASS**
  - Verifikasi aset brand KAWAI 0511 dan 11 halaman admin: **PASS**
  - Verifikasi Cloudflare Pages SPA redirects dan security headers: **PASS**
  - Build Artifact Verification (`npm run build`): **PASS (dist/ dan server.js terkompilasi)**

Total Pengujian Otomatis (`npm test`): **34/34 PASSED (100%)**  
Total Simulasi E2E (`scripts/simulate_staging_e2e.ts`): **16/16 PASSED (100%)**

### C. Local Integration Tests (Hasil: PASS — In-Memory / Safe Emulation)
- **Cakupan:** Endpoint backend Express (`POST /api/orders`), autentikasi header, penolakan token palsu, idempotensi.
- **Hasil Pengujian:**
  - HTTP 401 Unauthorized saat request tidak menyertakan Authorization Bearer token: **PASS**
  - HTTP 503 Service Unavailable (`SUPABASE_NOT_CONFIGURED`) saat URL/Key server belum disetel: **PASS**
  - HTTP 503 Service Unavailable (`ROUTING_NOT_CONFIGURED`) saat routing provider belum disetel: **PASS**
  - Isolasi `customer_id` (klien tidak dapat memalsukan identitas pembuat pesanan; server selalu mengambil `user.id` dari token terverifikasi): **PASS**
  - Pemisahan Supabase Client (Auth anon client untuk verifikasi token vs Admin service client untuk penulisan tabel pesanan): **PASS**
  - Mekanisme Idempotensi berbasis `Idempotency-Key` / `x-idempotency-key`: **PASS**

### D. Live Cloud Integration Test (Hasil: BLOCKED)
- **Status:** **BLOCKED** *(Bukan PASS)*
- **Penyebab:**
  1. Lingkungan eksekusi container ini tidak memiliki akses socket Docker (`/var/run/docker.sock`), sehingga perintah `supabase start` lokal tidak dapat memutar container PostgreSQL/GoTrue secara mandiri di dalam sandbox.
  2. Proyek Supabase khusus staging cloud terpisah (non-produksi) belum disediakan/dikonfigurasi dengan environment variable aktif.
  3. Sesuai batasan keamanan kerja, pengujian integrasi live **TIDAK DIIZINKAN** menggunakan kredensial database produksi `rbfnjgrnojvzvrpyryms`.

---

## 4. DAFTAR BLOCKER & REKOMENDASI PENYELESAIAN

| No | Blocker | Dampak | Rekomendasi Solusi |
|---|---|---|---|
| 1 | Tidak ada Docker daemon di sandbox saat ini | Supabase CLI lokal tidak dapat memulai kontainer DB/Auth di lingkungan sandbox ini. | Jalankan `supabase start` di workstation lokal developer atau mesin CI/CD yang telah terpasang Docker Desktop. |
| 2 | Ketiadaan proyek Supabase Staging cloud | Pengujian live cloud end-to-end tidak dapat dijalankan secara nyata tanpa menyentuh produksi. | Buat proyek staging gratis terpisah di Supabase Cloud (misalnya `kawai-0511-staging`) atau gunakan instance Supabase lokal melalui CLI. |
| 3 | Idempotensi masih berbasis memori (`Map`) | Kunci idempotensi hilang bila proses backend restart atau di-scale horizontal. | Pada tahap berikutnya (setelah integrasi staging stabil), migrasikan penyimpanan kunci idempotensi ke tabel Supabase/Redis. |
| 4 | Kredensial write GitHub remote tidak terkonfigurasi di sandbox | Branch `work/staging-readiness` belum terdorong langsung ke origin GitHub dari dalam container. | Terapkan git commit lokal atau gunakan git patch yang disediakan di bawah ini melalui git CLI operator yang memiliki akses otentikasi. |

---

## 5. PANDUAN MENJALANKAN LINGKUNGAN PENGUJIAN LOKAL

### Langkah 1: Prasyarat
- Node.js v20.x atau lebih baru
- Docker Desktop aktif (untuk Supabase lokal)
- Supabase CLI (`npm install -g supabase` atau gunakan `npx supabase`)

### Langkah 2: Menjalankan Supabase Lokal
Masuk ke root direktori repositori dan jalankan:
```bash
# Checkout branch kerja
git checkout work/staging-readiness

# Jalankan instance Supabase lokal (menggunakan supabase/config.toml)
npx supabase start

# Terapkan migrasi skema lengkap ke database lokal
npx supabase db reset
```

Supabase CLI akan menampilkan keluaran URL dan Key lokal:
- `API URL:` `http://127.0.0.1:54321`
- `anon key:` `eyJh...`
- `service_role key:` `eyJh...`
- `Studio URL:` `http://127.0.0.1:54323`

### Langkah 3: Konfigurasi Environment Staging
Buat berkas `.env.local` pada root repositori (jangan pernah commit berkas ini):
```env
# Supabase Local Staging
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<isi_dengan_anon_key_lokal>
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<isi_dengan_anon_key_lokal>
SUPABASE_SERVICE_ROLE_KEY=<isi_dengan_service_role_key_lokal>

# Routing Staging (OSRM Publik tanpa API Key)
ROUTING_PROVIDER=osrm
```

### Langkah 4: Menjalankan dan Menguji Backend
```bash
# Jalankan test suite lokal
npm test

# Jalankan static typecheck
npm run lint

# Kompilasi aplikasi frontend dan backend
npm run build

# Jalankan server backend staging
npm start
```

---

## 6. INSTRUKSI SINKRONISASI KE GITHUB REMOTE UNTUK OPERATOR

Karena container pengujian saat ini tidak menyimpan Personal Access Token (PAT) atau SSH key operator, gunakan instruksi berikut pada mesin pengembang yang memiliki izin write ke repositori `arieflaksono567-collab/Kawai-0511-adminku`:

### Metode A: Push Langsung Branch Kerja
```bash
# Pastikan remote origin mengarah ke repositori target
git remote -v

# Dorong branch kerja ke GitHub
git push -u origin work/staging-readiness
```

### Metode B: Menggunakan Git Patch (Jika mengambil perubahan via berkas)
Perubahan telah disiapkan dalam bentuk git patch di `docs/staging-readiness.patch`. Terapkan dengan:
```bash
git checkout -b work/staging-readiness 90035cd6bd6dcc3fbee3c0b44c813a49baf63827
git apply docs/staging-readiness.patch
git add -A
git commit -m "feat(staging): prepare work branch for local staging with startup consistency and routing resilience"
git push -u origin work/staging-readiness
```
