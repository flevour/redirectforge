import type { SourceFlags, MatchType, ActionType } from '../types/index.js';

export const ImportFormat = {
  json: 'json',
  csv: 'csv',
} as const;
export type ImportFormat = (typeof ImportFormat)[keyof typeof ImportFormat];

export interface ImportRecord {
  source_url: string;
  source_flags: SourceFlags;
  match_type: MatchType;
  match_value?: string;
  match_is_regex: boolean;
  target_url?: string;
  alternate_target_url?: string;
  action_type: ActionType;
  action_code: number;
  random_targets: string[];
  title?: string;
}

export interface ParseError {
  row: number;
  message: string;
}

export interface ParseResult {
  records: ImportRecord[];
  errors: ParseError[];
}

export interface ImportResult {
  created: number;
  errors: ParseError[];
}
