# PostgreSQL Setup

RedirectForge ships SQL migrations in `node_modules/redirectforge/migrations/`. You apply them once to your database, then pass a pool/client to the adapter.

## 1. Apply Migrations

There are two migration files, applied in order:

```bash
# Direct with psql
psql $DATABASE_URL -f node_modules/redirectforge/migrations/001_create_tables.sql
psql $DATABASE_URL -f node_modules/redirectforge/migrations/002_create_views_and_functions.sql
```

### Supabase

Copy both files into your `supabase/migrations/` directory (rename with timestamps to fit the Supabase naming convention), then:

```bash
supabase db push
```

If you have Row-Level Security enabled, you'll need to create policies for all `redirectforge_*` tables or use a `service_role` key. The adapter never manages RLS — that's your responsibility.

### Vercel Postgres / Neon

Use your platform's migration tool or run the SQL files directly via their dashboard or CLI. The migrations are standard PostgreSQL — no extensions required.

## 2. Create the Adapter

```typescript
import { Pool } from 'pg';
import { createPostgresStorage } from 'redirectforge/postgres';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const storage = createPostgresStorage(pool);
```

The `createPostgresStorage` function accepts anything matching the `PgPool` interface:

```typescript
interface PgPool {
  query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }>;
}
```

This is satisfied by `pg.Pool`, `pg.Client`, `pg.PoolClient`, `@vercel/postgres`, `@neondatabase/serverless`, and similar clients.

## Schema Overview

All tables are prefixed with `redirectforge_` to avoid namespace collisions.

### Tables

| Table | Purpose |
|-------|---------|
| `redirectforge_tenants` | Multi-tenant isolation. `status` is `active` or `suspended`. |
| `redirectforge_tenant_hosts` | Maps hostnames to tenants. Unique index on `hostname`. |
| `redirectforge_groups` | Redirect groups with `position` ordering per tenant. |
| `redirectforge_redirects` | Redirect rules. `source_flags` is `jsonb`, `random_targets` is `text[]`. Cascades on group delete. |
| `redirectforge_redirect_logs` | Logs of matched redirects. Indexed on `tenant_id` and `created_at`. |
| `redirectforge_not_found_logs` | Logs of 404s. Same indexing pattern. |

### Postgres Functions

The migrations create functions for operations that can't be done efficiently with simple CRUD:

| Function | Purpose |
|----------|---------|
| `redirectforge_get_active_redirects_by_tenant(tenant_id)` | Returns enabled redirects in enabled groups, sorted by group position then redirect position. Used by `findActiveByTenantId`. |
| `redirectforge_increment_redirect_hit(id, timestamp)` | Atomic `hit_count + 1` without read-modify-write races. |
| `redirectforge_delete_expired_redirect_logs(cutoff, batch_size)` | Batched DELETE with LIMIT. Returns `{deleted_count, has_more}`. |
| `redirectforge_delete_expired_not_found_logs(cutoff, batch_size)` | Same pattern for not-found logs. |
| `redirectforge_query_redirect_log_groups(...)` | Dynamic GROUP BY with filter translation for log aggregation. |
| `redirectforge_query_not_found_log_groups(...)` | Same for not-found logs. |

### ID Generation

All tables use `uuid` primary keys with `gen_random_uuid()` as the default. No sequences, no extensions needed (built into PostgreSQL 13+).

### Timestamps

All timestamp columns use `timestamptz`. The adapter converts between `Date` objects in TypeScript and ISO strings for PostgreSQL.

## Connection Pooling

Connection pooling is your responsibility. If you're using `pg` directly, `new Pool()` handles it. If you're on a serverless platform, use the appropriate client:

- **Vercel**: `@vercel/postgres` (pooled by default)
- **Neon**: `@neondatabase/serverless` with their connection pooler
- **Supabase**: Use the pooler URL (port 6543), not the direct connection

## Running Integration Tests

```bash
# Apply migrations to a test database
psql $DATABASE_URL -f migrations/001_create_tables.sql
psql $DATABASE_URL -f migrations/002_create_views_and_functions.sql

# Run tests
DATABASE_URL=postgres://user:pass@localhost:5432/testdb pnpm vitest run src/pg/
```

Without `DATABASE_URL`, integration tests are automatically skipped.
