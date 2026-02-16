import type { NotFoundLog, LogQuery, LogGroupQuery, LogGroupResult, PaginatedResult } from '../types/index.js';

export interface NotFoundLogRepository {
  create(data: Omit<NotFoundLog, 'id'>): Promise<NotFoundLog>;
  query(query: LogQuery): Promise<PaginatedResult<NotFoundLog>>;
  groupBy(query: LogGroupQuery): Promise<PaginatedResult<LogGroupResult>>;
  deleteMany(ids: string[]): Promise<void>;
  deleteByTenantId(tenantId: string): Promise<void>;
  deleteExpiredBatch(cutoff: Date, batchSize: number): Promise<{ deleted: number; hasMore: boolean }>;
  countExpired(cutoff: Date): Promise<number>;
}
