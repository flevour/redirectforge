import type { Group } from '../types/index.js';
import type { GroupRepository } from '../repositories/index.js';
import { RedirectForgeError } from '../types/index.js';
import type { PgPool } from './pg-client.js';
import { TABLES } from './table-names.js';
import { toGroup } from './row-mappers.js';
import { buildSetClause } from './query-builder.js';

const T = TABLES.groups;

export class PgGroupRepository implements GroupRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: string): Promise<Group | undefined> {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${T} WHERE id = $1`,
      [id],
    );
    return rows[0] ? toGroup(rows[0]) : undefined;
  }

  async findByTenantId(tenantId: string): Promise<Group[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${T} WHERE tenant_id = $1 ORDER BY position ASC`,
      [tenantId],
    );
    return rows.map(toGroup);
  }

  async create(input: Omit<Group, 'id'>): Promise<Group> {
    const { rows } = await this.pool.query(
      `INSERT INTO ${T} (tenant_id, name, status, position)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [input.tenant_id, input.name, input.status, input.position],
    );
    if (!rows[0]) throw new RedirectForgeError('Failed to create group');
    return toGroup(rows[0]);
  }

  async update(id: string, input: Partial<Omit<Group, 'id'>>): Promise<Group> {
    const { clause, values, nextParam } = buildSetClause(input as Record<string, unknown>, 1);
    if (!clause) {
      const found = await this.findById(id);
      if (!found) throw new RedirectForgeError(`Group not found: ${id}`);
      return found;
    }
    values.push(id);
    const { rows } = await this.pool.query(
      `UPDATE ${T} SET ${clause} WHERE id = $${nextParam} RETURNING *`,
      values,
    );
    if (!rows[0]) throw new RedirectForgeError(`Group not found: ${id}`);
    return toGroup(rows[0]);
  }

  async delete(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM ${T} WHERE id = $1`, [id]);
  }

  async countByTenantId(tenantId: string): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT count(*)::int AS cnt FROM ${T} WHERE tenant_id = $1`,
      [tenantId],
    );
    return rows[0]?.cnt ?? 0;
  }
}
