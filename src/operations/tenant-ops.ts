import type { StorageAdapter } from '../repositories/index.js';
import type { Tenant } from '../types/index.js';
import { NotFoundError, PreconditionError } from '../types/index.js';

export async function createTenant(
  storage: StorageAdapter,
  name: string,
): Promise<Tenant> {
  return storage.tenants.create({ name, status: 'active' });
}

export async function suspendTenant(
  storage: StorageAdapter,
  tenantId: string,
): Promise<Tenant> {
  const tenant = await storage.tenants.findById(tenantId);
  if (!tenant) throw new NotFoundError('Tenant', tenantId);
  if (tenant.status !== 'active') {
    throw new PreconditionError('Tenant must be active to suspend');
  }
  return storage.tenants.update(tenantId, { status: 'suspended' });
}

export async function activateTenant(
  storage: StorageAdapter,
  tenantId: string,
): Promise<Tenant> {
  const tenant = await storage.tenants.findById(tenantId);
  if (!tenant) throw new NotFoundError('Tenant', tenantId);
  if (tenant.status !== 'suspended') {
    throw new PreconditionError('Tenant must be suspended to activate');
  }
  return storage.tenants.update(tenantId, { status: 'active' });
}
