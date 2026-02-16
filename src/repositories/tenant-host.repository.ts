import type { TenantHost } from '../types/index.js';

export interface TenantHostRepository {
  findById(id: string): Promise<TenantHost | undefined>;
  findByHostname(hostname: string): Promise<TenantHost | undefined>;
  findByTenantId(tenantId: string): Promise<TenantHost[]>;
  create(data: Omit<TenantHost, 'id'>): Promise<TenantHost>;
  update(id: string, data: Partial<Omit<TenantHost, 'id'>>): Promise<TenantHost>;
  delete(id: string): Promise<void>;
}
