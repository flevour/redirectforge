import type { Redirect } from '../types/entities.js';
import type { ConditionEvaluation, UrlMatchResult } from '../types/results.js';
import { MatchType } from '../types/enums.js';
import { regexSubstitute } from './helpers/regex.js';
import { extractQuery } from './url-pattern.js';

export function applyQueryHandling(
  targetUrl: string,
  requestUrl: string,
  queryHandling: string,
): string {
  switch (queryHandling) {
    case 'ignore': {
      const qIdx = targetUrl.indexOf('?');
      return qIdx === -1 ? targetUrl : targetUrl.slice(0, qIdx);
    }
    case 'pass': {
      const requestQuery = extractQuery(requestUrl);
      if (!requestQuery) return targetUrl;
      const separator = targetUrl.includes('?') ? '&' : '?';
      return targetUrl + separator + requestQuery;
    }
    case 'exact':
    case 'exact_order':
    default:
      return targetUrl;
  }
}

function selectRawTarget(
  redirect: Redirect,
  condition: ConditionEvaluation,
): string | null {
  if (redirect.match_type === MatchType.url) {
    return redirect.target_url ?? null;
  }

  // login_status and all conditional match types follow the same pattern:
  // matched → target_url, not matched → alternate_target_url
  if (condition.matched) {
    return redirect.target_url ?? null;
  }
  return redirect.alternate_target_url ?? null;
}

export function resolveTarget(
  redirect: Redirect,
  requestUrl: string,
  urlResult: UrlMatchResult,
  condition: ConditionEvaluation,
): string | null {
  const rawTarget = selectRawTarget(redirect, condition);
  if (rawTarget === null) return null;

  let substituted = rawTarget;
  if (redirect.source_flags.is_regex) {
    substituted = regexSubstitute(rawTarget, urlResult.captured_groups);
  }

  return applyQueryHandling(
    substituted,
    requestUrl,
    redirect.source_flags.query_handling,
  );
}
