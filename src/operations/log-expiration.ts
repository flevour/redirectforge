import type { StorageAdapter } from '../repositories/index.js';
import type { RedirectForgeConfig } from '../types/index.js';

export interface ExpirationResult {
  redirect_logs: { deleted: number; hasMore: boolean };
  not_found_logs: { deleted: number; hasMore: boolean };
}

export async function expireLogs(
  storage: StorageAdapter,
  config: RedirectForgeConfig,
): Promise<ExpirationResult> {
  const result: ExpirationResult = {
    redirect_logs: { deleted: 0, hasMore: false },
    not_found_logs: { deleted: 0, hasMore: false },
  };

  if (config.redirect_log_retention_days > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - config.redirect_log_retention_days);

    const count = await storage.redirectLogs.countExpired(cutoff);
    if (count > 0) {
      const batchSize = count > config.aggressive_cleanup_threshold
        ? config.aggressive_cleanup_batch_size
        : config.log_cleanup_batch_size;

      result.redirect_logs = await storage.redirectLogs.deleteExpiredBatch(cutoff, batchSize);
    }
  }

  if (config.not_found_log_retention_days > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - config.not_found_log_retention_days);

    const count = await storage.notFoundLogs.countExpired(cutoff);
    if (count > 0) {
      const batchSize = count > config.aggressive_cleanup_threshold
        ? config.aggressive_cleanup_batch_size
        : config.log_cleanup_batch_size;

      result.not_found_logs = await storage.notFoundLogs.deleteExpiredBatch(cutoff, batchSize);
    }
  }

  return result;
}
