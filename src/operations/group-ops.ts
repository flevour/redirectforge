import type { StorageAdapter } from '../repositories/index.js';
import type { Group } from '../types/index.js';
import { NotFoundError, PreconditionError } from '../types/index.js';

export async function createGroup(
  storage: StorageAdapter,
  tenantId: string,
  name: string,
): Promise<Group> {
  const tenant = await storage.tenants.findById(tenantId);
  if (!tenant) throw new NotFoundError('Tenant', tenantId);
  if (tenant.status !== 'active') {
    throw new PreconditionError('Tenant must be active to create group');
  }

  const position = await storage.groups.countByTenantId(tenantId);
  return storage.groups.create({
    tenant_id: tenantId,
    name,
    status: 'enabled',
    position,
  });
}

export async function enableGroup(
  storage: StorageAdapter,
  groupId: string,
): Promise<Group> {
  const group = await storage.groups.findById(groupId);
  if (!group) throw new NotFoundError('Group', groupId);
  if (group.status !== 'disabled') {
    throw new PreconditionError('Group must be disabled to enable');
  }

  const redirects = await storage.redirects.findByGroupId(groupId);
  const ids = redirects.map((r) => r.id);
  if (ids.length > 0) {
    await storage.redirects.updateManyStatus(ids, 'enabled');
  }

  return storage.groups.update(groupId, { status: 'enabled' });
}

export async function disableGroup(
  storage: StorageAdapter,
  groupId: string,
): Promise<Group> {
  const group = await storage.groups.findById(groupId);
  if (!group) throw new NotFoundError('Group', groupId);
  if (group.status !== 'enabled') {
    throw new PreconditionError('Group must be enabled to disable');
  }

  const redirects = await storage.redirects.findByGroupId(groupId);
  const ids = redirects.map((r) => r.id);
  if (ids.length > 0) {
    await storage.redirects.updateManyStatus(ids, 'disabled');
  }

  return storage.groups.update(groupId, { status: 'disabled' });
}

export async function deleteGroup(
  storage: StorageAdapter,
  groupId: string,
): Promise<void> {
  const group = await storage.groups.findById(groupId);
  if (!group) throw new NotFoundError('Group', groupId);

  await storage.redirects.deleteByGroupId(groupId);
  await storage.groups.delete(groupId);
}
