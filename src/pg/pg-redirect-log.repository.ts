import type {
  RedirectLog,
  LogQuery,
  LogGroupQuery,
  LogGroupResult,
  PaginatedResult,
} from '../types/index.js';
import type { RedirectLogRepository } from '../repositories/index.js';
import { RedirectForgeError } from '../types/index.js';
import type { PgPool } from './pg-client.js';
import { TABLES, FUNCTIONS } from './table-names.js';
import { toRedirectLog } from './row-mappers.js';
import { buildFilterClause } from './query-builder.js';

const T = TABLES.redirectLogs;

export class PgRedirectLogRepository implements RedirectLogRepository {
  constructor(private readonly pool: PgPool) {}

  async create(input: Omit<RedirectLog, 'id'>): Promise<RedirectLog> {
    const { rows } = await this.pool.query(
      `INSERT INTO ${T}
       (tenant_id, redirect_id, created_at, source_url, target_url, domain,
        ip, http_code, user_agent, referrer, request_method, request_headers, redirect_source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        input.tenant_id,
        input.redirect_id ?? null,
        input.created_at.toISOString(),
        input.source_url,
        input.target_url ?? null,
        input.domain ?? null,
        input.ip ?? null,
        input.http_code,
        input.user_agent ?? null,
        input.referrer ?? null,
        input.request_method ?? null,
        input.request_headers ?? null,
        input.redirect_source ?? null,
      ],
    );
    if (!rows[0]) throw new RedirectForgeError('Failed to create redirect log');
    return toRedirectLog(rows[0]);
  }

  async query(query: LogQuery): Promise<PaginatedResult<RedirectLog>> {
    const page = Math.max(1, query.page ?? 1);
    const perPage = Math.max(1, query.per_page ?? 50);
    const offset = (page - 1) * perPage;

    const baseValues: unknown[] = [query.tenant_id];
    let filterSQL = '';
    let nextParam = 2;

    if (query.filters?.length) {
      const f = buildFilterClause(query.filters, nextParam);
      filterSQL = f.clause;
      baseValues.push(...f.values);
      nextParam = f.nextParam;
    }

    const sortBy = query.sort_by ?? 'created_at';
    const sortDir = query.sort_dir === 'asc' ? 'ASC' : 'DESC';

    // Count query
    const { rows: countRows } = await this.pool.query(
      `SELECT count(*)::int AS cnt FROM ${T} WHERE tenant_id = $1${filterSQL}`,
      baseValues,
    );
    const total = countRows[0]?.cnt ?? 0;

    // Data query
    const dataValues = [...baseValues, perPage, offset];
    const { rows } = await this.pool.query(
      `SELECT * FROM ${T}
       WHERE tenant_id = $1${filterSQL}
       ORDER BY "${sortBy}" ${sortDir}
       LIMIT $${nextParam} OFFSET $${nextParam + 1}`,
      dataValues,
    );

    return {
      items: rows.map(toRedirectLog),
      total,
      page,
      per_page: perPage,
      total_pages: Math.max(1, Math.ceil(total / perPage)),
    };
  }

  async groupBy(query: LogGroupQuery): Promise<PaginatedResult<LogGroupResult>> {
    const filters = (query.filters ?? []).map((f) => ({
      field: f.field,
      operator: f.operator,
      value: f.value instanceof Date ? f.value.toISOString() : String(f.value),
    }));

    const { rows } = await this.pool.query(
      `SELECT ${FUNCTIONS.queryRedirectLogGroups}($1, $2, $3::json, $4, $5, $6, $7) AS result`,
      [
        query.tenant_id,
        query.group_by,
        JSON.stringify(filters),
        query.sort_by ?? 'count',
        query.sort_dir ?? 'desc',
        query.page ?? 1,
        query.per_page ?? 50,
      ],
    );

    const result = rows[0]?.result as {
      items: Array<{ value: string; cnt: number }>;
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
    };

    return {
      items: result.items.map((i) => ({ value: i.value, count: i.cnt })),
      total: result.total,
      page: result.page,
      per_page: result.per_page,
      total_pages: result.total_pages,
    };
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.pool.query(
      `DELETE FROM ${T} WHERE id = ANY($1::uuid[])`,
      [ids],
    );
  }

  async deleteByTenantId(tenantId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM ${T} WHERE tenant_id = $1`,
      [tenantId],
    );
  }

  async deleteExpiredBatch(cutoff: Date, batchSize: number): Promise<{ deleted: number; hasMore: boolean }> {
    const { rows } = await this.pool.query(
      `SELECT ${FUNCTIONS.deleteExpiredRedirectLogs}($1, $2) AS result`,
      [cutoff.toISOString(), batchSize],
    );
    const result = rows[0]?.result as { deleted_count: number; has_more: boolean };
    return { deleted: result.deleted_count, hasMore: result.has_more };
  }

  async countExpired(cutoff: Date): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT count(*)::int AS cnt FROM ${T} WHERE created_at < $1`,
      [cutoff.toISOString()],
    );
    return rows[0]?.cnt ?? 0;
  }
}
