import type { StorageAdapter } from '../repositories/index.js';
import type { TenantHost } from '../types/index.js';
import { NotFoundError, PreconditionError } from '../types/index.js';

export async function addHost(
  storage: StorageAdapter,
  tenantId: string,
  hostname: string,
  environment?: string,
): Promise<TenantHost> {
  const tenant = await storage.tenants.findById(tenantId);
  if (!tenant) throw new NotFoundError('Tenant', tenantId);
  if (tenant.status !== 'active') {
    throw new PreconditionError('Tenant must be active to add host');
  }

  const existing = await storage.tenantHosts.findByHostname(hostname);
  if (existing) {
    throw new PreconditionError(`Hostname already registered: ${hostname}`);
  }

  return storage.tenantHosts.create({
    tenant_id: tenantId,
    hostname,
    environment,
    status: 'enabled',
  });
}

export async function removeHost(
  storage: StorageAdapter,
  hostId: string,
): Promise<void> {
  const host = await storage.tenantHosts.findById(hostId);
  if (!host) throw new NotFoundError('TenantHost', hostId);

  const allHosts = await storage.tenantHosts.findByTenantId(host.tenant_id);
  const activeHosts = allHosts.filter((h) => h.status === 'enabled');
  if (activeHosts.length <= 1 && host.status === 'enabled') {
    throw new PreconditionError('Cannot remove last active host');
  }

  await storage.tenantHosts.delete(hostId);
}

export async function enableHost(
  storage: StorageAdapter,
  hostId: string,
): Promise<TenantHost> {
  const host = await storage.tenantHosts.findById(hostId);
  if (!host) throw new NotFoundError('TenantHost', hostId);
  if (host.status !== 'disabled') {
    throw new PreconditionError('Host must be disabled to enable');
  }
  return storage.tenantHosts.update(hostId, { status: 'enabled' });
}

export async function disableHost(
  storage: StorageAdapter,
  hostId: string,
): Promise<TenantHost> {
  const host = await storage.tenantHosts.findById(hostId);
  if (!host) throw new NotFoundError('TenantHost', hostId);
  if (host.status !== 'enabled') {
    throw new PreconditionError('Host must be enabled to disable');
  }
  return storage.tenantHosts.update(hostId, { status: 'disabled' });
}
