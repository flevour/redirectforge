import type { StorageAdapter } from '../repositories/index.js';
import type { RedirectStatus } from '../types/index.js';

export async function bulkDeleteRedirects(
  storage: StorageAdapter,
  ids: string[],
): Promise<void> {
  await storage.redirects.deleteMany(ids);
}

export async function bulkSetRedirectStatus(
  storage: StorageAdapter,
  ids: string[],
  status: RedirectStatus,
): Promise<void> {
  await storage.redirects.updateManyStatus(ids, status);
}

export async function bulkDeleteRedirectLogs(
  storage: StorageAdapter,
  ids: string[],
): Promise<void> {
  await storage.redirectLogs.deleteMany(ids);
}

export async function bulkDeleteNotFoundLogs(
  storage: StorageAdapter,
  ids: string[],
): Promise<void> {
  await storage.notFoundLogs.deleteMany(ids);
}

export async function deleteAllTenantRedirectLogs(
  storage: StorageAdapter,
  tenantId: string,
): Promise<void> {
  await storage.redirectLogs.deleteByTenantId(tenantId);
}

export async function deleteAllTenantNotFoundLogs(
  storage: StorageAdapter,
  tenantId: string,
): Promise<void> {
  await storage.notFoundLogs.deleteByTenantId(tenantId);
}
