# Changelog

All notable changes to the KAWAI 0511 Admin Panel will be documented in this file.

## [1.0.0-ready] - 2026-10-14

### Added
- **Full 11-Module Operational Suite:**
  1. `LoginPage` (Supabase Auth form + Evaluation role switcher)
  2. `DashboardView` (Live fleet metrics, order stream, radar Banjarmasin 0511)
  3. `UsersPage` (Customer management, search, fraud suspension)
  4. `DriversView` (Fleet motor/mobil, document review, registration)
  5. `OrdersView` (Live dispatch, manual assignment, cancellation)
  6. `OrderDetailModal` (State machine timeline, distance, fee split)
  7. `AnalyticsPage` (Hourly WITA demand curves, service split, volume)
  8. `SettingsPage` (Platform commission %, SOS hotline, cashout limit)
  9. `ProfilePage` (Admin identity, RBAC scopes, session details)
  10. `Forbidden403` (Access denied page for insufficient permissions)
  11. `NotFound404` (Invalid route handler)
- **Authentication & RBAC:** Added `AuthContext.tsx` with Supabase session restore, real authentication gate, and role validation.
- **Data Access Layer:** Created `src/lib/api.ts` separating queries from UI components with clear simulation indicators.
- **Automated Testing:** Expanded `src/__tests__/security_and_config.test.ts` to 6 automated test suites (All passing).
- **Database Migrations:** Versioned SQL migrations (`001_core_schema.sql`, `002_driver_documents.sql`, `003_rbac_and_rls_policies.sql`).
- **Comprehensive Documentation:** Overhauled `README.md` and updated `.ai/` project management suite.
