# RedirectForge

Framework-agnostic Node.js URL redirection library — a port of the WordPress Redirection plugin's core functionality. Provides URL redirect matching, regex/pattern support, redirect actions (URL redirect, 404, pass-through, random, error codes), and logging — all decoupled from any web framework or database.

## Install

```bash
pnpm add redirectforge
```

## Quick Start (in-memory)

The in-memory adapter is included with zero dependencies — useful for testing, prototyping, or single-process applications.

```typescript
import { RedirectForge, createMemoryStorage } from 'redirectforge';

const forge = new RedirectForge({ storage: createMemoryStorage() });

// Set up a tenant with a hostname
const tenant = await forge.createTenant('My Site');
await forge.addHost(tenant.id, 'example.com');

// Create a redirect group and a redirect rule
const group = await forge.createGroup(tenant.id, 'Default');
await forge.createRedirect({
  group_id: group.id,
  source_url: '/old-page',
  source_flags: {
    case_insensitive: false,
    ignore_trailing_slash: false,
    query_handling: 'exact',
    is_regex: false,
  },
  match_type: 'url',
  target_url: '/new-page',
  action_type: 'redirect',
  action_code: 301,
});

// Process a request
const result = await forge.processRequest({
  url: '/old-page',
  method: 'GET',
  domain: 'example.com',
  ip: '10.0.0.1',
  client_ip: '10.0.0.1',
  is_authenticated: false,
});

console.log(result.action);
// { type: 'redirect', url: '/new-page', code: 301 }
```

## PostgreSQL Storage Adapter

For production use, the PostgreSQL adapter persists redirects, logs, and configuration to any Postgres database. It is shipped as a separate subpath import so the core library stays zero-dependency.

### 1. Install the driver

```bash
pnpm add pg
```

Any client that exposes a standard `.query(text, values)` method works — `pg`, `@vercel/postgres`, `@neondatabase/serverless`, etc.

### 2. Apply database migrations

Copy the two migration files from `node_modules/redirectforge/migrations/` into your migration workflow and apply them in order:

```bash
# Example with psql
psql $DATABASE_URL -f node_modules/redirectforge/migrations/001_create_tables.sql
psql $DATABASE_URL -f node_modules/redirectforge/migrations/002_create_views_and_functions.sql
```

If you use Supabase, copy the files into `supabase/migrations/` and run `supabase db push`.

These create all tables (prefixed with `redirectforge_`), indexes, a view, and Postgres functions. They will not conflict with your existing schema.

### 3. Create the storage adapter

```typescript
import { Pool } from 'pg';
import { RedirectForge } from 'redirectforge';
import { createPostgresStorage } from 'redirectforge/postgres';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const storage = createPostgresStorage(pool);
const forge = new RedirectForge({ storage });

// Use forge exactly like the in-memory example above
const result = await forge.processRequest({ /* ... */ });
```

### Compatible clients

The adapter accepts any object matching the `PgPool` interface:

```typescript
interface PgPool {
  query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }>;
}
```

This means you can pass a `pg.Pool`, `pg.Client`, a Vercel Postgres client, a Neon serverless client, or any compatible wrapper.

## Framework Integration

RedirectForge is framework-agnostic. You call `forge.processRequest(request)` and act on the result. Here are examples for common frameworks.

### Express

```typescript
import express from 'express';
import { Pool } from 'pg';
import { RedirectForge } from 'redirectforge';
import { createPostgresStorage } from 'redirectforge/postgres';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const forge = new RedirectForge({ storage: createPostgresStorage(pool) });

const app = express();

app.use(async (req, res, next) => {
  const result = await forge.processRequest({
    url: req.originalUrl,
    method: req.method,
    domain: req.hostname,
    ip: req.ip ?? '0.0.0.0',
    client_ip: req.ip ?? '0.0.0.0',
    is_authenticated: !!req.user,
    user_agent: req.get('user-agent'),
    referrer: req.get('referer'),
    headers: req.headers as Record<string, string>,
    cookies: req.cookies,
  });

  if (result.action.type === 'redirect') {
    return res.redirect(result.action.code, result.action.url!);
  }
  if (result.action.type === 'error') {
    return res.status(result.action.code).end();
  }
  next();
});
```

### Next.js Middleware

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Pool } from 'pg';
import { RedirectForge } from 'redirectforge';
import { createPostgresStorage } from 'redirectforge/postgres';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const forge = new RedirectForge({ storage: createPostgresStorage(pool) });

export async function middleware(request: NextRequest) {
  const result = await forge.processRequest({
    url: request.nextUrl.pathname + request.nextUrl.search,
    method: request.method,
    domain: request.nextUrl.hostname,
    ip: request.headers.get('x-forwarded-for') ?? '0.0.0.0',
    client_ip: request.headers.get('x-forwarded-for') ?? '0.0.0.0',
    is_authenticated: false,
    user_agent: request.headers.get('user-agent') ?? undefined,
    referrer: request.headers.get('referer') ?? undefined,
  });

  if (result.action.type === 'redirect') {
    return NextResponse.redirect(new URL(result.action.url!, request.url), result.action.code);
  }
  if (result.action.type === 'error') {
    return new NextResponse(null, { status: result.action.code });
  }
  return NextResponse.next();
}
```

### Hono

```typescript
import { Hono } from 'hono';
import { Pool } from 'pg';
import { RedirectForge } from 'redirectforge';
import { createPostgresStorage } from 'redirectforge/postgres';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const forge = new RedirectForge({ storage: createPostgresStorage(pool) });

const app = new Hono();

app.use('*', async (c, next) => {
  const url = new URL(c.req.url);
  const result = await forge.processRequest({
    url: url.pathname + url.search,
    method: c.req.method,
    domain: url.hostname,
    ip: c.req.header('x-forwarded-for') ?? '0.0.0.0',
    client_ip: c.req.header('x-forwarded-for') ?? '0.0.0.0',
    is_authenticated: false,
    user_agent: c.req.header('user-agent'),
    referrer: c.req.header('referer'),
  });

  if (result.action.type === 'redirect') {
    return c.redirect(result.action.url!, result.action.code);
  }
  if (result.action.type === 'error') {
    return c.body(null, result.action.code);
  }
  await next();
});
```

## Database Schema

All tables are prefixed with `redirectforge_` to avoid conflicts:

| Table | Purpose |
|-------|---------|
| `redirectforge_tenants` | Multi-tenant isolation |
| `redirectforge_tenant_hosts` | Hostname → tenant mapping |
| `redirectforge_groups` | Redirect groups with position ordering |
| `redirectforge_redirects` | Redirect rules with matching and action config |
| `redirectforge_redirect_logs` | Logs of matched redirects |
| `redirectforge_not_found_logs` | Logs of 404s |

The migrations also create Postgres functions for operations that need atomic updates or exceed simple CRUD (hit count increments, batched log expiration, grouped aggregation queries).

### Row-Level Security

If you use Supabase or enable RLS, you will need to create policies for these tables or use a `service_role` key. The adapter never manages RLS policies — that is a consumer concern.

## Building a Custom Storage Adapter

Implement the `StorageAdapter` interface (6 repository interfaces) to connect any database:

```typescript
import type { StorageAdapter } from 'redirectforge';

const myStorage: StorageAdapter = {
  tenants: new MyTenantRepo(),
  tenantHosts: new MyTenantHostRepo(),
  groups: new MyGroupRepo(),
  redirects: new MyRedirectRepo(),
  redirectLogs: new MyRedirectLogRepo(),
  notFoundLogs: new MyNotFoundLogRepo(),
};

const forge = new RedirectForge({ storage: myStorage });
```

All repository interfaces are exported from the main entry point for TypeScript consumers implementing custom adapters.

## Running Integration Tests

The PostgreSQL integration tests require a running Postgres instance with the schema applied:

```bash
# Apply migrations
psql $DATABASE_URL -f migrations/001_create_tables.sql
psql $DATABASE_URL -f migrations/002_create_views_and_functions.sql

# Run integration tests
DATABASE_URL=postgres://user:pass@localhost:5432/testdb pnpm vitest run src/pg/
```

Without `DATABASE_URL` set, these tests are automatically skipped.

## License

MIT
