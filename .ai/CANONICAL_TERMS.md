# KAWAI 0511 — Kamus Istilah Kanonis (Canonical Terms Registry)
**Versi:** 1.0.0  
**Proyek:** KAWAI 0511 Admin Panel  
**Database Acuan:** Supabase PostgreSQL (`rbfnjgrnojvzvrpyryms`)  
**Lingkup Wilayah:** Banjarmasin & Kalimantan Selatan (Area 0511)  

---

## 1. Prinsip Utama Pengelolaan Istilah
1. **Satu Konsep, Satu Istilah Kanonis:** Tidak diperbolehkan menggunakan istilah berbeda untuk entitas atau konsep yang sama.
2. **Supabase sebagai Sumber Kebenaran:** Penamaan tabel, nama kolom, jenis data, enum status, dan relasi harus mengikuti skema resmi Supabase.
3. **Pemisahan Lapisan Presentasi (UI) dan Basis Data (DB):** Label antarmuka (UI) bahasa Indonesia dapat disajikan ramah pengguna, namun nilai yang dikirim dan disimpan ke database wajib menggunakan nilai kanonis.
4. **Mekanisme Proposal Perubahan:** Perubahan nama kolom, status baru, peran baru, atau tabel baru wajib melalui proposal governance sebelum diimplementasikan.

---

## 2. Tabel Istilah Kanonis Utama

| Konsep Bisnis | Istilah Kanonis DB | Tabel Resmi Supabase | Kolom Kunci | Istilah UI Resmi | Istilah Non-Kanonis / Dilarang |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Profil Pengguna** | `user_profile` | `public.user_profiles` | `id`, `display_name`, `phone`, `avatar_url`, `role` | Pelanggan / Pengguna | `admin_users`, `users`, `full_name`, `email`* (email ada di auth.users) |
| **Mitra Pengemudi** | `driver_profile` | `public.driver_profiles` | `user_id` (PK), `vehicle_type`, `vehicle_plate`, `verification_status`, `is_online` | Mitra Driver | `drivers`, `plate_number` (wajib alias ke `vehicle_plate`) |
| **Pesanan Perjalanan** | `order` | `public.orders` | `id`, `customer_id`, `driver_id`, `service_type_id`, `status`, `fare_amount_idr` | Pesanan / Trip | `trips`, `bookings`, `pending` (gunakan `searching`) |
| **Riwayat Status** | `order_status_history` | `public.order_status_history` | `id`, `order_id`, `previous_status`, `new_status`, `notes` | Riwayat Status Pesanan | `order_logs`, `trip_history` |
| **Katalog Layanan** | `service_type` | `public.service_types` | `id`, `code`, `name`, `base_fare_idr`, `fare_per_km_idr`, `is_active` | Layanan Transportasi & Kurir | `services`, `ride_types` |
| **Zona Operasional** | `service_zone` | `public.service_zones` | `id`, `code`, `name`, `city`, `region`, `boundary`, `is_active` | Zona Layanan 0511 | `operational_zones`, `area_code` |
| **Aturan Tarif** | `tariff_rule` | `public.tariff_rules` | `id`, `service_type_id`, `name`, `version`, `status`, `base_fare_idr` | Aturan & Formula Tarif | `pricing_rules`, `tariffs` |
| **Transaksi Finansial**| `payment_transaction`| `public.payment_transactions` | `id`, `order_id`, `user_id`, `amount_idr`, `status`, `paid_at` | Transaksi Pembayaran | `payments`, `wallet_transactions` |
| **Tiket Bantuan** | `support_ticket` | `public.support_tickets` | `id`, `customer_id`, `subject`, `category`, `status`, `priority` | Tiket Dukungan & Bantuan | `complaints`, `tickets`, `issues` |
| **Pengaturan Admin** | `admin_setting` | `public.admin_settings` | `key` (PK), `value`, `description`, `updated_by` | Pengaturan Platform | `system_configs`, `settings` |
| **Log Audit** | `audit_log` | `public.audit_logs` | `id`, `actor_id`, `action`, `entity_type`, `metadata` | Catatan Audit Forensik | `activity_logs`, `admin_logs` |
| **Eksekusi CI/CD** | `system_change_run` | `public.system_change_runs` | `id`, `commit_sha`, `branch_name`, `overall_status`, `report` | Riwayat Perubahan Sistem | `ci_runs`, `pipeline_runs` |
| **Kesiapan Sistem** | `system_readiness_status` | `public.system_readiness_status`| `system_key` (PK), `status`, `checks`, `message` | Status Kesiapan Sub-sistem | `health_checks`, `readiness` |

---

## 3. Nilai Kanonis Enum & Status

### A. Role Pengguna (`public.user_profiles.role`)
* **Kanonis:**
  - `customer` (Pelanggan aplikasi penumpang KAWAI)
  - `driver` (Mitra pengemudi KAWAI)
  - `admin` (Administrator operasional KAWAI)
* **Aturan Otorisasi:**  
  Pengguna biasa **dilarang** menaikkan role sendiri menjadi `admin`. Role escalation dicegah di tingkat trigger basis data `prevent_user_self_promotion()`.

### B. Jenis Kendaraan (`public.driver_profiles.vehicle_type`)
* **Kanonis:**
  - `motorcycle` (Armada Roda 2 / Motor)
  - `car` (Armada Roda 4 / Mobil)
  - `van` (Armada Minivan / Angkutan Penumpang)
  - `other` (Armada Khusus / Lainnya)
* **Aturan Konversi:**  
  Jika kode atau input memasukkan `'motor'` atau `'mobil'`, fungsi kanonis `normalizeVehicleType()` secara otomatis memetakan ke `'motorcycle'` atau `'car'`.

### C. Status Verifikasi Driver (`public.driver_profiles.verification_status`)
* **Kanonis:**
  - `pending` (Menunggu tinjauan berkas KTP, SIM, STNK, SKCK)
  - `approved` (Berkas diverifikasi dan diizinkan beroperasi)
  - `rejected` (Pengajuan ditolak dengan alasan)
  - `suspended` (Akun driver dinonaktifkan sementara)

### D. Status Siklus Hidup Pesanan (`public.orders.status`)
* **Kanonis:**
  - `searching` (Mencari driver terdekat di area penjemputan)
  - `assigned` (Driver menerima / ditugaskan ke pesanan)
  - `arrived` (Driver tiba di lokasi penjemputan penumpang)
  - `in_trip` (Perjalanan sedang berlangsung menuju tujuan)
  - `completed` (Pesanan selesai dan tagihan lunas)
  - `cancelled` (Pesanan dibatalkan oleh penumpang, driver, atau sistem)
* **Aturan Konversi:**
  - Istilah legacy `'pending'` otomatis dipetakan ke `'searching'`.
  - Istilah legacy `'in_progress'` otomatis dipetakan ke `'in_trip'`.

### E. Pilar Kode Layanan (`public.service_types.code`)
* `ride_motor` &rarr; KAWAI Motor
* `ride_car` &rarr; KAWAI Mobil
* `delivery` &rarr; KAWAI Kurir (Pengiriman Barang)
* `food` &rarr; KAWAI Kuliner (Pesan Antar Makanan)

---

## 4. Skema Tata Kelola KIGS (Kawai Intelligent Governance System)

Status pada Database Aktif: **BELUM TERVERIFIKASI** (memerlukan koneksi langsung runtime untuk pembuktian eksistensi schema `governance`).

Daftar entitas yang dicakup dalam spesifikasi KIGS:
1. `governance.canonical_terms` (Penyimpanan istilah resmi dan relasi sinonim)
2. `governance.term_proposals` (Pengajuan istilah baru oleh engineer/AI)
3. `governance.change_requests` (Permintaan perubahan skema/kontrak data)
4. `governance.audit_events` (Pencatatan mutasi istilah dan kebijakan tata kelola)
5. `governance.rollback_events` (Pencatatan pemulihan terverifikasi)
6. `governance.registry_state` (Kunci status versi tata kelola aktif)
