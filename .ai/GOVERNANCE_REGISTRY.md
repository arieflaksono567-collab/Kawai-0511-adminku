# KAWAI 0511 — Governance Registry & Controlled AI Development Guide
**Proyek:** KAWAI 0511 — Admin Panel  
**Database Acuan:** Supabase PostgreSQL (`rbfnjgrnojvzvrpyryms`)  
**Kerangka Kerja:** KAWAI Intelligent Governance System (KIGS)  
**Status Acuan:** Inventaris Database dan Struktur Terkonfirmasi Penuh  

---

## 1. Inventaris Database Terkonfirmasi

| Schema & Tabel | Status | Keterangan & Catatan |
| :--- | :--- | :--- |
| **`public.user_profiles`** | **TERKONFIRMASI** | `id`, `display_name`, `phone`, `avatar_url`, `role`, `status` (`active`, `inactive`, `suspended`), `is_active`, `created_at`, `updated_at`. |
| **`public.driver_profiles`** | **TERKONFIRMASI** | `user_id` (PK), `vehicle_type` (`motorcycle`, `car`, `van`, `other`), `vehicle_brand`, `vehicle_model`, `vehicle_plate`, `verification_status` (`pending`, `approved`, `rejected`, `suspended`), `is_online`, `current_lat`, `current_lng`, `last_location_at`. |
| **`public.orders`** | **TERKONFIRMASI** | `id`, `customer_id`, `driver_id`, `service_type_id`, `status` (`searching`, `assigned`, `arrived`, `in_trip`, `completed`, `cancelled`), `pickup_address`, `dropoff_address`, `estimated_distance_km`, `estimated_fare_idr`, `requested_at`, `accepted_at`, `arrived_at`, `started_at`, `completed_at`, `cancelled_at`. |
| **`public.order_status_history`**| **TERKONFIRMASI** | `id`, `order_id`, `old_status`, `new_status`, `changed_by`, `created_at`. Kolom resmi status lama: `old_status`. |
| **`public.service_types`** | **TERKONFIRMASI** | `id`, `code`, `name`, `description`, `base_fare_idr`, `fare_per_km_idr`, `minimum_fare_idr`, `is_active`. |
| **`public.service_zones`** | **TERKONFIRMASI** | `id`, `code`, `name`, `city`, `region`, `boundary`, `is_active`. Wilayah: 0511 Banjarmasin Raya & Kalsel. |
| **`public.tariff_rules`** | **TERKONFIRMASI** | `id`, `service_type_id`, `name`, `version`, `status` (`draft`, `active`, `archived`), `currency`, `base_fare_idr`, `included_distance_km`, `fare_per_km_idr`, `included_duration_min`, `fare_per_minute_idr`, `minimum_fare_idr`, `booking_fee_idr`, `waiting_fee_per_minute_idr`, `waiting_grace_minutes`, `cancellation_fee_idr`. |
| **`public.payment_transactions`**| **TERKONFIRMASI** | `id`, `order_id`, `user_id`, `amount_idr`, `status`, `paid_at`. |
| **`public.support_tickets`** | **TERKONFIRMASI** | `id`, `customer_id`, `order_id`, `subject`, `category`, `description`, `status`, `priority`, `assigned_to`. |
| **`public.admin_settings`** | **TERKONFIRMASI** | `key` (PK), `value`, `description`, `updated_by`, `updated_at`. |
| **`public.audit_logs`** | **TERKONFIRMASI** | `id`, `actor_id`, `action`, `entity_type`, `metadata`. |
| **`public.system_change_runs`** | **TERKONFIRMASI** | `id`, `branch_name`, `commit_sha`, `event_name`, `external_run_id`, `overall_status`, `install_status`, `test_status`, `typecheck_status`, `lint_status`, `build_status`, `deployment_output_status`, `connection_status`, `report`. |
| **`public.system_readiness_status`**| **TERKONFIRMASI** | `system_key` (PK), `status`, `last_change_run_id`, `supabase_project_ref`, `repository`, `message`, `checks`, `checked_at`. |
| **`governance.canonical_terms`** | **TERKONFIRMASI** | `id`, `term_key`, `canonical_label`, `definition`, `category`, `source_kind`, `source_ref`, `status`, `version_added`, `metadata`. |
| **`governance.term_proposals`** | **TERKONFIRMASI** | `id`, `proposed_key`, `proposed_label`, `proposed_definition`, `category`, `reason`, `existing_equivalents`, `impact_assessment`, `status`, `requested_by`, `reviewed_by`. |
| **`governance.change_requests`** | **TERKONFIRMASI** | `id`, `task_key`, `task_type`, `repository`, `branch_name`, `base_commit_sha`, `proposed_commit_sha`, `registry_version`, `schema_fingerprint`, `scope`, `manifest`, `status`, `gate_result`. |
| **`governance.audit_events`** | **TERKONFIRMASI** | `id`, `event_type`, `actor`, `change_request_id`, `term_proposal_id`, `rollback_event_id`, `registry_version`, `details`. |
| **`governance.rollback_events`** | **TERKONFIRMASI** | `id`, `change_request_id`, `trigger_reason`, `target_registry_version`, `previous_commit_sha`, `target_commit_sha`, `migration_strategy`, `status`, `affected_resources`. |
| **`governance.registry_state`** | **TERKONFIRMASI** | `singleton`, `registry_version`, `schema_fingerprint`, `last_schema_sync_at`, `sync_status`, `write_gate_mode`. |

---

## 2. Tahap Kerja Bertahap (Controlled Workflow)

- **Tahap 1 — Audit & Konfirmasi:** Memeriksa status repositori, branch, inventaris database, dan hasil tes.
- **Tahap 2 — Penyesuaian Acuan:** Menyinkronkan kamus istilah, tipe TypeScript, dan file migrasi skema.
- **Tahap 3 — Pemeriksaan Otomatis:** Memverifikasi kode melalui rangkaian automated test, lint, dan production build.
- **Tahap 4 — Pelaksanaan Terverifikasi:** Memastikan commit tercatat dengan pesan deskriptif dan terdokumentasi.
