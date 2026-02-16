import type { Redirect } from '../types/index.js';
import type { RedirectRepository, RedirectWithGroupPosition } from '../repositories/index.js';
import type { GroupRepository } from '../repositories/index.js';

export class MemoryRedirectRepository implements RedirectRepository {
  private store = new Map<string, Redirect>();
  private nextId = 1;
  private groupRepo: GroupRepository;

  constructor(groupRepo: GroupRepository) {
    this.groupRepo = groupRepo;
  }

  async findById(id: string): Promise<Redirect | undefined> {
    return this.store.get(id);
  }

  async findByGroupId(groupId: string): Promise<Redirect[]> {
    return [...this.store.values()]
      .filter((r) => r.group_id === groupId)
      .sort((a, b) => a.position - b.position);
  }

  async findActiveByTenantId(tenantId: string): Promise<RedirectWithGroupPosition[]> {
    const groups = await this.groupRepo.findByTenantId(tenantId);
    const activeGroupIds = new Map<string, number>();
    for (const g of groups) {
      if (g.status === 'enabled') {
        activeGroupIds.set(g.id, g.position);
      }
    }

    const results: RedirectWithGroupPosition[] = [];
    for (const r of this.store.values()) {
      if (r.status === 'enabled' && activeGroupIds.has(r.group_id)) {
        results.push({
          ...r,
          group_position: activeGroupIds.get(r.group_id)!,
        });
      }
    }

    return results.sort(
      (a, b) => a.group_position - b.group_position || a.position - b.position,
    );
  }

  async create(data: Omit<Redirect, 'id'>): Promise<Redirect> {
    const id = String(this.nextId++);
    const redirect: Redirect = { id, ...data };
    this.store.set(id, redirect);
    return redirect;
  }

  async createMany(data: Omit<Redirect, 'id'>[]): Promise<Redirect[]> {
    return Promise.all(data.map((d) => this.create(d)));
  }

  async update(id: string, data: Partial<Omit<Redirect, 'id'>>): Promise<Redirect> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Redirect not found: ${id}`);
    const updated = { ...existing, ...data };
    this.store.set(id, updated);
    return updated;
  }

  async updateManyStatus(ids: string[], status: Redirect['status']): Promise<void> {
    for (const id of ids) {
      const existing = this.store.get(id);
      if (existing) {
        this.store.set(id, { ...existing, status });
      }
    }
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async deleteMany(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.store.delete(id);
    }
  }

  async deleteByGroupId(groupId: string): Promise<void> {
    for (const [id, r] of this.store) {
      if (r.group_id === groupId) this.store.delete(id);
    }
  }

  async incrementHitCount(id: string, lastHitAt: Date): Promise<void> {
    const existing = this.store.get(id);
    if (!existing) return;
    this.store.set(id, {
      ...existing,
      hit_count: existing.hit_count + 1,
      last_hit_at: lastHitAt,
    });
  }

  async resetHitCount(id: string): Promise<void> {
    const existing = this.store.get(id);
    if (!existing) return;
    this.store.set(id, {
      ...existing,
      hit_count: 0,
      last_hit_at: undefined,
    });
  }

  async countByGroupId(groupId: string): Promise<number> {
    return [...this.store.values()].filter((r) => r.group_id === groupId).length;
  }
}
