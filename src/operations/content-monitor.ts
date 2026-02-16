import type { StorageAdapter } from '../repositories/index.js';
import type { RedirectForgeConfig, ContentItem, Redirect } from '../types/index.js';

export async function handleContentUrlChange(
  storage: StorageAdapter,
  config: RedirectForgeConfig,
  tenantId: string,
  targetGroupId: string,
  item: ContentItem,
): Promise<Redirect | null> {
  if (!item.previous_url) return null;
  if (item.previous_url === item.current_url) return null;
  if (!config.monitor_content_types.has(item.content_type)) return null;

  const position = await storage.redirects.countByGroupId(targetGroupId);
  return storage.redirects.create({
    group_id: targetGroupId,
    position,
    source_url: item.previous_url,
    source_flags: {
      case_insensitive: false,
      ignore_trailing_slash: false,
      query_handling: 'exact',
      is_regex: false,
    },
    match_type: 'url',
    match_value: undefined,
    match_is_regex: false,
    target_url: item.current_url,
    alternate_target_url: undefined,
    action_type: 'redirect',
    action_code: 301,
    random_targets: [],
    title: undefined,
    status: 'enabled',
    hit_count: 0,
    log_excluded: false,
  });
}
