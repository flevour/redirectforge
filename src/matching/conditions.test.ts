import { describe, it, expect } from 'vitest';
import { evaluateCondition } from './conditions.js';
import type { Redirect } from '../types/entities.js';
import type { HttpRequest } from '../types/external.js';

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

describe('evaluateCondition', () => {
  it('url type: not checked, always matched', () => {
    const result = evaluateCondition(
      makeRedirect({ match_type: 'url' }),
      makeRequest(),
    );
    expect(result).toEqual({ checked: false, matched: true });
  });

  it('ip type: matches when client_ip in list', () => {
    const result = evaluateCondition(
      makeRedirect({ match_type: 'ip', match_value: '1.2.3.4, 5.6.7.8' }),
      makeRequest({ client_ip: '1.2.3.4' }),
    );
    expect(result).toEqual({ checked: true, matched: true });
  });

  it('ip type: no match when IP not in list', () => {
    const result = evaluateCondition(
      makeRedirect({ match_type: 'ip', match_value: '5.6.7.8' }),
      makeRequest({ client_ip: '1.2.3.4' }),
    );
    expect(result).toEqual({ checked: true, matched: false });
  });

  it('user_agent: substring match', () => {
    const result = evaluateCondition(
      makeRedirect({ match_type: 'user_agent', match_value: 'Chrome' }),
      makeRequest({ user_agent: 'Mozilla/5.0 Chrome/91' }),
    );
    expect(result).toEqual({ checked: true, matched: true });
  });

  it('user_agent: regex match', () => {
    const result = evaluateCondition(
      makeRedirect({ match_type: 'user_agent', match_value: 'Chrome/\\d+', match_is_regex: true }),
      makeRequest({ user_agent: 'Mozilla/5.0 Chrome/91' }),
    );
    expect(result).toEqual({ checked: true, matched: true });
  });

  it('login_status: returns is_authenticated', () => {
    expect(
      evaluateCondition(
        makeRedirect({ match_type: 'login_status' }),
        makeRequest({ is_authenticated: true }),
      ),
    ).toEqual({ checked: true, matched: true });

    expect(
      evaluateCondition(
        makeRedirect({ match_type: 'login_status' }),
        makeRequest({ is_authenticated: false }),
      ),
    ).toEqual({ checked: true, matched: false });
  });

  it('header: exact match', () => {
    const result = evaluateCondition(
      makeRedirect({ match_type: 'header', match_value: 'x-custom:foo' }),
      makeRequest({ headers: { 'x-custom': 'foo' } }),
    );
    expect(result).toEqual({ checked: true, matched: true });
  });

  it('cookie: exact match', () => {
    const result = evaluateCondition(
      makeRedirect({ match_type: 'cookie', match_value: 'session:abc' }),
      makeRequest({ cookies: { session: 'abc' } }),
    );
    expect(result).toEqual({ checked: true, matched: true });
  });

  it('role: matches authenticated user with correct role', () => {
    const result = evaluateCondition(
      makeRedirect({ match_type: 'role', match_value: 'admin' }),
      makeRequest({ is_authenticated: true, user_role: 'admin' }),
    );
    expect(result).toEqual({ checked: true, matched: true });
  });

  it('role: fails when not authenticated', () => {
    const result = evaluateCondition(
      makeRedirect({ match_type: 'role', match_value: 'admin' }),
      makeRequest({ is_authenticated: false, user_role: 'admin' }),
    );
    expect(result).toEqual({ checked: true, matched: false });
  });

  it('server_variable: exact match', () => {
    const result = evaluateCondition(
      makeRedirect({ match_type: 'server_variable', match_value: 'HTTPS:on' }),
      makeRequest({ server_variables: { HTTPS: 'on' } }),
    );
    expect(result).toEqual({ checked: true, matched: true });
  });

  it('language: locale prefix match', () => {
    const result = evaluateCondition(
      makeRedirect({ match_type: 'language', match_value: 'en' }),
      makeRequest({ accept_language: 'en-US,en;q=0.9' }),
    );
    expect(result).toEqual({ checked: true, matched: true });
  });
});
