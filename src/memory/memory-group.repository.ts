import type { Group } from '../types/index.js';
import type { GroupRepository } from '../repositories/index.js';

export class MemoryGroupRepository implements GroupRepository {
  private store = new Map<string, Group>();
  private nextId = 1;

  async findById(id: string): Promise<Group | undefined> {
    return this.store.get(id);
  }

  async findByTenantId(tenantId: string): Promise<Group[]> {
    return [...this.store.values()]
      .filter((g) => g.tenant_id === tenantId)
      .sort((a, b) => a.position - b.position);
  }

  async create(data: Omit<Group, 'id'>): Promise<Group> {
    const id = String(this.nextId++);
    const group: Group = { id, ...data };
    this.store.set(id, group);
    return group;
  }

  async update(id: string, data: Partial<Omit<Group, 'id'>>): Promise<Group> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Group not found: ${id}`);
    const updated = { ...existing, ...data };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async countByTenantId(tenantId: string): Promise<number> {
    return [...this.store.values()].filter((g) => g.tenant_id === tenantId).length;
  }
}
