import type { Tenant } from '../types/index.js';
import type { TenantRepository } from '../repositories/index.js';

export class MemoryTenantRepository implements TenantRepository {
  private store = new Map<string, Tenant>();
  private nextId = 1;

  async findById(id: string): Promise<Tenant | undefined> {
    return this.store.get(id);
  }

  async findAll(): Promise<Tenant[]> {
    return [...this.store.values()];
  }

  async create(data: Omit<Tenant, 'id'>): Promise<Tenant> {
    const id = String(this.nextId++);
    const tenant: Tenant = { id, ...data };
    this.store.set(id, tenant);
    return tenant;
  }

  async update(id: string, data: Partial<Omit<Tenant, 'id'>>): Promise<Tenant> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Tenant not found: ${id}`);
    const updated = { ...existing, ...data };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
