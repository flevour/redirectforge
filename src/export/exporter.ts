import type { Redirect, RedirectLog, NotFoundLog } from '../types/index.js';
import type { ExportFormat } from './types.js';

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function redirectToCsvRow(r: Redirect): string {
  return [
    escapeCsvField(r.source_url),
    escapeCsvField(r.target_url ?? ''),
    r.action_type,
    String(r.action_code),
    r.match_type,
    escapeCsvField(r.title ?? ''),
  ].join(',');
}

function redirectToJsonObj(r: Redirect): Record<string, unknown> {
  return {
    source_url: r.source_url,
    target_url: r.target_url,
    alternate_target_url: r.alternate_target_url,
    source_flags: r.source_flags,
    match_type: r.match_type,
    match_value: r.match_value,
    match_is_regex: r.match_is_regex,
    action_type: r.action_type,
    action_code: r.action_code,
    random_targets: r.random_targets.length > 0 ? r.random_targets : undefined,
    title: r.title,
  };
}

export function exportRedirects(redirects: Redirect[], format: ExportFormat): string {
  if (format === 'json') {
    return JSON.stringify(redirects.map(redirectToJsonObj), null, 2);
  }

  const header = 'source_url,target_url,action_type,action_code,match_type,title';
  const rows = redirects.map(redirectToCsvRow);
  return [header, ...rows].join('\n');
}

export function exportRedirectLogsAsCsv(logs: RedirectLog[]): string {
  const header = 'created_at,source_url,target_url,domain,ip,http_code,user_agent,referrer,request_method';
  const rows = logs.map((l) =>
    [
      l.created_at.toISOString(),
      escapeCsvField(l.source_url),
      escapeCsvField(l.target_url ?? ''),
      escapeCsvField(l.domain ?? ''),
      l.ip ?? '',
      String(l.http_code),
      escapeCsvField(l.user_agent ?? ''),
      escapeCsvField(l.referrer ?? ''),
      l.request_method ?? '',
    ].join(','),
  );
  return [header, ...rows].join('\n');
}

export function exportNotFoundLogsAsCsv(logs: NotFoundLog[]): string {
  const header = 'created_at,url,domain,ip,user_agent,referrer,request_method';
  const rows = logs.map((l) =>
    [
      l.created_at.toISOString(),
      escapeCsvField(l.url),
      escapeCsvField(l.domain ?? ''),
      l.ip ?? '',
      escapeCsvField(l.user_agent ?? ''),
      escapeCsvField(l.referrer ?? ''),
      l.request_method ?? '',
    ].join(','),
  );
  return [header, ...rows].join('\n');
}
