import type { StorageAdapter } from '../repositories/index.js';
import { MemoryTenantRepository } from './memory-tenant.repository.js';
import { MemoryTenantHostRepository } from './memory-tenant-host.repository.js';
import { MemoryGroupRepository } from './memory-group.repository.js';
import { MemoryRedirectRepository } from './memory-redirect.repository.js';
import { MemoryRedirectLogRepository } from './memory-redirect-log.repository.js';
import { MemoryNotFoundLogRepository } from './memory-not-found-log.repository.js';

export function createMemoryStorage(): StorageAdapter {
  const groups = new MemoryGroupRepository();
  return {
    tenants: new MemoryTenantRepository(),
    tenantHosts: new MemoryTenantHostRepository(),
    groups,
    redirects: new MemoryRedirectRepository(groups),
    redirectLogs: new MemoryRedirectLogRepository(),
    notFoundLogs: new MemoryNotFoundLogRepository(),
  };
}
