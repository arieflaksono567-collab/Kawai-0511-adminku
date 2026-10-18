# KAWAI 0511 — Governance Registry & Standard AI Workflow Guide
**Proyek:** KAWAI 0511 — Admin Panel  
**Target Database:** Supabase (`rbfnjgrnojvzvrpyryms`)  
**Kerangka Kerja:** KAWAI Intelligent Governance System (KIGS)  

---

## 1. Status Verifikasi Skema & Mekanisme Aktual

| Komponen | Status Aktual | Keterangan & Catatan |
| :--- | :--- | :--- |
| **13 Tabel Publik Supabase** | **TERVERIFIKASI (100%)** | Seluruh tabel `public.*` diselaraskan dengan skema resmi: `user_profiles`, `driver_profiles`, `orders`, `order_status_history`, `service_types`, `service_zones`, `tariff_rules`, `payment_transactions`, `support_tickets`, `admin_settings`, `audit_logs`, `system_change_runs`, `system_readiness_status`. |
| **Row Level Security (RLS)** | **TERVERIFIKASI (100%)** | Diaktifkan pada seluruh tabel dengan helper security definer `public.is_admin()`. |
| **Tabel Skema `governance.*`** | **BELUM TERVERIFIKASI** | Memerlukan kredensial aktif Supabase untuk introspeksi langsung apakah skema `governance` telah di-bootstrap di server Supabase produksi atau saat ini masih dikelola sebagai spesifikasi repo. |
| **GitHub Actions CI/CD** | **TERVERIFIKASI (100%)** | Menggunakan `package-lock.json` versi 3 dengan `npm ci`, lulus linting TypeScript, pengujian keamanan, dan production build. |
| **Hosting Cloudflare Pages** | **TERVERIFIKASI (100%)** | File `_redirects` (SPA rewrite) dan `_headers` (CSP, X-Frame-Options, HSTS) siap pada build artifact `dist/`. |

---

## 2. Alur Pengajuan Perubahan (Change Request Workflow)

Sebelum mengubah struktur tabel, menambah kolom, mengubah enum, atau menambahkan konsep baru:

### Langkah 1: Pengecekan Istilah Eksisting
Periksa apakah kebutuhan sudah dapat dipenuhi oleh 13 tabel publik atau istilah yang ada di `.ai/CANONICAL_TERMS.md`.

### Langkah 2: Format Proposal Istilah Baru (Term Proposal)
Jika konsep baru benar-benar diperlukan, buat proposal dengan struktur wajib:
1. **Nama & Definisi:** Istilah kanonis yang diusulkan.
2. **Kebutuhan & Urgensi:** Mengapa konsep eksisting tidak mencukupi.
3. **Struktur yang Diperiksa:** Tabel dan kolom yang sudah diaudit sebelum mengajukan.
4. **Komponen Terdampak:** UI, API, Supabase, mobile app passenger/driver.
5. **Dampak Data & Migrasi:** Skema migrasi tanpa merusak data live.
6. **Rencana Pengujian & Rollback:** Skenario uji dan pemulihan jika terjadi kegagalan.

*Catatan Penting:* Proposal bukan keputusan resmi sampai disetujui secara tertulis oleh penanggung jawab proyek (Product Owner / Tech Lead).

---

## 3. Pembedaan Peran AI & Batasan Wewenang

- **Pekerjaan Teknis (Dalam Cakupan):**
  - Perbaikan bug, sinkronisasi type TypeScript, penyesuaian query Supabase dengan kolom yang sudah ada, peningkatan pengujian otomatis, perbaikan styling antarmuka.
- **Perubahan Konseptual (Memerlukan Persetujuan):**
  - Mengubah makna status pesanan, menambahkan role admin baru, mengubah formula pembagian komisi, menambahkan kolom pada tabel produksi bersama, atau memodifikasi aturan keamanan RLS.
- **Larangan Keras:**
  - Menghapus fitur aktif.
  - Memalsukan keberhasilan pengujian atau status database.
  - Membuat tabel pengganti (seperti `admin_users`, `drivers`, `operational_zones`).
