import type { RedirectLog, LogQuery, LogGroupQuery, LogGroupResult, PaginatedResult } from '../types/index.js';
import type { RedirectLogRepository } from '../repositories/index.js';
import { queryItems, groupItems } from './log-query-helpers.js';

export class MemoryRedirectLogRepository implements RedirectLogRepository {
  private store = new Map<string, RedirectLog>();
  private nextId = 1;

  async create(data: Omit<RedirectLog, 'id'>): Promise<RedirectLog> {
    const id = String(this.nextId++);
    const log: RedirectLog = { id, ...data };
    this.store.set(id, log);
    return log;
  }

  async query(query: LogQuery): Promise<PaginatedResult<RedirectLog>> {
    return queryItems([...this.store.values()], 'tenant_id', query);
  }

  async groupBy(query: LogGroupQuery): Promise<PaginatedResult<LogGroupResult>> {
    return groupItems([...this.store.values()], 'tenant_id', query);
  }

  async deleteMany(ids: string[]): Promise<void> {
    for (const id of ids) this.store.delete(id);
  }

  async deleteByTenantId(tenantId: string): Promise<void> {
    for (const [id, log] of this.store) {
      if (log.tenant_id === tenantId) this.store.delete(id);
    }
  }

  async deleteExpiredBatch(cutoff: Date, batchSize: number): Promise<{ deleted: number; hasMore: boolean }> {
    const expired: string[] = [];
    for (const [id, log] of this.store) {
      if (log.created_at < cutoff) expired.push(id);
    }
    const toDelete = expired.slice(0, batchSize);
    for (const id of toDelete) this.store.delete(id);
    return { deleted: toDelete.length, hasMore: expired.length > batchSize };
  }

  async countExpired(cutoff: Date): Promise<number> {
    let count = 0;
    for (const log of this.store.values()) {
      if (log.created_at < cutoff) count++;
    }
    return count;
  }
}
