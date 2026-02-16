import { describe, it, expect, beforeEach } from 'vitest';
import { handleContentUrlChange } from './content-monitor.js';
import { createTenant } from './tenant-ops.js';
import { createGroup } from './group-ops.js';
import { createMemoryStorage } from '../memory/memory-storage-adapter.js';
import { DEFAULT_CONFIG } from '../types/config.js';
import type { StorageAdapter } from '../repositories/index.js';
import type { RedirectForgeConfig } from '../types/index.js';

let storage: StorageAdapter;
let config: RedirectForgeConfig;
let groupId: string;
let tenantId: string;

beforeEach(async () => {
  storage = createMemoryStorage();
  config = { ...DEFAULT_CONFIG, monitor_content_types: new Set(['post', 'page']) };
  const t = await createTenant(storage, 'T');
  tenantId = t.id;
  const g = await createGroup(storage, tenantId, 'G');
  groupId = g.id;
});

describe('handleContentUrlChange', () => {
  it('creates 301 redirect when URL changes', async () => {
    const result = await handleContentUrlChange(storage, config, tenantId, groupId, {
      content_type: 'post',
      current_url: '/new-slug',
      previous_url: '/old-slug',
    });
    expect(result).not.toBeNull();
    expect(result!.source_url).toBe('/old-slug');
    expect(result!.target_url).toBe('/new-slug');
    expect(result!.action_code).toBe(301);
  });

  it('returns null when content_type not monitored', async () => {
    const result = await handleContentUrlChange(storage, config, tenantId, groupId, {
      content_type: 'attachment',
      current_url: '/new',
      previous_url: '/old',
    });
    expect(result).toBeNull();
  });

  it('returns null when no previous_url', async () => {
    const result = await handleContentUrlChange(storage, config, tenantId, groupId, {
      content_type: 'post',
      current_url: '/new',
    });
    expect(result).toBeNull();
  });

  it('returns null when URLs are same', async () => {
    const result = await handleContentUrlChange(storage, config, tenantId, groupId, {
      content_type: 'post',
      current_url: '/same',
      previous_url: '/same',
    });
    expect(result).toBeNull();
  });
});
