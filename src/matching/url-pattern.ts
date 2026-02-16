import type { Redirect } from '../types/entities.js';
import type { UrlMatchResult } from '../types/results.js';
import { regexMatch } from './helpers/regex.js';

export function extractPath(url: string): string {
  const qIdx = url.indexOf('?');
  return qIdx === -1 ? url : url.slice(0, qIdx);
}

export function extractQuery(url: string): string | null {
  const qIdx = url.indexOf('?');
  return qIdx === -1 ? null : url.slice(qIdx + 1);
}

export function normalizePath(
  path: string,
  caseInsensitive: boolean,
  ignoreTrailingSlash: boolean,
): string {
  let normalized = path;
  if (caseInsensitive) {
    normalized = normalized.toLowerCase();
  }
  if (ignoreTrailingSlash && normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function queryMatches(
  sourceQuery: string | null,
  requestQuery: string | null,
  queryHandling: string,
): boolean {
  switch (queryHandling) {
    case 'ignore':
    case 'pass':
      return true;
    case 'exact': {
      if (!sourceQuery && !requestQuery) return true;
      if (!sourceQuery || !requestQuery) return sourceQuery === requestQuery;
      const sortParams = (q: string) =>
        q
          .split('&')
          .sort()
          .join('&');
      return sortParams(sourceQuery) === sortParams(requestQuery);
    }
    case 'exact_order':
      return (sourceQuery ?? '') === (requestQuery ?? '');
    default:
      return true;
  }
}

export function evaluateUrlPattern(redirect: Redirect, requestUrl: string): UrlMatchResult {
  if (redirect.source_flags.is_regex) {
    return regexMatch(
      redirect.source_url,
      requestUrl,
      redirect.source_flags.case_insensitive,
    );
  }

  const sourcePath = extractPath(redirect.source_url);
  const requestPath = extractPath(requestUrl);
  const { case_insensitive, ignore_trailing_slash, query_handling } = redirect.source_flags;

  const normSource = normalizePath(sourcePath, case_insensitive, ignore_trailing_slash);
  const normRequest = normalizePath(requestPath, case_insensitive, ignore_trailing_slash);

  if (normSource !== normRequest) {
    return { matched: false, captured_groups: [] };
  }

  const sourceQuery = extractQuery(redirect.source_url);
  const requestQuery = extractQuery(requestUrl);

  if (!queryMatches(sourceQuery, requestQuery, query_handling)) {
    return { matched: false, captured_groups: [] };
  }

  return { matched: true, captured_groups: [] };
}
