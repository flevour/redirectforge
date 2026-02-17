import type { Tenant } from '../types/index.js';
import type { TenantRepository } from '../repositories/index.js';
import { RedirectForgeError } from '../types/index.js';
import type { PgPool } from './pg-client.js';
import { TABLES } from './table-names.js';
import { toTenant } from './row-mappers.js';
import { buildSetClause } from './query-builder.js';

const T = TABLES.tenants;

export class PgTenantRepository implements TenantRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: string): Promise<Tenant | undefined> {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${T} WHERE id = $1`,
      [id],
    );
    return rows[0] ? toTenant(rows[0]) : undefined;
  }

  async findAll(): Promise<Tenant[]> {
    const { rows } = await this.pool.query(`SELECT * FROM ${T}`);
    return rows.map(toTenant);
  }

  async create(input: Omit<Tenant, 'id'>): Promise<Tenant> {
    const { rows } = await this.pool.query(
      `INSERT INTO ${T} (name, status) VALUES ($1, $2) RETURNING *`,
      [input.name, input.status],
    );
    if (!rows[0]) throw new RedirectForgeError('Failed to create tenant');
    return toTenant(rows[0]);
  }

  async update(id: string, input: Partial<Omit<Tenant, 'id'>>): Promise<Tenant> {
    const { clause, values, nextParam } = buildSetClause(input as Record<string, unknown>, 1);
    if (!clause) {
      const found = await this.findById(id);
      if (!found) throw new RedirectForgeError(`Tenant not found: ${id}`);
      return found;
    }
    values.push(id);
    const { rows } = await this.pool.query(
      `UPDATE ${T} SET ${clause} WHERE id = $${nextParam} RETURNING *`,
      values,
    );
    if (!rows[0]) throw new RedirectForgeError(`Tenant not found: ${id}`);
    return toTenant(rows[0]);
  }

  async delete(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM ${T} WHERE id = $1`, [id]);
  }
}
