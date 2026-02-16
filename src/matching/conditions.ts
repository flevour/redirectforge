import type { Redirect } from '../types/entities.js';
import type { HttpRequest } from '../types/external.js';
import type { ConditionEvaluation } from '../types/results.js';
import { MatchType } from '../types/enums.js';
import { regexTest } from './helpers/regex.js';
import { parseIpList, ipInList } from './helpers/ip.js';
import { localeMatches } from './helpers/locale.js';
import { parseHeaderSpec } from './helpers/header-spec.js';

function containsInsensitive(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function evaluateIp(redirect: Redirect, request: HttpRequest): boolean {
  const ipList = parseIpList(redirect.match_value);
  return ipInList(request.client_ip, ipList);
}

function evaluateUserAgent(redirect: Redirect, request: HttpRequest): boolean {
  const ua = request.user_agent ?? '';
  if (redirect.match_is_regex) {
    return regexTest(redirect.match_value ?? '', ua);
  }
  return containsInsensitive(ua, redirect.match_value ?? '');
}

function evaluateReferrer(redirect: Redirect, request: HttpRequest): boolean {
  const ref = request.referrer ?? '';
  if (redirect.match_is_regex) {
    return regexTest(redirect.match_value ?? '', ref);
  }
  return containsInsensitive(ref, redirect.match_value ?? '');
}

function evaluateLoginStatus(_redirect: Redirect, request: HttpRequest): boolean {
  return request.is_authenticated;
}

function evaluateHeader(redirect: Redirect, request: HttpRequest): boolean {
  const spec = parseHeaderSpec(redirect.match_value);
  const actual = request.headers?.[spec.name.toLowerCase()] ?? request.headers?.[spec.name];
  if (redirect.match_is_regex) {
    return regexTest(spec.value, actual ?? '');
  }
  return actual === spec.value;
}

function evaluateCookie(redirect: Redirect, request: HttpRequest): boolean {
  const spec = parseHeaderSpec(redirect.match_value);
  const actual = request.cookies?.[spec.name];
  if (redirect.match_is_regex) {
    return regexTest(spec.value, actual ?? '');
  }
  return actual === spec.value;
}

function evaluateRole(redirect: Redirect, request: HttpRequest): boolean {
  return request.is_authenticated && request.user_role === redirect.match_value;
}

function evaluateServerVariable(redirect: Redirect, request: HttpRequest): boolean {
  const spec = parseHeaderSpec(redirect.match_value);
  const actual = request.server_variables?.[spec.name];
  return actual === spec.value;
}

function evaluateLanguage(redirect: Redirect, request: HttpRequest): boolean {
  return localeMatches(request.accept_language, redirect.match_value ?? '');
}

export function evaluateCondition(redirect: Redirect, request: HttpRequest): ConditionEvaluation {
  switch (redirect.match_type) {
    case MatchType.url:
      return { checked: false, matched: true };
    case MatchType.ip:
      return { checked: true, matched: evaluateIp(redirect, request) };
    case MatchType.user_agent:
      return { checked: true, matched: evaluateUserAgent(redirect, request) };
    case MatchType.referrer:
      return { checked: true, matched: evaluateReferrer(redirect, request) };
    case MatchType.login_status:
      return { checked: true, matched: evaluateLoginStatus(redirect, request) };
    case MatchType.header:
      return { checked: true, matched: evaluateHeader(redirect, request) };
    case MatchType.cookie:
      return { checked: true, matched: evaluateCookie(redirect, request) };
    case MatchType.role:
      return { checked: true, matched: evaluateRole(redirect, request) };
    case MatchType.server_variable:
      return { checked: true, matched: evaluateServerVariable(redirect, request) };
    case MatchType.language:
      return { checked: true, matched: evaluateLanguage(redirect, request) };
    default:
      return { checked: false, matched: true };
  }
}
