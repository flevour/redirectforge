import type { TenantHost } from '../types/index.js';
import type { TenantHostRepository } from '../repositories/index.js';

export class MemoryTenantHostRepository implements TenantHostRepository {
  private store = new Map<string, TenantHost>();
  private nextId = 1;

  async findById(id: string): Promise<TenantHost | undefined> {
    return this.store.get(id);
  }

  async findByHostname(hostname: string): Promise<TenantHost | undefined> {
    for (const host of this.store.values()) {
      if (host.hostname === hostname) return host;
    }
    return undefined;
  }

  async findByTenantId(tenantId: string): Promise<TenantHost[]> {
    return [...this.store.values()].filter((h) => h.tenant_id === tenantId);
  }

  async create(data: Omit<TenantHost, 'id'>): Promise<TenantHost> {
    const id = String(this.nextId++);
    const host: TenantHost = { id, ...data };
    this.store.set(id, host);
    return host;
  }

  async update(id: string, data: Partial<Omit<TenantHost, 'id'>>): Promise<TenantHost> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`TenantHost not found: ${id}`);
    const updated = { ...existing, ...data };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
