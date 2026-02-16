import type { StorageAdapter } from '../repositories/index.js';
import type { ImportFormat, ImportResult } from './types.js';
import { parseJson } from './parser-json.js';
import { parseCsv } from './parser-csv.js';

export async function importRedirects(
  storage: StorageAdapter,
  sourceData: string,
  format: ImportFormat,
  targetGroupId: string,
): Promise<ImportResult> {
  const parseResult = format === 'json' ? parseJson(sourceData) : parseCsv(sourceData);

  if (parseResult.records.length === 0) {
    return { created: 0, errors: parseResult.errors };
  }

  const existingCount = await storage.redirects.countByGroupId(targetGroupId);

  const createData = parseResult.records.map((record, i) => ({
    group_id: targetGroupId,
    position: existingCount + i,
    source_url: record.source_url,
    source_flags: record.source_flags,
    match_type: record.match_type,
    match_value: record.match_value,
    match_is_regex: record.match_is_regex,
    target_url: record.target_url,
    alternate_target_url: record.alternate_target_url,
    action_type: record.action_type,
    action_code: record.action_code,
    random_targets: record.random_targets,
    title: record.title,
    status: 'enabled' as const,
    hit_count: 0,
    log_excluded: false,
  }));

  await storage.redirects.createMany(createData);

  return {
    created: parseResult.records.length,
    errors: parseResult.errors,
  };
}
