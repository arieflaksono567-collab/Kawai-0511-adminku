<!-- README additions: Supabase sync instructions -->

## Supabase synchronization (source of truth)

This repository is intended to mirror Supabase as the source of truth for schema, policies, indexes, and views. The `supabase/migrations/` folder contains SQL migrations that should be applied to the Supabase project (via `supabase` CLI or SQL Editor) to bring the database schema in sync with application code.

Important commands (local development):

- Install supabase CLI: https://supabase.com/docs/guides/cli

- Push migrations to Supabase (example):

```bash
# Configure environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (do NOT commit keys)
supabase login
supabase db push --project-ref <PROJECT_REF>
```

- Generate TypeScript types from Supabase schema (optional):

```bash
supabase gen types typescript --project-ref <PROJECT_REF> --schema public > src/types/supabase.ts
```

- To create an admin test user manually (replace <UUID>):

```sql
INSERT INTO public.user_profiles (id, display_name, phone, role, created_at, updated_at)
VALUES ('<AUTH_USER_UUID>', 'Super Admin', '0812-xxxx-xxxx', 'admin', now(), now())
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, updated_at = now();
```

Notes:
- Never expose `service_role` key in client code. Use server-only endpoints for admin/privileged actions.
- Test migrations in a staging project prior to applying to production.
