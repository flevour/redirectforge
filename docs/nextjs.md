# Next.js Integration Guide

This guide covers the full integration of RedirectForge into a Next.js application — from initial setup through request handling, admin API routes, log management, and ongoing maintenance.

## Overview

A complete integration involves these pieces:

1. **Database setup** — apply migrations to your Postgres instance
2. **Shared instance** — a singleton `RedirectForge` instance reused across your app
3. **Seed script** — one-time setup of your tenant and initial redirect group
4. **Middleware** — intercepts every request and applies redirects
5. **Admin API routes** — CRUD endpoints for managing redirects, groups, and logs
6. **Log maintenance** — a cron job or scheduled function to expire old logs
7. **Content monitoring** (optional) — auto-create redirects when CMS slugs change

## 1. Install

```bash
pnpm add redirectforge pg
```

Add your database connection string to `.env.local`:

```env
DATABASE_URL=postgres://user:pass@localhost:5432/mydb
```

## 2. Apply Migrations

See the [PostgreSQL setup guide](postgres.md) for full details. Quick version:

```bash
psql $DATABASE_URL -f node_modules/redirectforge/migrations/001_create_tables.sql
psql $DATABASE_URL -f node_modules/redirectforge/migrations/002_create_views_and_functions.sql
```

## 3. Create the Shared Instance

Create a module that exports a singleton. This is used by middleware, API routes, and server components alike.

```typescript
// lib/redirectforge.ts
import { Pool } from 'pg';
import { RedirectForge } from 'redirectforge';
import { createPostgresStorage } from 'redirectforge/postgres';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const forge = new RedirectForge({
  storage: createPostgresStorage(pool),
  config: {
    // Logs older than 30 days are cleaned up by expireLogs()
    redirect_log_retention_days: 30,
    not_found_log_retention_days: 14,
    // Track hit counts on each redirect
    track_hits: true,
    // Store full IPs (or 'anonymized' / 'none' for GDPR)
    ip_logging: 'anonymized',
  },
});
```

## 4. Seed Your Tenant

RedirectForge is multi-tenant. Before anything works, you need at least one tenant with a hostname mapped to it, and one redirect group. Run this once (e.g., as a script, a migration, or a one-off API call):

```typescript
// scripts/seed-redirectforge.ts
import { forge } from '../lib/redirectforge';

async function seed() {
  // Create a tenant
  const tenant = await forge.createTenant('My Site');
  console.log('Tenant ID:', tenant.id); // Save this — you'll need it for admin routes

  // Map your hostname(s) to this tenant
  // processRequest uses this to resolve which tenant owns the request
  await forge.addHost(tenant.id, 'mysite.com');
  await forge.addHost(tenant.id, 'www.mysite.com');

  // For local development
  await forge.addHost(tenant.id, 'localhost');

  // Create a default redirect group
  const group = await forge.createGroup(tenant.id, 'Default');
  console.log('Group ID:', group.id); // Save this — redirects go into groups
}

seed().catch(console.error);
```

Run with `npx tsx scripts/seed-redirectforge.ts`.

After seeding, store the tenant ID and default group ID somewhere your admin code can access them — environment variables, a config file, or just look them up at runtime:

```env
REDIRECTFORGE_TENANT_ID=<tenant-id-from-seed>
REDIRECTFORGE_DEFAULT_GROUP_ID=<group-id-from-seed>
```

## 5. Middleware — Request Processing

This is the core of the integration. The middleware intercepts every request, checks for redirects, and either redirects the user or passes through to Next.js.

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { forge } from './lib/redirectforge';

export async function middleware(request: NextRequest) {
  const result = await forge.processRequest({
    url: request.nextUrl.pathname + request.nextUrl.search,
    method: request.method,
    domain: request.nextUrl.hostname,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0',
    client_ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0',
    is_authenticated: false, // Set from your auth if needed
    user_agent: request.headers.get('user-agent') ?? undefined,
    referrer: request.headers.get('referer') ?? undefined,
    headers: Object.fromEntries(request.headers.entries()),
  });

  switch (result.action.type) {
    case 'redirect':
      return NextResponse.redirect(
        new URL(result.action.url!, request.url),
        result.action.code as 301 | 302 | 303 | 307 | 308,
      );
    case 'error':
      return new NextResponse(null, { status: result.action.code });
    case 'pass':
    default:
      return NextResponse.next();
  }
}

// Don't run on static assets or API routes you want to skip
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/redirectforge).*)',
  ],
};
```

**How tenant resolution works**: `processRequest` takes `request.domain` (the hostname), looks it up in `redirectforge_tenant_hosts`, finds the owning tenant, loads that tenant's active redirects, and evaluates them. You never pass a tenant ID to `processRequest` — the hostname is the key.

**What happens when there's no match**: The result is `{ action: { type: 'pass' } }` — your app handles the request normally.

**What happens when the hostname isn't registered**: Same — pass through. Unregistered hostnames are silently ignored.

## 6. Admin API Routes

You need routes to manage redirects. These are the admin/management side where you DO work with tenant and group IDs explicitly.

### List Redirects

```typescript
// app/api/redirectforge/redirects/route.ts
import { NextResponse } from 'next/server';
import { forge } from '@/lib/redirectforge';

const TENANT_ID = process.env.REDIRECTFORGE_TENANT_ID!;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get('group_id');

  if (!groupId) {
    // List all groups so the caller can pick one
    const groups = await forge.storage.groups.findByTenantId(TENANT_ID);
    return NextResponse.json(groups);
  }

  const redirects = await forge.storage.redirects.findByGroupId(groupId);
  return NextResponse.json(redirects);
}
```

### Create a Redirect

```typescript
// app/api/redirectforge/redirects/route.ts (continued)
export async function POST(request: Request) {
  const body = await request.json();
  const groupId = body.group_id ?? process.env.REDIRECTFORGE_DEFAULT_GROUP_ID;

  const redirect = await forge.createRedirect({
    group_id: groupId,
    source_url: body.source_url,         // e.g. '/old-page'
    target_url: body.target_url,         // e.g. '/new-page'
    action_type: body.action_type ?? 'redirect',
    action_code: body.action_code ?? 301,
    match_type: body.match_type ?? 'url',
    source_flags: body.source_flags ?? {
      case_insensitive: false,
      ignore_trailing_slash: true,
      query_handling: 'ignore',
      is_regex: false,
    },
  });

  return NextResponse.json(redirect, { status: 201 });
}
```

### Update / Delete a Redirect

```typescript
// app/api/redirectforge/redirects/[id]/route.ts
import { NextResponse } from 'next/server';
import { forge } from '@/lib/redirectforge';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const updated = await forge.updateRedirect(id, body);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await forge.deleteRedirect(id);
  return new NextResponse(null, { status: 204 });
}
```

### Enable / Disable a Redirect

```typescript
// app/api/redirectforge/redirects/[id]/enable/route.ts
import { NextResponse } from 'next/server';
import { forge } from '@/lib/redirectforge';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const redirect = await forge.enableRedirect(id);
  return NextResponse.json(redirect);
}
```

```typescript
// app/api/redirectforge/redirects/[id]/disable/route.ts
import { NextResponse } from 'next/server';
import { forge } from '@/lib/redirectforge';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const redirect = await forge.disableRedirect(id);
  return NextResponse.json(redirect);
}
```

### Bulk Operations

```typescript
// app/api/redirectforge/redirects/bulk/route.ts
import { NextResponse } from 'next/server';
import { forge } from '@/lib/redirectforge';

export async function POST(request: Request) {
  const { action, ids, status } = await request.json();

  switch (action) {
    case 'delete':
      await forge.bulkDeleteRedirects(ids);
      break;
    case 'set_status':
      await forge.bulkSetRedirectStatus(ids, status);
      break;
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  return new NextResponse(null, { status: 204 });
}
```

### Manage Groups

```typescript
// app/api/redirectforge/groups/route.ts
import { NextResponse } from 'next/server';
import { forge } from '@/lib/redirectforge';

const TENANT_ID = process.env.REDIRECTFORGE_TENANT_ID!;

export async function GET() {
  const groups = await forge.storage.groups.findByTenantId(TENANT_ID);
  return NextResponse.json(groups);
}

export async function POST(request: Request) {
  const { name } = await request.json();
  const group = await forge.createGroup(TENANT_ID, name);
  return NextResponse.json(group, { status: 201 });
}
```

## 7. Log Management

RedirectForge logs every matched redirect and every 404 (when the request had a 404 response code). You can query, aggregate, and clean up these logs.

### Query Redirect Logs

```typescript
// app/api/redirectforge/logs/redirects/route.ts
import { NextResponse } from 'next/server';
import { forge } from '@/lib/redirectforge';

const TENANT_ID = process.env.REDIRECTFORGE_TENANT_ID!;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') ?? 1);
  const perPage = Number(searchParams.get('per_page') ?? 50);

  const result = await forge.queryRedirectLogs({
    tenant_id: TENANT_ID,
    page,
    per_page: perPage,
    sort_by: 'created_at',
    sort_dir: 'desc',
  });

  return NextResponse.json(result);
  // { items: RedirectLog[], total, page, per_page, total_pages }
}
```

### Query with Filters

Log queries support field-level filters:

```typescript
const result = await forge.queryRedirectLogs({
  tenant_id: TENANT_ID,
  filters: [
    { field: 'http_code', operator: 'eq', value: 301 },
    { field: 'source_url', operator: 'contains', value: '/blog' },
    { field: 'created_at', operator: 'gte', value: new Date('2025-01-01') },
  ],
  sort_by: 'created_at',
  sort_dir: 'desc',
  page: 1,
  per_page: 25,
});
```

Available operators: `eq`, `neq`, `contains`, `not_contains`, `gt`, `gte`, `lt`, `lte`.

### Aggregate Logs (Group By)

See which URLs are redirected most often, or which IPs trigger the most 404s:

```typescript
// Top redirected source URLs
const topSources = await forge.groupRedirectLogs({
  tenant_id: TENANT_ID,
  group_by: 'source_url',
  sort_by: 'count',
  sort_dir: 'desc',
  per_page: 10,
});
// { items: [{ value: '/old-page', count: 1523 }, ...], total, ... }

// Top 404 URLs
const top404s = await forge.groupNotFoundLogs({
  tenant_id: TENANT_ID,
  group_by: 'url',
  sort_by: 'count',
  sort_dir: 'desc',
  per_page: 10,
});
```

### Query 404 Logs

```typescript
// app/api/redirectforge/logs/not-found/route.ts
import { NextResponse } from 'next/server';
import { forge } from '@/lib/redirectforge';

const TENANT_ID = process.env.REDIRECTFORGE_TENANT_ID!;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = await forge.queryNotFoundLogs({
    tenant_id: TENANT_ID,
    page: Number(searchParams.get('page') ?? 1),
    per_page: Number(searchParams.get('per_page') ?? 50),
    sort_by: 'created_at',
    sort_dir: 'desc',
  });
  return NextResponse.json(result);
}
```

## 8. Log Expiration (Maintenance)

Without cleanup, log tables grow indefinitely. `forge.expireLogs()` deletes logs older than your configured retention days in batches (so it won't lock tables for large deletes).

Set retention in your config (from step 3):

```typescript
config: {
  redirect_log_retention_days: 30,  // 0 = keep forever
  not_found_log_retention_days: 14,
}
```

### Option A: Vercel Cron

```typescript
// app/api/cron/expire-logs/route.ts
import { NextResponse } from 'next/server';
import { forge } from '@/lib/redirectforge';

export async function GET(request: Request) {
  // Protect the cron endpoint
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse(null, { status: 401 });
  }

  const result = await forge.expireLogs();
  return NextResponse.json(result);
  // { redirect_logs: { deleted: 5000, hasMore: true }, not_found_logs: { deleted: 200, hasMore: false } }
}
```

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/expire-logs",
      "schedule": "0 3 * * *"
    }
  ]
}
```

If `hasMore` is true, the batch was smaller than the total expired count. The next cron run will pick up the remainder. For very large backlogs, the aggressive cleanup config kicks in automatically.

### Option B: External Cron / Task Runner

Call the endpoint from any scheduler, or run it directly:

```typescript
import { forge } from './lib/redirectforge';

let result;
do {
  result = await forge.expireLogs();
  console.log('Cleaned:', result);
} while (result.redirect_logs.hasMore || result.not_found_logs.hasMore);
```

## 9. Import and Export

### Import Redirects from CSV

Useful for migrating from another redirect system or bulk-loading rules:

```typescript
// app/api/redirectforge/import/route.ts
import { NextResponse } from 'next/server';
import { forge } from '@/lib/redirectforge';

const GROUP_ID = process.env.REDIRECTFORGE_DEFAULT_GROUP_ID!;

export async function POST(request: Request) {
  const body = await request.text();

  const result = await forge.importRedirects(body, 'csv', GROUP_ID);
  return NextResponse.json(result);
  // { created: 42, errors: [{ row: 5, message: '...' }] }
}
```

### Export Redirects

```typescript
const redirects = await forge.storage.redirects.findByGroupId(groupId);

// As JSON
const json = forge.exportRedirects(redirects, 'json');

// As CSV
const csv = forge.exportRedirects(redirects, 'csv');
```

### Export Logs as CSV

```typescript
const logs = await forge.queryRedirectLogs({ tenant_id: TENANT_ID });
const csv = forge.exportRedirectLogsAsCsv(logs.items);
```

## 10. Content Monitoring (Optional)

If your CMS changes page URLs (e.g., editing a slug), RedirectForge can automatically create a redirect from the old URL to the new one:

```typescript
// In your CMS save handler or webhook
await forge.handleContentUrlChange(
  TENANT_ID,
  GROUP_ID,
  {
    content_type: 'page',        // Must be in config.monitor_content_types
    current_url: '/new-slug',
    previous_url: '/old-slug',   // Only creates a redirect if this differs
  },
);
```

Enable it in your config:

```typescript
config: {
  monitor_content_types: new Set(['page', 'post']),
}
```

## Redirect Configuration Reference

When creating a redirect, here's what each field does:

```typescript
forge.createRedirect({
  group_id: '...',               // Which group this redirect belongs to

  source_url: '/old-page',       // The URL pattern to match
  source_flags: {
    case_insensitive: false,     // Match '/Old-Page' too?
    ignore_trailing_slash: true, // Match '/old-page/' too?
    query_handling: 'ignore',    // 'ignore' | 'exact' | 'pass' | 'exact_order'
    is_regex: false,             // Treat source_url as a regex?
  },

  match_type: 'url',            // What to match: 'url' | 'ip' | 'user_agent' | 'referrer' | etc.
  match_value: undefined,        // For non-URL matches: the value to compare (IP range, regex, etc.)
  match_is_regex: false,         // Is match_value a regex?

  target_url: '/new-page',       // Where to redirect (for 'redirect' action)
  action_type: 'redirect',       // 'redirect' | 'error' | 'nothing' | 'random'
  action_code: 301,              // HTTP status: 301, 302, 303, 307, 308, 404, 410, etc.

  // Optional
  title: 'Blog migration',       // Human-readable label
  alternate_target_url: '/fallback', // Used with conditional matches
  random_targets: [],             // For action_type 'random': list of target URLs
  log_excluded: false,            // Skip logging this redirect's hits?
});
```

### Query Handling Modes

| Mode | Behavior |
|------|----------|
| `ignore` | Strip query string before matching. Query is not passed to target. |
| `exact` | Query string must match exactly (order-insensitive). |
| `exact_order` | Query string must match exactly, including parameter order. |
| `pass` | Query string is ignored for matching but passed through to the target URL. |

### Action Types

| Type | Behavior |
|------|----------|
| `redirect` | HTTP redirect to `target_url` with `action_code` (301, 302, etc.) |
| `error` | Return an HTTP error status (`action_code`: 404, 410, etc.) |
| `nothing` | Match the URL but do nothing (blocks other redirects from matching) |
| `random` | Redirect to a random URL from `random_targets` |

## Evaluation Order

Redirects are evaluated in this order:

1. **Group position** (ascending) — groups with lower position numbers are checked first
2. **Redirect position** (ascending) — within each group, redirects are checked in order

The first match wins. Use groups to organize redirects by priority (e.g., "Critical redirects" at position 0, "Blog redirects" at position 1).

## Error Handling

All RedirectForge errors extend `RedirectForgeError`:

```typescript
import { RedirectForgeError, NotFoundError, ValidationError } from 'redirectforge';

try {
  await forge.enableRedirect('nonexistent-id');
} catch (err) {
  if (err instanceof NotFoundError) {
    // Redirect not found
  }
  if (err instanceof ValidationError) {
    // Invalid input — err.field tells you which field
  }
  if (err instanceof RedirectForgeError) {
    // Any RedirectForge error (base class)
  }
}
```

In your API routes, catch these and return appropriate HTTP responses:

```typescript
try {
  const redirect = await forge.createRedirect(body);
  return NextResponse.json(redirect, { status: 201 });
} catch (err) {
  if (err instanceof NotFoundError) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
  if (err instanceof ValidationError) {
    return NextResponse.json({ error: err.message, field: err.field }, { status: 422 });
  }
  throw err; // Re-throw unexpected errors
}
```

## Complete File Structure

After integrating, your Next.js project will have these RedirectForge-related files:

```
lib/
  redirectforge.ts              # Shared singleton instance

middleware.ts                   # Request interception

app/api/redirectforge/
  redirects/
    route.ts                    # GET (list), POST (create)
    [id]/
      route.ts                  # PATCH (update), DELETE
      enable/route.ts           # POST
      disable/route.ts          # POST
    bulk/route.ts               # POST (bulk delete/status)
  groups/
    route.ts                    # GET (list), POST (create)
  logs/
    redirects/route.ts          # GET (query redirect logs)
    not-found/route.ts          # GET (query 404 logs)
  import/route.ts               # POST (CSV/JSON import)

app/api/cron/
  expire-logs/route.ts          # GET (cron endpoint)

scripts/
  seed-redirectforge.ts         # One-time tenant/group setup
```
