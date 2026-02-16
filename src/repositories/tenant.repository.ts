import type { Tenant } from '../types/index.js';

export interface TenantRepository {
  findById(id: string): Promise<Tenant | undefined>;
  findAll(): Promise<Tenant[]>;
  create(data: Omit<Tenant, 'id'>): Promise<Tenant>;
  update(id: string, data: Partial<Omit<Tenant, 'id'>>): Promise<Tenant>;
  delete(id: string): Promise<void>;
}
