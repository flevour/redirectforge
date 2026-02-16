import type { TenantRepository } from './tenant.repository.js';
import type { TenantHostRepository } from './tenant-host.repository.js';
import type { GroupRepository } from './group.repository.js';
import type { RedirectRepository } from './redirect.repository.js';
import type { RedirectLogRepository } from './redirect-log.repository.js';
import type { NotFoundLogRepository } from './not-found-log.repository.js';

export interface StorageAdapter {
  tenants: TenantRepository;
  tenantHosts: TenantHostRepository;
  groups: GroupRepository;
  redirects: RedirectRepository;
  redirectLogs: RedirectLogRepository;
  notFoundLogs: NotFoundLogRepository;
}
