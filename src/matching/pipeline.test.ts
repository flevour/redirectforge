import { describe, it, expect } from 'vitest';
import { findRedirect } from './pipeline.js';
import type { RedirectWithGroupPosition } from '../repositories/redirect.repository.js';
import type { HttpRequest } from '../types/external.js';

function makeCandidate(overrides: Partial<RedirectWithGroupPosition> = {}): RedirectWithGroupPosition {
  return {
    id: '1',
    group_id: 'g1',
    group_position: 0,
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
    hit_count: 0,
    log_excluded: false,
    ...overrides,
  };
}

function makeRequest(overrides: Partial<HttpRequest> = {}): HttpRequest {
  return {
    url: '/old',
    method: 'GET',
    domain: 'example.com',
    ip: '1.2.3.4',
    client_ip: '1.2.3.4',
    is_authenticated: false,
    ...overrides,
  };
}

describe('findRedirect', () => {
  it('returns first matching redirect', () => {
    const candidates = [
      makeCandidate({ id: '1', source_url: '/other', target_url: '/a' }),
      makeCandidate({ id: '2', source_url: '/old', target_url: '/b' }),
    ];
    const result = findRedirect(candidates, makeRequest());
    expect(result).not.toBeNull();
    expect(result!.redirect.id).toBe('2');
    expect(result!.target).toBe('/b');
  });

  it('returns null when no candidates match', () => {
    const candidates = [makeCandidate({ source_url: '/nope' })];
    const result = findRedirect(candidates, makeRequest());
    expect(result).toBeNull();
  });

  it('skips redirects with no resolved target', () => {
    const candidates = [
      makeCandidate({
        id: '1',
        source_url: '/old',
        match_type: 'ip',
        match_value: '9.9.9.9',
        target_url: '/matched',
        alternate_target_url: undefined,
      }),
      makeCandidate({
        id: '2',
        source_url: '/old',
        target_url: '/fallback',
      }),
    ];
    const result = findRedirect(candidates, makeRequest({ client_ip: '1.2.3.4' }));
    expect(result).not.toBeNull();
    expect(result!.redirect.id).toBe('2');
  });

  it('respects priority ordering (group_position then position)', () => {
    const candidates = [
      makeCandidate({ id: '1', group_position: 1, position: 0, source_url: '/old', target_url: '/second' }),
      makeCandidate({ id: '2', group_position: 0, position: 0, source_url: '/old', target_url: '/first' }),
    ];
    // Sort as findRedirect expects sorted input
    candidates.sort((a, b) => a.group_position - b.group_position || a.position - b.position);
    const result = findRedirect(candidates, makeRequest());
    expect(result!.redirect.id).toBe('2');
    expect(result!.target).toBe('/first');
  });
});
