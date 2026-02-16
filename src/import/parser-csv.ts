import type { ParseResult, ImportRecord, ParseError } from './types.js';

// CSV columns: source_url, target_url, action_type, action_code, match_type, title
// Minimal hand-written CSV parser (no dependencies)

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

export function parseCsv(source: string): ParseResult {
  const records: ImportRecord[] = [];
  const errors: ParseError[] = [];

  const lines = source.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { records: [], errors: [] };
  }

  // First line is header
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const colIdx = (name: string) => header.indexOf(name);

  const srcIdx = colIdx('source_url');
  const tgtIdx = colIdx('target_url');
  const actionTypeIdx = colIdx('action_type');
  const actionCodeIdx = colIdx('action_code');
  const matchTypeIdx = colIdx('match_type');
  const titleIdx = colIdx('title');

  if (srcIdx === -1) {
    return { records: [], errors: [{ row: 0, message: 'Missing source_url column in header' }] };
  }

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const sourceUrl = fields[srcIdx];

    if (!sourceUrl) {
      errors.push({ row: i, message: 'Empty source_url' });
      continue;
    }

    records.push({
      source_url: sourceUrl,
      source_flags: {
        case_insensitive: false,
        ignore_trailing_slash: false,
        query_handling: 'exact',
        is_regex: false,
      },
      match_type: (fields[matchTypeIdx] as ImportRecord['match_type']) || 'url',
      match_is_regex: false,
      target_url: tgtIdx !== -1 ? fields[tgtIdx] || undefined : undefined,
      action_type: (fields[actionTypeIdx] as ImportRecord['action_type']) || 'redirect',
      action_code: actionCodeIdx !== -1 ? parseInt(fields[actionCodeIdx], 10) || 301 : 301,
      random_targets: [],
      title: titleIdx !== -1 ? fields[titleIdx] || undefined : undefined,
    });
  }

  return { records, errors };
}
