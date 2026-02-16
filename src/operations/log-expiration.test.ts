import { describe, it, expect, beforeEach } from 'vitest';
import { expireLogs } from './log-expiration.js';
import { createMemoryStorage } from '../memory/memory-storage-adapter.js';
import { DEFAULT_CONFIG } from '../types/config.js';
import type { StorageAdapter } from '../repositories/index.js';
import type { RedirectForgeConfig } from '../types/index.js';

let storage: StorageAdapter;
let config: RedirectForgeConfig;

beforeEach(() => {
  storage = createMemoryStorage();
  config = { ...DEFAULT_CONFIG };
});

describe('expireLogs', () => {
  it('does nothing when retention is 0', async () => {
    await storage.redirectLogs.create({
      tenant_id: 't1', created_at: new Date('2020-01-01'), source_url: '/a', http_code: 301,
    });
    const result = await expireLogs(storage, config);
    expect(result.redirect_logs.deleted).toBe(0);
  });

  it('deletes expired redirect logs in batches', async () => {
    config.redirect_log_retention_days = 30;
    config.log_cleanup_batch_size = 1;

    const old = new Date();
    old.setDate(old.getDate() - 60);

    await storage.redirectLogs.create({ tenant_id: 't1', created_at: old, source_url: '/a', http_code: 301 });
    await storage.redirectLogs.create({ tenant_id: 't1', created_at: old, source_url: '/b', http_code: 301 });

    const result = await expireLogs(storage, config);
    expect(result.redirect_logs.deleted).toBe(1);
    expect(result.redirect_logs.hasMore).toBe(true);
  });

  it('uses aggressive batch size when threshold exceeded', async () => {
    config.redirect_log_retention_days = 30;
    config.aggressive_cleanup_threshold = 1;
    config.aggressive_cleanup_batch_size = 100;
    config.log_cleanup_batch_size = 1;

    const old = new Date();
    old.setDate(old.getDate() - 60);

    await storage.redirectLogs.create({ tenant_id: 't1', created_at: old, source_url: '/a', http_code: 301 });
    await storage.redirectLogs.create({ tenant_id: 't1', created_at: old, source_url: '/b', http_code: 301 });

    const result = await expireLogs(storage, config);
    expect(result.redirect_logs.deleted).toBe(2);
    expect(result.redirect_logs.hasMore).toBe(false);
  });

  it('deletes expired not-found logs', async () => {
    config.not_found_log_retention_days = 7;

    const old = new Date();
    old.setDate(old.getDate() - 30);

    await storage.notFoundLogs.create({ tenant_id: 't1', created_at: old, url: '/missing' });

    const result = await expireLogs(storage, config);
    expect(result.not_found_logs.deleted).toBe(1);
  });
});
