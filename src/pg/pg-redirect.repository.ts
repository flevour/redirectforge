import type { Redirect } from '../types/index.js';
import type { RedirectRepository, RedirectWithGroupPosition } from '../repositories/index.js';
import { RedirectForgeError } from '../types/index.js';
import type { PgPool } from './pg-client.js';
import { TABLES, FUNCTIONS } from './table-names.js';
import { toRedirect, toRedirectWithGroupPosition } from './row-mappers.js';

const T = TABLES.redirects;

const COLUMNS = [
  'group_id', 'position', 'title', 'status', 'source_url', 'source_flags',
  'match_type', 'match_value', 'match_is_regex', 'target_url', 'alternate_target_url',
  'action_type', 'action_code', 'random_targets', 'hit_count', 'last_hit_at', 'log_excluded',
] as const;

function serializeRow(input: Omit<Redirect, 'id'>): unknown[] {
  return [
    input.group_id,
    input.position,
    input.title ?? null,
    input.status,
    input.source_url,
    JSON.stringify(input.source_flags),
    input.match_type,
    input.match_value ?? null,
    input.match_is_regex,
    input.target_url ?? null,
    input.alternate_target_url ?? null,
    input.action_type,
    input.action_code,
    input.random_targets,
    input.hit_count,
    input.last_hit_at?.toISOString() ?? null,
    input.log_excluded,
  ];
}

function serializePartial(input: Partial<Omit<Redirect, 'id'>>): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: Record<string, any> = {};
  const src = input as Record<string, unknown>;
  for (const key of Object.keys(src)) {
    if (key === 'source_flags') {
      row[key] = JSON.stringify(src[key]);
    } else if (key === 'last_hit_at') {
      const v = src[key] as Date | undefined;
      row[key] = v?.toISOString() ?? null;
    } else {
      row[key] = src[key] ?? null;
    }
  }
  return row;
}

export class PgRedirectRepository implements RedirectRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: string): Promise<Redirect | undefined> {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${T} WHERE id = $1`,
      [id],
    );
    return rows[0] ? toRedirect(rows[0]) : undefined;
  }

  async findByGroupId(groupId: string): Promise<Redirect[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${T} WHERE group_id = $1 ORDER BY position ASC`,
      [groupId],
    );
    return rows.map(toRedirect);
  }

  async findActiveByTenantId(tenantId: string): Promise<RedirectWithGroupPosition[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${FUNCTIONS.getActiveRedirectsByTenant}($1)`,
      [tenantId],
    );
    return rows.map(toRedirectWithGroupPosition);
  }

  async create(input: Omit<Redirect, 'id'>): Promise<Redirect> {
    const colList = COLUMNS.map((c) => `"${c}"`).join(', ');
    const placeholders = COLUMNS.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await this.pool.query(
      `INSERT INTO ${T} (${colList}) VALUES (${placeholders}) RETURNING *`,
      serializeRow(input),
    );
    if (!rows[0]) throw new RedirectForgeError('Failed to create redirect');
    return toRedirect(rows[0]);
  }

  async createMany(inputs: Omit<Redirect, 'id'>[]): Promise<Redirect[]> {
    if (inputs.length === 0) return [];
    const colList = COLUMNS.map((c) => `"${c}"`).join(', ');
    const allValues: unknown[] = [];
    const valueTuples: string[] = [];

    for (let i = 0; i < inputs.length; i++) {
      const offset = i * COLUMNS.length;
      const placeholders = COLUMNS.map((_, j) => `$${offset + j + 1}`).join(', ');
      valueTuples.push(`(${placeholders})`);
      allValues.push(...serializeRow(inputs[i]));
    }

    const { rows } = await this.pool.query(
      `INSERT INTO ${T} (${colList}) VALUES ${valueTuples.join(', ')} RETURNING *`,
      allValues,
    );
    return rows.map(toRedirect);
  }

  async update(id: string, input: Partial<Omit<Redirect, 'id'>>): Promise<Redirect> {
    const data = serializePartial(input);
    const keys = Object.keys(data);
    if (keys.length === 0) {
      const found = await this.findById(id);
      if (!found) throw new RedirectForgeError(`Redirect not found: ${id}`);
      return found;
    }
    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const values = keys.map((k) => data[k]);
    values.push(id);
    const { rows } = await this.pool.query(
      `UPDATE ${T} SET ${setClauses} WHERE id = $${values.length} RETURNING *`,
      values,
    );
    if (!rows[0]) throw new RedirectForgeError(`Redirect not found: ${id}`);
    return toRedirect(rows[0]);
  }

  async updateManyStatus(ids: string[], status: Redirect['status']): Promise<void> {
    if (ids.length === 0) return;
    await this.pool.query(
      `UPDATE ${T} SET status = $1 WHERE id = ANY($2::uuid[])`,
      [status, ids],
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM ${T} WHERE id = $1`, [id]);
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.pool.query(
      `DELETE FROM ${T} WHERE id = ANY($1::uuid[])`,
      [ids],
    );
  }

  async deleteByGroupId(groupId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM ${T} WHERE group_id = $1`,
      [groupId],
    );
  }

  async incrementHitCount(id: string, lastHitAt: Date): Promise<void> {
    await this.pool.query(
      `SELECT ${FUNCTIONS.incrementRedirectHit}($1, $2)`,
      [id, lastHitAt.toISOString()],
    );
  }

  async resetHitCount(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE ${T} SET hit_count = 0, last_hit_at = NULL WHERE id = $1`,
      [id],
    );
  }

  async countByGroupId(groupId: string): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT count(*)::int AS cnt FROM ${T} WHERE group_id = $1`,
      [groupId],
    );
    return rows[0]?.cnt ?? 0;
  }
}
