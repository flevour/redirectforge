import { describe, it, expect } from 'vitest';
import { evaluateUrlPattern, extractPath, extractQuery, normalizePath } from './url-pattern.js';
import type { Redirect } from '../types/entities.js';

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
    action_type: 'redirect',
    action_code: 301,
    random_targets: [],
    hit_count: 0,
    log_excluded: false,
    ...overrides,
  };
}

describe('extractPath', () => {
  it('returns path without query', () => {
    expect(extractPath('/foo?bar=1')).toBe('/foo');
  });
  it('returns full string when no query', () => {
    expect(extractPath('/foo')).toBe('/foo');
  });
});

describe('extractQuery', () => {
  it('returns query string', () => {
    expect(extractQuery('/foo?bar=1')).toBe('bar=1');
  });
  it('returns null when no query', () => {
    expect(extractQuery('/foo')).toBeNull();
  });
});

describe('normalizePath', () => {
  it('lowercases when case insensitive', () => {
    expect(normalizePath('/Foo', true, false)).toBe('/foo');
  });
  it('strips trailing slash when flag set', () => {
    expect(normalizePath('/foo/', false, true)).toBe('/foo');
  });
  it('preserves root slash', () => {
    expect(normalizePath('/', false, true)).toBe('/');
  });
});

describe('evaluateUrlPattern', () => {
  it('matches exact path', () => {
    const r = makeRedirect({ source_url: '/old' });
    expect(evaluateUrlPattern(r, '/old').matched).toBe(true);
  });

  it('does not match different paths', () => {
    const r = makeRedirect({ source_url: '/old' });
    expect(evaluateUrlPattern(r, '/new').matched).toBe(false);
  });

  it('handles case insensitive matching', () => {
    const r = makeRedirect({
      source_url: '/Old',
      source_flags: {
        case_insensitive: true,
        ignore_trailing_slash: false,
        query_handling: 'exact',
        is_regex: false,
      },
    });
    expect(evaluateUrlPattern(r, '/old').matched).toBe(true);
  });

  it('handles ignore trailing slash', () => {
    const r = makeRedirect({
      source_url: '/old/',
      source_flags: {
        case_insensitive: false,
        ignore_trailing_slash: true,
        query_handling: 'exact',
        is_regex: false,
      },
    });
    expect(evaluateUrlPattern(r, '/old').matched).toBe(true);
  });

  it('ignores query when query_handling=ignore', () => {
    const r = makeRedirect({
      source_url: '/old',
      source_flags: {
        case_insensitive: false,
        ignore_trailing_slash: false,
        query_handling: 'ignore',
        is_regex: false,
      },
    });
    expect(evaluateUrlPattern(r, '/old?foo=bar').matched).toBe(true);
  });

  it('exact query matching requires sorted equality', () => {
    const r = makeRedirect({
      source_url: '/old?b=2&a=1',
      source_flags: {
        case_insensitive: false,
        ignore_trailing_slash: false,
        query_handling: 'exact',
        is_regex: false,
      },
    });
    expect(evaluateUrlPattern(r, '/old?a=1&b=2').matched).toBe(true);
    expect(evaluateUrlPattern(r, '/old?a=1&c=3').matched).toBe(false);
  });

  it('exact_order requires same query string order', () => {
    const r = makeRedirect({
      source_url: '/old?a=1&b=2',
      source_flags: {
        case_insensitive: false,
        ignore_trailing_slash: false,
        query_handling: 'exact_order',
        is_regex: false,
      },
    });
    expect(evaluateUrlPattern(r, '/old?a=1&b=2').matched).toBe(true);
    expect(evaluateUrlPattern(r, '/old?b=2&a=1').matched).toBe(false);
  });

  it('regex matching with capture groups', () => {
    const r = makeRedirect({
      source_url: '^/posts/(\\d+)$',
      source_flags: {
        case_insensitive: false,
        ignore_trailing_slash: false,
        query_handling: 'exact',
        is_regex: true,
      },
    });
    const result = evaluateUrlPattern(r, '/posts/42');
    expect(result.matched).toBe(true);
    expect(result.captured_groups).toEqual(['42']);
  });
});
