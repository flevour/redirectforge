import type { Group } from '../types/index.js';

export interface GroupRepository {
  findById(id: string): Promise<Group | undefined>;
  findByTenantId(tenantId: string): Promise<Group[]>;
  create(data: Omit<Group, 'id'>): Promise<Group>;
  update(id: string, data: Partial<Omit<Group, 'id'>>): Promise<Group>;
  delete(id: string): Promise<void>;
  countByTenantId(tenantId: string): Promise<number>;
}
