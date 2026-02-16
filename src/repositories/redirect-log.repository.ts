import type { RedirectLog, LogQuery, LogGroupQuery, LogGroupResult, PaginatedResult } from '../types/index.js';

export interface RedirectLogRepository {
  create(data: Omit<RedirectLog, 'id'>): Promise<RedirectLog>;
  query(query: LogQuery): Promise<PaginatedResult<RedirectLog>>;
  groupBy(query: LogGroupQuery): Promise<PaginatedResult<LogGroupResult>>;
  deleteMany(ids: string[]): Promise<void>;
  deleteByTenantId(tenantId: string): Promise<void>;
  deleteExpiredBatch(cutoff: Date, batchSize: number): Promise<{ deleted: number; hasMore: boolean }>;
  countExpired(cutoff: Date): Promise<number>;
}
