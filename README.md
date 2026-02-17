# RedirectForge

Framework-agnostic Node.js URL redirection library. Provides URL redirect matching, regex/pattern support, redirect actions (URL redirect, 404, pass-through, random, error codes), and logging — all decoupled from any web framework or database.

## Install

```bash
pnpm add redirectforge
```

For PostgreSQL persistence (recommended for production):

```bash
pnpm add pg
```

## Storage Adapters

**In-memory** — zero dependencies, included in the core package. Good for testing and prototyping.

```typescript
import { RedirectForge, createMemoryStorage } from 'redirectforge';
const forge = new RedirectForge({ storage: createMemoryStorage() });
```

**PostgreSQL** — shipped as `redirectforge/postgres`. Works with any client that has a `.query(text, values)` method (`pg`, `@vercel/postgres`, `@neondatabase/serverless`).

```typescript
import { Pool } from 'pg';
import { RedirectForge } from 'redirectforge';
import { createPostgresStorage } from 'redirectforge/postgres';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const forge = new RedirectForge({ storage: createPostgresStorage(pool) });
```

The PostgreSQL adapter requires applying two migration files to your database. See the [PostgreSQL setup guide](docs/postgres.md).

## Framework Guides

- **[Next.js](docs/nextjs.md)** — full integration guide: setup, middleware, admin API routes, log management, and maintenance
- [PostgreSQL setup](docs/postgres.md) — migrations, schema overview, Supabase/Neon/Vercel Postgres notes

## How It Works

RedirectForge uses a multi-tenant model. The two sides of the library work differently:

**Request processing** (`forge.processRequest(request)`) — automatic. The library resolves the tenant from `request.domain` via the hostname lookup table. You never pass a tenant ID. If the hostname isn't registered, the request passes through.

**Administration** (creating redirects, querying logs, etc.) — explicit. You manage tenants, groups, and redirects by ID. The hierarchy is: **Tenant → Groups → Redirects**, with hostnames mapped to tenants.

## API Overview

```typescript
// Request processing (tenant resolved from request.domain)
forge.processRequest(request)  // → { action: { type, url?, code } }

// Tenant lifecycle
forge.createTenant(name)
forge.suspendTenant(tenantId)
forge.activateTenant(tenantId)

// Host management (maps hostnames → tenants)
forge.addHost(tenantId, hostname, environment?)
forge.removeHost(hostId)
forge.enableHost(hostId) / forge.disableHost(hostId)

// Groups (organize redirects, control evaluation order)
forge.createGroup(tenantId, name)
forge.enableGroup(groupId) / forge.disableGroup(groupId)
forge.deleteGroup(groupId)

// Redirects
forge.createRedirect({ group_id, source_url, source_flags, ... })
forge.updateRedirect(redirectId, { target_url, ... })
forge.enableRedirect(redirectId) / forge.disableRedirect(redirectId)
forge.deleteRedirect(redirectId)
forge.resetRedirectHits(redirectId)

// Bulk operations
forge.bulkDeleteRedirects(ids)
forge.bulkSetRedirectStatus(ids, status)

// Logs (queries require tenant_id)
forge.queryRedirectLogs({ tenant_id, filters?, sort_by?, page?, per_page? })
forge.groupRedirectLogs({ tenant_id, group_by, filters? })
forge.queryNotFoundLogs({ tenant_id, ... })
forge.groupNotFoundLogs({ tenant_id, ... })

// Maintenance
forge.expireLogs()  // deletes logs older than configured retention

// Import/export
forge.importRedirects(csvOrJson, format, targetGroupId)
forge.exportRedirects(redirects, format)

// Content monitoring (auto-create redirects when URLs change)
forge.handleContentUrlChange(tenantId, targetGroupId, { content_type, current_url, previous_url })
```

## Custom Storage Adapters

Implement the `StorageAdapter` interface (6 repositories) to connect any database:

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
```

All repository interfaces are exported from the main entry point.

## License

MIT
