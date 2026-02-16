import { describe, it, expect } from 'vitest';
import { safeRegex, regexMatch, regexTest, regexSubstitute } from './regex.js';

describe('safeRegex', () => {
  it('returns a RegExp for valid patterns', () => {
    expect(safeRegex('^/foo$')).toBeInstanceOf(RegExp);
  });

  it('returns null for invalid patterns', () => {
    expect(safeRegex('[invalid')).toBeNull();
  });
});

describe('regexMatch', () => {
  it('matches and captures groups', () => {
    const result = regexMatch('^/posts/(\\d+)$', '/posts/123', false);
    expect(result.matched).toBe(true);
    expect(result.captured_groups).toEqual(['123']);
  });

  it('returns no match for non-matching input', () => {
    const result = regexMatch('^/posts/(\\d+)$', '/other/path', false);
    expect(result.matched).toBe(false);
  });

  it('respects case insensitive flag', () => {
    expect(regexMatch('^/Foo$', '/foo', false).matched).toBe(false);
    expect(regexMatch('^/Foo$', '/foo', true).matched).toBe(true);
  });

  it('handles invalid regex gracefully', () => {
    const result = regexMatch('[bad', '/anything', false);
    expect(result.matched).toBe(false);
  });
});

describe('regexTest', () => {
  it('returns true for matching pattern', () => {
    expect(regexTest('chrome', 'Mozilla/5.0 Chrome/91')).toBe(true);
  });

  it('returns false for non-matching', () => {
    expect(regexTest('firefox', 'Mozilla/5.0 Chrome/91')).toBe(false);
  });

  it('handles invalid regex', () => {
    expect(regexTest('[bad', 'anything')).toBe(false);
  });
});

describe('regexSubstitute', () => {
  it('replaces $1, $2 with captured groups', () => {
    expect(regexSubstitute('/new/$1/$2', ['foo', 'bar'])).toBe('/new/foo/bar');
  });

  it('replaces missing groups with empty string', () => {
    expect(regexSubstitute('/new/$1/$3', ['foo'])).toBe('/new/foo/');
  });

  it('leaves text without placeholders unchanged', () => {
    expect(regexSubstitute('/static/path', ['foo'])).toBe('/static/path');
  });
});
