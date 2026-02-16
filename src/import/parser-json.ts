import type { ParseResult, ImportRecord, ParseError } from './types.js';
import { MatchType, ActionType, QueryHandling } from '../types/index.js';

const VALID_MATCH_TYPES = new Set(Object.values(MatchType));
const VALID_ACTION_TYPES = new Set(Object.values(ActionType));
const VALID_QUERY_HANDLING = new Set(Object.values(QueryHandling));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateRecord(raw: any, index: number): ImportRecord | ParseError {
  if (!raw.source_url || typeof raw.source_url !== 'string') {
    return { row: index, message: 'Missing or invalid source_url' };
  }

  const matchType = raw.match_type ?? 'url';
  if (!VALID_MATCH_TYPES.has(matchType)) {
    return { row: index, message: `Invalid match_type: ${matchType}` };
  }

  const actionType = raw.action_type ?? 'redirect';
  if (!VALID_ACTION_TYPES.has(actionType)) {
    return { row: index, message: `Invalid action_type: ${actionType}` };
  }

  const queryHandling = raw.source_flags?.query_handling ?? raw.query_handling ?? 'exact';
  if (!VALID_QUERY_HANDLING.has(queryHandling)) {
    return { row: index, message: `Invalid query_handling: ${queryHandling}` };
  }

  return {
    source_url: raw.source_url,
    source_flags: {
      case_insensitive: raw.source_flags?.case_insensitive ?? raw.case_insensitive ?? false,
      ignore_trailing_slash: raw.source_flags?.ignore_trailing_slash ?? raw.ignore_trailing_slash ?? false,
      query_handling: queryHandling,
      is_regex: raw.source_flags?.is_regex ?? raw.is_regex ?? false,
    },
    match_type: matchType,
    match_value: raw.match_value,
    match_is_regex: raw.match_is_regex ?? false,
    target_url: raw.target_url,
    alternate_target_url: raw.alternate_target_url,
    action_type: actionType,
    action_code: raw.action_code ?? 301,
    random_targets: raw.random_targets ?? [],
    title: raw.title,
  };
}

export function parseJson(source: string): ParseResult {
  const records: ImportRecord[] = [];
  const errors: ParseError[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return { records: [], errors: [{ row: 0, message: 'Invalid JSON' }] };
  }

  if (!Array.isArray(parsed)) {
    return { records: [], errors: [{ row: 0, message: 'Expected JSON array' }] };
  }

  for (let i = 0; i < parsed.length; i++) {
    const result = validateRecord(parsed[i], i);
    if ('message' in result) {
      errors.push(result);
    } else {
      records.push(result);
    }
  }

  return { records, errors };
}
