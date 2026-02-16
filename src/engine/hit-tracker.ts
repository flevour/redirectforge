import type { StorageAdapter } from '../repositories/index.js';
import type { RedirectForgeConfig, Redirect } from '../types/index.js';

export async function trackHit(
  storage: StorageAdapter,
  config: RedirectForgeConfig,
  redirect: Redirect,
): Promise<void> {
  if (!config.track_hits) return;
  await storage.redirects.incrementHitCount(redirect.id, new Date());
}
