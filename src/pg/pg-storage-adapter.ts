import type { StorageAdapter } from '../repositories/index.js';
import type { PgPool } from './pg-client.js';
import { PgTenantRepository } from './pg-tenant.repository.js';
import { PgTenantHostRepository } from './pg-tenant-host.repository.js';
import { PgGroupRepository } from './pg-group.repository.js';
import { PgRedirectRepository } from './pg-redirect.repository.js';
import { PgRedirectLogRepository } from './pg-redirect-log.repository.js';
import { PgNotFoundLogRepository } from './pg-not-found-log.repository.js';

export function createPostgresStorage(pool: PgPool): StorageAdapter {
  return {
    tenants: new PgTenantRepository(pool),
    tenantHosts: new PgTenantHostRepository(pool),
    groups: new PgGroupRepository(pool),
    redirects: new PgRedirectRepository(pool),
    redirectLogs: new PgRedirectLogRepository(pool),
    notFoundLogs: new PgNotFoundLogRepository(pool),
  };
}
