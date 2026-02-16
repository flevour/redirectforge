import { describe, it, expect } from 'vitest';
import { exportRedirects, exportRedirectLogsAsCsv, exportNotFoundLogsAsCsv } from './exporter.js';
import type { Redirect, RedirectLog, NotFoundLog } from '../types/index.js';

function makeRedirect(overrides: Partial<Redirect> = {}): Redirect {
  return {
    id: '1',
    group_id: 'g1',
    position: 0,
    status: 'enabled',
    source_url: '/old',
    source_flags: {
      case_insensitive: false,
      ignore_trailing_slash: false,
      query_handling: 'exact',
      is_regex: false,
    },
    match_type: 'url',
    match_is_regex: false,
    target_url: '/new',
    action_type: 'redirect',
    action_code: 301,
    random_targets: [],
    hit_count: 5,
    log_excluded: false,
    ...overrides,
  };
}

describe('exportRedirects', () => {
  it('exports as JSON', () => {
    const redirects = [makeRedirect()];
    const result = exportRedirects(redirects, 'json');
    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].source_url).toBe('/old');
    expect(parsed[0].target_url).toBe('/new');
  });

  it('exports as CSV with header', () => {
    const redirects = [makeRedirect(), makeRedirect({ id: '2', source_url: '/other' })];
    const result = exportRedirects(redirects, 'csv');
    const lines = result.split('\n');
    expect(lines[0]).toBe('source_url,target_url,action_type,action_code,match_type,title');
    expect(lines).toHaveLength(3);
  });

  it('escapes CSV special characters', () => {
    const redirects = [makeRedirect({ source_url: '/path, with comma', title: 'A "title"' })];
    const result = exportRedirects(redirects, 'csv');
    expect(result).toContain('"/path, with comma"');
    expect(result).toContain('"A ""title"""');
  });
});

describe('exportRedirectLogsAsCsv', () => {
  it('renders log entries', () => {
    const logs: RedirectLog[] = [{
      id: '1', tenant_id: 't1', created_at: new Date('2025-01-15T10:30:00Z'),
      source_url: '/old', target_url: '/new', http_code: 301,
      ip: '1.2.3.4', user_agent: 'Chrome',
    }];
    const result = exportRedirectLogsAsCsv(logs);
    const lines = result.split('\n');
    expect(lines[0]).toContain('source_url');
    expect(lines[1]).toContain('/old');
    expect(lines[1]).toContain('1.2.3.4');
  });
});

describe('exportNotFoundLogsAsCsv', () => {
  it('renders 404 log entries', () => {
    const logs: NotFoundLog[] = [{
      id: '1', tenant_id: 't1', created_at: new Date('2025-01-15T10:30:00Z'),
      url: '/missing', ip: '1.2.3.4',
    }];
    const result = exportNotFoundLogsAsCsv(logs);
    const lines = result.split('\n');
    expect(lines[0]).toContain('url');
    expect(lines[1]).toContain('/missing');
  });
});
