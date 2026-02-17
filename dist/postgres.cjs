"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/postgres.ts
var postgres_exports = {};
__export(postgres_exports, {
  PgGroupRepository: () => PgGroupRepository,
  PgNotFoundLogRepository: () => PgNotFoundLogRepository,
  PgRedirectLogRepository: () => PgRedirectLogRepository,
  PgRedirectRepository: () => PgRedirectRepository,
  PgTenantHostRepository: () => PgTenantHostRepository,
  PgTenantRepository: () => PgTenantRepository,
  createPostgresStorage: () => createPostgresStorage
});
module.exports = __toCommonJS(postgres_exports);

// src/types/errors.ts
var RedirectForgeError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "RedirectForgeError";
  }
};

// src/pg/table-names.ts
var TABLES = {
  tenants: "redirectforge_tenants",
  tenantHosts: "redirectforge_tenant_hosts",
  groups: "redirectforge_groups",
  redirects: "redirectforge_redirects",
  redirectLogs: "redirectforge_redirect_logs",
  notFoundLogs: "redirectforge_not_found_logs"
};
var FUNCTIONS = {
  getActiveRedirectsByTenant: "redirectforge_get_active_redirects_by_tenant",
  incrementRedirectHit: "redirectforge_increment_redirect_hit",
  deleteExpiredRedirectLogs: "redirectforge_delete_expired_redirect_logs",
  deleteExpiredNotFoundLogs: "redirectforge_delete_expired_not_found_logs",
  queryRedirectLogGroups: "redirectforge_query_redirect_log_groups",
  queryNotFoundLogGroups: "redirectforge_query_not_found_log_groups"
};

// src/pg/row-mappers.ts
function parseDate(value) {
  if (!value) return void 0;
  return value instanceof Date ? value : new Date(value);
}
function parseSourceFlags(value) {
  if (typeof value === "string") return JSON.parse(value);
  return value;
}
function toTenant(row) {
  return {
    id: row.id,
    name: row.name,
    status: row.status
  };
}
function toTenantHost(row) {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    hostname: row.hostname,
    environment: row.environment ?? void 0,
    status: row.status
  };
}
function toGroup(row) {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    status: row.status,
    position: row.position
  };
}
function toRedirect(row) {
  return {
    id: row.id,
    group_id: row.group_id,
    position: row.position,
    title: row.title ?? void 0,
    status: row.status,
    source_url: row.source_url,
    source_flags: parseSourceFlags(row.source_flags),
    match_type: row.match_type,
    match_value: row.match_value ?? void 0,
    match_is_regex: row.match_is_regex,
    target_url: row.target_url ?? void 0,
    alternate_target_url: row.alternate_target_url ?? void 0,
    action_type: row.action_type,
    action_code: row.action_code,
    random_targets: row.random_targets ?? [],
    hit_count: row.hit_count,
    last_hit_at: parseDate(row.last_hit_at),
    log_excluded: row.log_excluded
  };
}
function toRedirectWithGroupPosition(row) {
  return {
    ...toRedirect(row),
    group_position: row.group_position
  };
}
function toRedirectLog(row) {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    redirect_id: row.redirect_id ?? void 0,
    created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
    source_url: row.source_url,
    target_url: row.target_url ?? void 0,
    domain: row.domain ?? void 0,
    ip: row.ip ?? void 0,
    http_code: row.http_code,
    user_agent: row.user_agent ?? void 0,
    referrer: row.referrer ?? void 0,
    request_method: row.request_method ?? void 0,
    request_headers: row.request_headers ?? void 0,
    redirect_source: row.redirect_source ?? void 0
  };
}
function toNotFoundLog(row) {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
    url: row.url,
    domain: row.domain ?? void 0,
    ip: row.ip ?? void 0,
    user_agent: row.user_agent ?? void 0,
    referrer: row.referrer ?? void 0,
    request_method: row.request_method ?? void 0,
    request_headers: row.request_headers ?? void 0
  };
}

// src/pg/query-builder.ts
var SAFE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;
function validateFieldName(field) {
  if (!SAFE_IDENTIFIER.test(field)) {
    throw new RedirectForgeError(`Invalid field name: ${field}`);
  }
}
function buildFilterClause(filters, startParam) {
  const conditions = [];
  const values = [];
  let idx = startParam;
  for (const f of filters) {
    validateFieldName(f.field);
    const val = f.value instanceof Date ? f.value.toISOString() : f.value;
    switch (f.operator) {
      case "eq":
        conditions.push(`"${f.field}" = $${idx}`);
        values.push(val);
        idx++;
        break;
      case "neq":
        conditions.push(`"${f.field}" != $${idx}`);
        values.push(val);
        idx++;
        break;
      case "contains":
        conditions.push(`"${f.field}" ILIKE $${idx}`);
        values.push(`%${val}%`);
        idx++;
        break;
      case "not_contains":
        conditions.push(`"${f.field}" NOT ILIKE $${idx}`);
        values.push(`%${val}%`);
        idx++;
        break;
      case "gt":
        conditions.push(`"${f.field}" > $${idx}`);
        values.push(val);
        idx++;
        break;
      case "gte":
        conditions.push(`"${f.field}" >= $${idx}`);
        values.push(val);
        idx++;
        break;
      case "lt":
        conditions.push(`"${f.field}" < $${idx}`);
        values.push(val);
        idx++;
        break;
      case "lte":
        conditions.push(`"${f.field}" <= $${idx}`);
        values.push(val);
        idx++;
        break;
    }
  }
  return {
    clause: conditions.length > 0 ? " AND " + conditions.join(" AND ") : "",
    values,
    nextParam: idx
  };
}
function buildSetClause(data, startParam) {
  const keys = Object.keys(data);
  const values = keys.map((k) => data[k]);
  const clause = keys.map((k, i) => `"${k}" = $${startParam + i}`).join(", ");
  return { clause, values, nextParam: startParam + keys.length };
}

// src/pg/pg-tenant.repository.ts
var T = TABLES.tenants;
var PgTenantRepository = class {
  constructor(pool) {
    this.pool = pool;
  }
  async findById(id) {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${T} WHERE id = $1`,
      [id]
    );
    return rows[0] ? toTenant(rows[0]) : void 0;
  }
  async findAll() {
    const { rows } = await this.pool.query(`SELECT * FROM ${T}`);
    return rows.map(toTenant);
  }
  async create(input) {
    const { rows } = await this.pool.query(
      `INSERT INTO ${T} (name, status) VALUES ($1, $2) RETURNING *`,
      [input.name, input.status]
    );
    if (!rows[0]) throw new RedirectForgeError("Failed to create tenant");
    return toTenant(rows[0]);
  }
  async update(id, input) {
    const { clause, values, nextParam } = buildSetClause(input, 1);
    if (!clause) {
      const found = await this.findById(id);
      if (!found) throw new RedirectForgeError(`Tenant not found: ${id}`);
      return found;
    }
    values.push(id);
    const { rows } = await this.pool.query(
      `UPDATE ${T} SET ${clause} WHERE id = $${nextParam} RETURNING *`,
      values
    );
    if (!rows[0]) throw new RedirectForgeError(`Tenant not found: ${id}`);
    return toTenant(rows[0]);
  }
  async delete(id) {
    await this.pool.query(`DELETE FROM ${T} WHERE id = $1`, [id]);
  }
};

// src/pg/pg-tenant-host.repository.ts
var T2 = TABLES.tenantHosts;
var PgTenantHostRepository = class {
  constructor(pool) {
    this.pool = pool;
  }
  async findById(id) {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${T2} WHERE id = $1`,
      [id]
    );
    return rows[0] ? toTenantHost(rows[0]) : void 0;
  }
  async findByHostname(hostname) {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${T2} WHERE hostname = $1`,
      [hostname]
    );
    return rows[0] ? toTenantHost(rows[0]) : void 0;
  }
  async findByTenantId(tenantId) {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${T2} WHERE tenant_id = $1`,
      [tenantId]
    );
    return rows.map(toTenantHost);
  }
  async create(input) {
    const { rows } = await this.pool.query(
      `INSERT INTO ${T2} (tenant_id, hostname, environment, status)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [input.tenant_id, input.hostname, input.environment ?? null, input.status]
    );
    if (!rows[0]) throw new RedirectForgeError("Failed to create tenant host");
    return toTenantHost(rows[0]);
  }
  async update(id, input) {
    const { clause, values, nextParam } = buildSetClause(input, 1);
    if (!clause) {
      const found = await this.findById(id);
      if (!found) throw new RedirectForgeError(`Tenant host not found: ${id}`);
      return found;
    }
    values.push(id);
    const { rows } = await this.pool.query(
      `UPDATE ${T2} SET ${clause} WHERE id = $${nextParam} RETURNING *`,
      values
    );
    if (!rows[0]) throw new RedirectForgeError(`Tenant host not found: ${id}`);
    return toTenantHost(rows[0]);
  }
  async delete(id) {
    await this.pool.query(`DELETE FROM ${T2} WHERE id = $1`, [id]);
  }
};

// src/pg/pg-group.repository.ts
var T3 = TABLES.groups;
var PgGroupRepository = class {
  constructor(pool) {
    this.pool = pool;
  }
  async findById(id) {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${T3} WHERE id = $1`,
      [id]
    );
    return rows[0] ? toGroup(rows[0]) : void 0;
  }
  async findByTenantId(tenantId) {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${T3} WHERE tenant_id = $1 ORDER BY position ASC`,
      [tenantId]
    );
    return rows.map(toGroup);
  }
  async create(input) {
    const { rows } = await this.pool.query(
      `INSERT INTO ${T3} (tenant_id, name, status, position)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [input.tenant_id, input.name, input.status, input.position]
    );
    if (!rows[0]) throw new RedirectForgeError("Failed to create group");
    return toGroup(rows[0]);
  }
  async update(id, input) {
    const { clause, values, nextParam } = buildSetClause(input, 1);
    if (!clause) {
      const found = await this.findById(id);
      if (!found) throw new RedirectForgeError(`Group not found: ${id}`);
      return found;
    }
    values.push(id);
    const { rows } = await this.pool.query(
      `UPDATE ${T3} SET ${clause} WHERE id = $${nextParam} RETURNING *`,
      values
    );
    if (!rows[0]) throw new RedirectForgeError(`Group not found: ${id}`);
    return toGroup(rows[0]);
  }
  async delete(id) {
    await this.pool.query(`DELETE FROM ${T3} WHERE id = $1`, [id]);
  }
  async countByTenantId(tenantId) {
    const { rows } = await this.pool.query(
      `SELECT count(*)::int AS cnt FROM ${T3} WHERE tenant_id = $1`,
      [tenantId]
    );
    return rows[0]?.cnt ?? 0;
  }
};

// src/pg/pg-redirect.repository.ts
var T4 = TABLES.redirects;
var COLUMNS = [
  "group_id",
  "position",
  "title",
  "status",
  "source_url",
  "source_flags",
  "match_type",
  "match_value",
  "match_is_regex",
  "target_url",
  "alternate_target_url",
  "action_type",
  "action_code",
  "random_targets",
  "hit_count",
  "last_hit_at",
  "log_excluded"
];
function serializeRow(input) {
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
    input.log_excluded
  ];
}
function serializePartial(input) {
  const row = {};
  const src = input;
  for (const key of Object.keys(src)) {
    if (key === "source_flags") {
      row[key] = JSON.stringify(src[key]);
    } else if (key === "last_hit_at") {
      const v = src[key];
      row[key] = v?.toISOString() ?? null;
    } else {
      row[key] = src[key] ?? null;
    }
  }
  return row;
}
var PgRedirectRepository = class {
  constructor(pool) {
    this.pool = pool;
  }
  async findById(id) {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${T4} WHERE id = $1`,
      [id]
    );
    return rows[0] ? toRedirect(rows[0]) : void 0;
  }
  async findByGroupId(groupId) {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${T4} WHERE group_id = $1 ORDER BY position ASC`,
      [groupId]
    );
    return rows.map(toRedirect);
  }
  async findActiveByTenantId(tenantId) {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${FUNCTIONS.getActiveRedirectsByTenant}($1)`,
      [tenantId]
    );
    return rows.map(toRedirectWithGroupPosition);
  }
  async create(input) {
    const colList = COLUMNS.map((c) => `"${c}"`).join(", ");
    const placeholders = COLUMNS.map((_, i) => `$${i + 1}`).join(", ");
    const { rows } = await this.pool.query(
      `INSERT INTO ${T4} (${colList}) VALUES (${placeholders}) RETURNING *`,
      serializeRow(input)
    );
    if (!rows[0]) throw new RedirectForgeError("Failed to create redirect");
    return toRedirect(rows[0]);
  }
  async createMany(inputs) {
    if (inputs.length === 0) return [];
    const colList = COLUMNS.map((c) => `"${c}"`).join(", ");
    const allValues = [];
    const valueTuples = [];
    for (let i = 0; i < inputs.length; i++) {
      const offset = i * COLUMNS.length;
      const placeholders = COLUMNS.map((_, j) => `$${offset + j + 1}`).join(", ");
      valueTuples.push(`(${placeholders})`);
      allValues.push(...serializeRow(inputs[i]));
    }
    const { rows } = await this.pool.query(
      `INSERT INTO ${T4} (${colList}) VALUES ${valueTuples.join(", ")} RETURNING *`,
      allValues
    );
    return rows.map(toRedirect);
  }
  async update(id, input) {
    const data = serializePartial(input);
    const keys = Object.keys(data);
    if (keys.length === 0) {
      const found = await this.findById(id);
      if (!found) throw new RedirectForgeError(`Redirect not found: ${id}`);
      return found;
    }
    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(", ");
    const values = keys.map((k) => data[k]);
    values.push(id);
    const { rows } = await this.pool.query(
      `UPDATE ${T4} SET ${setClauses} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!rows[0]) throw new RedirectForgeError(`Redirect not found: ${id}`);
    return toRedirect(rows[0]);
  }
  async updateManyStatus(ids, status) {
    if (ids.length === 0) return;
    await this.pool.query(
      `UPDATE ${T4} SET status = $1 WHERE id = ANY($2::uuid[])`,
      [status, ids]
    );
  }
  async delete(id) {
    await this.pool.query(`DELETE FROM ${T4} WHERE id = $1`, [id]);
  }
  async deleteMany(ids) {
    if (ids.length === 0) return;
    await this.pool.query(
      `DELETE FROM ${T4} WHERE id = ANY($1::uuid[])`,
      [ids]
    );
  }
  async deleteByGroupId(groupId) {
    await this.pool.query(
      `DELETE FROM ${T4} WHERE group_id = $1`,
      [groupId]
    );
  }
  async incrementHitCount(id, lastHitAt) {
    await this.pool.query(
      `SELECT ${FUNCTIONS.incrementRedirectHit}($1, $2)`,
      [id, lastHitAt.toISOString()]
    );
  }
  async resetHitCount(id) {
    await this.pool.query(
      `UPDATE ${T4} SET hit_count = 0, last_hit_at = NULL WHERE id = $1`,
      [id]
    );
  }
  async countByGroupId(groupId) {
    const { rows } = await this.pool.query(
      `SELECT count(*)::int AS cnt FROM ${T4} WHERE group_id = $1`,
      [groupId]
    );
    return rows[0]?.cnt ?? 0;
  }
};

// src/pg/pg-redirect-log.repository.ts
var T5 = TABLES.redirectLogs;
var PgRedirectLogRepository = class {
  constructor(pool) {
    this.pool = pool;
  }
  async create(input) {
    const { rows } = await this.pool.query(
      `INSERT INTO ${T5}
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
        input.redirect_source ?? null
      ]
    );
    if (!rows[0]) throw new RedirectForgeError("Failed to create redirect log");
    return toRedirectLog(rows[0]);
  }
  async query(query) {
    const page = Math.max(1, query.page ?? 1);
    const perPage = Math.max(1, query.per_page ?? 50);
    const offset = (page - 1) * perPage;
    const baseValues = [query.tenant_id];
    let filterSQL = "";
    let nextParam = 2;
    if (query.filters?.length) {
      const f = buildFilterClause(query.filters, nextParam);
      filterSQL = f.clause;
      baseValues.push(...f.values);
      nextParam = f.nextParam;
    }
    const sortBy = query.sort_by ?? "created_at";
    const sortDir = query.sort_dir === "asc" ? "ASC" : "DESC";
    const { rows: countRows } = await this.pool.query(
      `SELECT count(*)::int AS cnt FROM ${T5} WHERE tenant_id = $1${filterSQL}`,
      baseValues
    );
    const total = countRows[0]?.cnt ?? 0;
    const dataValues = [...baseValues, perPage, offset];
    const { rows } = await this.pool.query(
      `SELECT * FROM ${T5}
       WHERE tenant_id = $1${filterSQL}
       ORDER BY "${sortBy}" ${sortDir}
       LIMIT $${nextParam} OFFSET $${nextParam + 1}`,
      dataValues
    );
    return {
      items: rows.map(toRedirectLog),
      total,
      page,
      per_page: perPage,
      total_pages: Math.max(1, Math.ceil(total / perPage))
    };
  }
  async groupBy(query) {
    const filters = (query.filters ?? []).map((f) => ({
      field: f.field,
      operator: f.operator,
      value: f.value instanceof Date ? f.value.toISOString() : String(f.value)
    }));
    const { rows } = await this.pool.query(
      `SELECT ${FUNCTIONS.queryRedirectLogGroups}($1, $2, $3::json, $4, $5, $6, $7) AS result`,
      [
        query.tenant_id,
        query.group_by,
        JSON.stringify(filters),
        query.sort_by ?? "count",
        query.sort_dir ?? "desc",
        query.page ?? 1,
        query.per_page ?? 50
      ]
    );
    const result = rows[0]?.result;
    return {
      items: result.items.map((i) => ({ value: i.value, count: i.cnt })),
      total: result.total,
      page: result.page,
      per_page: result.per_page,
      total_pages: result.total_pages
    };
  }
  async deleteMany(ids) {
    if (ids.length === 0) return;
    await this.pool.query(
      `DELETE FROM ${T5} WHERE id = ANY($1::uuid[])`,
      [ids]
    );
  }
  async deleteByTenantId(tenantId) {
    await this.pool.query(
      `DELETE FROM ${T5} WHERE tenant_id = $1`,
      [tenantId]
    );
  }
  async deleteExpiredBatch(cutoff, batchSize) {
    const { rows } = await this.pool.query(
      `SELECT ${FUNCTIONS.deleteExpiredRedirectLogs}($1, $2) AS result`,
      [cutoff.toISOString(), batchSize]
    );
    const result = rows[0]?.result;
    return { deleted: result.deleted_count, hasMore: result.has_more };
  }
  async countExpired(cutoff) {
    const { rows } = await this.pool.query(
      `SELECT count(*)::int AS cnt FROM ${T5} WHERE created_at < $1`,
      [cutoff.toISOString()]
    );
    return rows[0]?.cnt ?? 0;
  }
};

// src/pg/pg-not-found-log.repository.ts
var T6 = TABLES.notFoundLogs;
var PgNotFoundLogRepository = class {
  constructor(pool) {
    this.pool = pool;
  }
  async create(input) {
    const { rows } = await this.pool.query(
      `INSERT INTO ${T6}
       (tenant_id, created_at, url, domain, ip, user_agent, referrer, request_method, request_headers)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        input.tenant_id,
        input.created_at.toISOString(),
        input.url,
        input.domain ?? null,
        input.ip ?? null,
        input.user_agent ?? null,
        input.referrer ?? null,
        input.request_method ?? null,
        input.request_headers ?? null
      ]
    );
    if (!rows[0]) throw new RedirectForgeError("Failed to create not-found log");
    return toNotFoundLog(rows[0]);
  }
  async query(query) {
    const page = Math.max(1, query.page ?? 1);
    const perPage = Math.max(1, query.per_page ?? 50);
    const offset = (page - 1) * perPage;
    const baseValues = [query.tenant_id];
    let filterSQL = "";
    let nextParam = 2;
    if (query.filters?.length) {
      const f = buildFilterClause(query.filters, nextParam);
      filterSQL = f.clause;
      baseValues.push(...f.values);
      nextParam = f.nextParam;
    }
    const sortBy = query.sort_by ?? "created_at";
    const sortDir = query.sort_dir === "asc" ? "ASC" : "DESC";
    const { rows: countRows } = await this.pool.query(
      `SELECT count(*)::int AS cnt FROM ${T6} WHERE tenant_id = $1${filterSQL}`,
      baseValues
    );
    const total = countRows[0]?.cnt ?? 0;
    const dataValues = [...baseValues, perPage, offset];
    const { rows } = await this.pool.query(
      `SELECT * FROM ${T6}
       WHERE tenant_id = $1${filterSQL}
       ORDER BY "${sortBy}" ${sortDir}
       LIMIT $${nextParam} OFFSET $${nextParam + 1}`,
      dataValues
    );
    return {
      items: rows.map(toNotFoundLog),
      total,
      page,
      per_page: perPage,
      total_pages: Math.max(1, Math.ceil(total / perPage))
    };
  }
  async groupBy(query) {
    const filters = (query.filters ?? []).map((f) => ({
      field: f.field,
      operator: f.operator,
      value: f.value instanceof Date ? f.value.toISOString() : String(f.value)
    }));
    const { rows } = await this.pool.query(
      `SELECT ${FUNCTIONS.queryNotFoundLogGroups}($1, $2, $3::json, $4, $5, $6, $7) AS result`,
      [
        query.tenant_id,
        query.group_by,
        JSON.stringify(filters),
        query.sort_by ?? "count",
        query.sort_dir ?? "desc",
        query.page ?? 1,
        query.per_page ?? 50
      ]
    );
    const result = rows[0]?.result;
    return {
      items: result.items.map((i) => ({ value: i.value, count: i.cnt })),
      total: result.total,
      page: result.page,
      per_page: result.per_page,
      total_pages: result.total_pages
    };
  }
  async deleteMany(ids) {
    if (ids.length === 0) return;
    await this.pool.query(
      `DELETE FROM ${T6} WHERE id = ANY($1::uuid[])`,
      [ids]
    );
  }
  async deleteByTenantId(tenantId) {
    await this.pool.query(
      `DELETE FROM ${T6} WHERE tenant_id = $1`,
      [tenantId]
    );
  }
  async deleteExpiredBatch(cutoff, batchSize) {
    const { rows } = await this.pool.query(
      `SELECT ${FUNCTIONS.deleteExpiredNotFoundLogs}($1, $2) AS result`,
      [cutoff.toISOString(), batchSize]
    );
    const result = rows[0]?.result;
    return { deleted: result.deleted_count, hasMore: result.has_more };
  }
  async countExpired(cutoff) {
    const { rows } = await this.pool.query(
      `SELECT count(*)::int AS cnt FROM ${T6} WHERE created_at < $1`,
      [cutoff.toISOString()]
    );
    return rows[0]?.cnt ?? 0;
  }
};

// src/pg/pg-storage-adapter.ts
function createPostgresStorage(pool) {
  return {
    tenants: new PgTenantRepository(pool),
    tenantHosts: new PgTenantHostRepository(pool),
    groups: new PgGroupRepository(pool),
    redirects: new PgRedirectRepository(pool),
    redirectLogs: new PgRedirectLogRepository(pool),
    notFoundLogs: new PgNotFoundLogRepository(pool)
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PgGroupRepository,
  PgNotFoundLogRepository,
  PgRedirectLogRepository,
  PgRedirectRepository,
  PgTenantHostRepository,
  PgTenantRepository,
  createPostgresStorage
});
//# sourceMappingURL=postgres.cjs.map