import type {
  Tenant,
  TenantHost,
  Group,
  Redirect,
  RedirectLog,
  NotFoundLog,
  SourceFlags,
} from '../types/index.js';
import type { RedirectWithGroupPosition } from '../repositories/index.js';

function parseDate(value: string | Date | null | undefined): Date | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value : new Date(value);
}

function parseSourceFlags(value: unknown): SourceFlags {
  if (typeof value === 'string') return JSON.parse(value) as SourceFlags;
  return value as SourceFlags;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toTenant(row: any): Tenant {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toTenantHost(row: any): TenantHost {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    hostname: row.hostname,
    environment: row.environment ?? undefined,
    status: row.status,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toGroup(row: any): Group {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    status: row.status,
    position: row.position,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toRedirect(row: any): Redirect {
  return {
    id: row.id,
    group_id: row.group_id,
    position: row.position,
    title: row.title ?? undefined,
    status: row.status,
    source_url: row.source_url,
    source_flags: parseSourceFlags(row.source_flags),
    match_type: row.match_type,
    match_value: row.match_value ?? undefined,
    match_is_regex: row.match_is_regex,
    target_url: row.target_url ?? undefined,
    alternate_target_url: row.alternate_target_url ?? undefined,
    action_type: row.action_type,
    action_code: row.action_code,
    random_targets: row.random_targets ?? [],
    hit_count: row.hit_count,
    last_hit_at: parseDate(row.last_hit_at),
    log_excluded: row.log_excluded,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toRedirectWithGroupPosition(row: any): RedirectWithGroupPosition {
  return {
    ...toRedirect(row),
    group_position: row.group_position,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toRedirectLog(row: any): RedirectLog {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    redirect_id: row.redirect_id ?? undefined,
    created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
    source_url: row.source_url,
    target_url: row.target_url ?? undefined,
    domain: row.domain ?? undefined,
    ip: row.ip ?? undefined,
    http_code: row.http_code,
    user_agent: row.user_agent ?? undefined,
    referrer: row.referrer ?? undefined,
    request_method: row.request_method ?? undefined,
    request_headers: row.request_headers ?? undefined,
    redirect_source: row.redirect_source ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toNotFoundLog(row: any): NotFoundLog {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
    url: row.url,
    domain: row.domain ?? undefined,
    ip: row.ip ?? undefined,
    user_agent: row.user_agent ?? undefined,
    referrer: row.referrer ?? undefined,
    request_method: row.request_method ?? undefined,
    request_headers: row.request_headers ?? undefined,
  };
}
