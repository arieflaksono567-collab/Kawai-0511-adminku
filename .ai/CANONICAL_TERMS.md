# KAWAI 0511 — Kamus Istilah Kanonis (Canonical Terms Registry)
**Versi:** 1.1.0  
**Proyek:** KAWAI 0511 Admin Panel  
**Database Acuan:** Supabase PostgreSQL (`rbfnjgrnojvzvrpyryms`)  
**Lingkup Wilayah:** Banjarmasin & Kalimantan Selatan (Area 0511)  
**Status Acuan:** Inventaris Database dan Struktur Terkonfirmasi Penuh  

---

## 1. Prinsip Utama Pengelolaan Istilah
1. **Satu Konsep, Satu Istilah Kanonis:** Tidak diperbolehkan menggunakan istilah berbeda untuk entitas atau konsep yang sama di seluruh DB, API, UI, validasi, dan pengujian.
2. **Supabase sebagai Sumber Kebenaran Utama:** Penamaan tabel, nama kolom, jenis data, enum status, dan relasi harus mengikuti skema resmi Supabase.
3. **Pemisahan Lapisan Presentasi (UI) dan Basis Data (DB):** Label antarmuka (UI) bahasa Indonesia dapat disajikan ramah pengguna, namun nilai yang dikirim dan disimpan ke database wajib menggunakan nilai kanonis.
4. **Mekanisme Proposal Perubahan:** Perubahan nama kolom, status baru, peran baru, atau tabel baru wajib melalui proposal governance sebelum diimplementasikan.

---

## 2. Tabel Istilah Kanonis: Schema Public (13 Tabel Resmi)

| Konsep Bisnis | Istilah Kanonis DB | Tabel Resmi Supabase | Kolom Kunci yang Telah Diperiksa | Istilah UI Resmi | Istilah Non-Kanonis / Dilarang |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Profil Pengguna** | `user_profile` | `public.user_profiles` | `id`, `display_name`, `phone`, `avatar_url`, `role`, `status`, `is_active`, `created_at`, `updated_at` | Pelanggan / Pengguna | `admin_users`, `users`, `full_name`, `email`* (email di auth.users) |
| **Mitra Pengemudi** | `driver_profile` | `public.driver_profiles` | `user_id` (PK), `vehicle_type`, `vehicle_brand`, `vehicle_model`, `vehicle_plate`, `verification_status`, `is_online`, `current_lat`, `current_lng`, `last_location_at` | Mitra Driver | `drivers`, `plate_number` (wajib alias ke `vehicle_plate`) |
| **Pesanan Perjalanan** | `order` | `public.orders` | `id`, `customer_id`, `driver_id`, `service_type_id`, `status`, `pickup_address`, `dropoff_address`, `estimated_distance_km`, `estimated_fare_idr` | Pesanan / Trip | `trips`, `bookings`, `fare_amount` (kolom resmi: `estimated_fare_idr`) |
| **Riwayat Status** | `order_status_history` | `public.order_status_history` | `id`, `order_id`, `old_status`, `new_status`, `changed_by`, `created_at` | Riwayat Status Pesanan | `previous_status` (kolom resmi: `old_status`) |
| **Katalog Layanan** | `service_type` | `public.service_types` | `id`, `code`, `name`, `description`, `base_fare_idr`, `fare_per_km_idr`, `minimum_fare_idr`, `is_active` | Layanan Transportasi & Kurir | `services`, `ride_types` |
| **Zona Operasional** | `service_zone` | `public.service_zones` | `id`, `code`, `name`, `city`, `region`, `boundary`, `is_active` | Zona Layanan 0511 | `operational_zones`, `area_code` |
| **Aturan Tarif** | `tariff_rule` | `public.tariff_rules` | `id`, `service_type_id`, `name`, `version`, `status`, `currency`, `base_fare_idr`, `fare_per_km_idr`, `minimum_fare_idr`, `booking_fee_idr`, `waiting_fee_per_minute_idr` | Aturan & Formula Tarif | `pricing_rules`, `tariffs` |
| **Transaksi Finansial**| `payment_transaction`| `public.payment_transactions` | `id`, `order_id`, `user_id`, `amount_idr`, `status`, `paid_at` | Transaksi Pembayaran | `payments`, `wallet_transactions` |
| **Tiket Bantuan** | `support_ticket` | `public.support_tickets` | `id`, `customer_id`, `order_id`, `subject`, `category`, `description`, `status`, `priority`, `assigned_to` | Tiket Dukungan & Bantuan | `complaints`, `tickets`, `issues` |
| **Pengaturan Admin** | `admin_setting` | `public.admin_settings` | `key` (PK), `value`, `description`, `updated_by`, `updated_at` | Pengaturan Platform | `system_configs`, `settings` |
| **Log Audit** | `audit_log` | `public.audit_logs` | `id`, `actor_id`, `action`, `entity_type`, `metadata` | Catatan Audit Forensik | `activity_logs`, `admin_logs` |
| **Eksekusi CI/CD** | `system_change_run` | `public.system_change_runs` | `id`, `branch_name`, `commit_sha`, `event_name`, `external_run_id`, `overall_status`, `install_status`, `test_status`, `report` | Riwayat Perubahan Sistem | `ci_runs`, `pipeline_runs` |
| **Kesiapan Sistem** | `system_readiness_status` | `public.system_readiness_status`| `system_key` (PK), `status`, `last_change_run_id`, `supabase_project_ref`, `repository`, `message`, `checks`, `checked_at` | Status Kesiapan Sub-sistem | `health_checks`, `readiness` |

---

## 3. Tabel Istilah Kanonis: Schema Governance (6 Tabel KIGS)

| Tabel Governance | Fungsi | Kolom Utama yang Diperiksa |
| :--- | :--- | :--- |
| **`governance.canonical_terms`** | Registri istilah resmi disahkan | `id`, `term_key`, `canonical_label`, `definition`, `category`, `source_kind`, `source_ref`, `status`, `version_added`, `metadata` |
| **`governance.term_proposals`** | Usulan istilah baru / revisi istilah | `id`, `proposed_key`, `proposed_label`, `proposed_definition`, `category`, `reason`, `existing_equivalents`, `impact_assessment`, `status`, `requested_by`, `reviewed_by` |
| **`governance.change_requests`** | Permintaan perubahan sistem & gate CI | `id`, `task_key`, `task_type`, `repository`, `branch_name`, `base_commit_sha`, `proposed_commit_sha`, `registry_version`, `status`, `gate_result` |
| **`governance.audit_events`** | Catatan peristiwa tata kelola sistem | `id`, `event_type`, `actor`, `change_request_id`, `term_proposal_id`, `rollback_event_id`, `registry_version`, `details` |
| **`governance.rollback_events`** | Pencatatan & verifikasi pemulihan | `id`, `change_request_id`, `trigger_reason`, `target_registry_version`, `previous_commit_sha`, `target_commit_sha`, `migration_strategy`, `status` |
| **`governance.registry_state`** | Status sinkronisasi & mode proteksi | `singleton`, `registry_version`, `schema_fingerprint`, `last_schema_sync_at`, `sync_status`, `write_gate_mode` |

---

## 4. Nilai Kanonis Enum & Status

### A. Role & Status Pengguna (`public.user_profiles`)
* **Role Kanonis:** `customer`, `driver`, `admin`.
* **Status Akun Kanonis:** `active`, `inactive`, `suspended`.
* **Mekanisme Integritas:** Kolom `status` dan `is_active` disinkronkan secara konsisten (`active` &harr; `is_active: true`). Perubahan role dilindungi oleh trigger database `prevent_user_self_promotion()`.

### B. Jenis Kendaraan & Verifikasi Mitra (`public.driver_profiles`)
* **Vehicle Type Kanonis:** `motorcycle`, `car`, `van`, `other`. (Fungsi `normalizeVehicleType()` memetakan input legacy `motor` &rarr; `motorcycle`, `mobil` &rarr; `car`).
* **Verification Status Kanonis:** `pending`, `approved`, `rejected`, `suspended`.

### C. Siklus Hidup Pesanan (`public.orders`)
* **Status Pesanan Kanonis:** `searching`, `assigned`, `arrived`, `in_trip`, `completed`, `cancelled`.
* **Kolom Tarif:** Menggunakan `estimated_fare_idr` (bukan `fare_amount`).
* **Riwayat Status:** Menggunakan `old_status` dan `new_status` pada `public.order_status_history`.
