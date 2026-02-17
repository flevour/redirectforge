import type { TenantHost } from '../types/index.js';
import type { TenantHostRepository } from '../repositories/index.js';
import { RedirectForgeError } from '../types/index.js';
import type { PgPool } from './pg-client.js';
import { TABLES } from './table-names.js';
import { toTenantHost } from './row-mappers.js';
import { buildSetClause } from './query-builder.js';

const T = TABLES.tenantHosts;

export class PgTenantHostRepository implements TenantHostRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: string): Promise<TenantHost | undefined> {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${T} WHERE id = $1`,
      [id],
    );
    return rows[0] ? toTenantHost(rows[0]) : undefined;
  }

  async findByHostname(hostname: string): Promise<TenantHost | undefined> {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${T} WHERE hostname = $1`,
      [hostname],
    );
    return rows[0] ? toTenantHost(rows[0]) : undefined;
  }

  async findByTenantId(tenantId: string): Promise<TenantHost[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${T} WHERE tenant_id = $1`,
      [tenantId],
    );
    return rows.map(toTenantHost);
  }

  async create(input: Omit<TenantHost, 'id'>): Promise<TenantHost> {
    const { rows } = await this.pool.query(
      `INSERT INTO ${T} (tenant_id, hostname, environment, status)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [input.tenant_id, input.hostname, input.environment ?? null, input.status],
    );
    if (!rows[0]) throw new RedirectForgeError('Failed to create tenant host');
    return toTenantHost(rows[0]);
  }

  async update(id: string, input: Partial<Omit<TenantHost, 'id'>>): Promise<TenantHost> {
    const { clause, values, nextParam } = buildSetClause(input as Record<string, unknown>, 1);
    if (!clause) {
      const found = await this.findById(id);
      if (!found) throw new RedirectForgeError(`Tenant host not found: ${id}`);
      return found;
    }
    values.push(id);
    const { rows } = await this.pool.query(
      `UPDATE ${T} SET ${clause} WHERE id = $${nextParam} RETURNING *`,
      values,
    );
    if (!rows[0]) throw new RedirectForgeError(`Tenant host not found: ${id}`);
    return toTenantHost(rows[0]);
  }

  async delete(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM ${T} WHERE id = $1`, [id]);
  }
}
