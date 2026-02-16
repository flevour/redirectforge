import type { Redirect } from '../types/index.js';

export interface RedirectWithGroupPosition extends Redirect {
  group_position: number;
}

export interface RedirectRepository {
  findById(id: string): Promise<Redirect | undefined>;
  findByGroupId(groupId: string): Promise<Redirect[]>;
  findActiveByTenantId(tenantId: string): Promise<RedirectWithGroupPosition[]>;
  create(data: Omit<Redirect, 'id'>): Promise<Redirect>;
  createMany(data: Omit<Redirect, 'id'>[]): Promise<Redirect[]>;
  update(id: string, data: Partial<Omit<Redirect, 'id'>>): Promise<Redirect>;
  updateManyStatus(ids: string[], status: Redirect['status']): Promise<void>;
  delete(id: string): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
  deleteByGroupId(groupId: string): Promise<void>;
  incrementHitCount(id: string, lastHitAt: Date): Promise<void>;
  resetHitCount(id: string): Promise<void>;
  countByGroupId(groupId: string): Promise<number>;
}
