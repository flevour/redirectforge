import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRedirect,
  updateRedirect,
  enableRedirect,
  disableRedirect,
  deleteRedirect,
  resetRedirectHits,
} from './redirect-ops.js';
import { createTenant } from './tenant-ops.js';
import { createGroup } from './group-ops.js';
import { createMemoryStorage } from '../memory/memory-storage-adapter.js';
import type { StorageAdapter } from '../repositories/index.js';

let storage: StorageAdapter;
let groupId: string;

beforeEach(async () => {
  storage = createMemoryStorage();
  const t = await createTenant(storage, 'T');
  const g = await createGroup(storage, t.id, 'G');
  groupId = g.id;
});

const defaultInput = {
  source_url: '/old',
  source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact' as const, is_regex: false },
  match_type: 'url' as const,
  action_type: 'redirect' as const,
  action_code: 301,
  target_url: '/new',
};

describe('createRedirect', () => {
  it('creates with defaults', async () => {
    const r = await createRedirect(storage, { group_id: groupId, ...defaultInput });
    expect(r.status).toBe('enabled');
    expect(r.hit_count).toBe(0);
    expect(r.log_excluded).toBe(false);
    expect(r.match_is_regex).toBe(false);
    expect(r.position).toBe(0);
  });

  it('auto-increments position', async () => {
    await createRedirect(storage, { group_id: groupId, ...defaultInput });
    const r2 = await createRedirect(storage, { group_id: groupId, ...defaultInput, source_url: '/b' });
    expect(r2.position).toBe(1);
  });
});

describe('updateRedirect', () => {
  it('updates specified fields only', async () => {
    const r = await createRedirect(storage, { group_id: groupId, ...defaultInput });
    const updated = await updateRedirect(storage, r.id, { source_url: '/updated' });
    expect(updated.source_url).toBe('/updated');
    expect(updated.action_code).toBe(301);
  });
});

describe('enableRedirect / disableRedirect', () => {
  it('toggles status', async () => {
    const r = await createRedirect(storage, { group_id: groupId, ...defaultInput });
    const disabled = await disableRedirect(storage, r.id);
    expect(disabled.status).toBe('disabled');
    const enabled = await enableRedirect(storage, r.id);
    expect(enabled.status).toBe('enabled');
  });
});

describe('deleteRedirect', () => {
  it('deletes the redirect', async () => {
    const r = await createRedirect(storage, { group_id: groupId, ...defaultInput });
    await deleteRedirect(storage, r.id);
    expect(await storage.redirects.findById(r.id)).toBeUndefined();
  });
});

describe('resetRedirectHits', () => {
  it('resets hit count and last_hit_at', async () => {
    const r = await createRedirect(storage, { group_id: groupId, ...defaultInput });
    await storage.redirects.incrementHitCount(r.id, new Date());
    await resetRedirectHits(storage, r.id);
    const updated = await storage.redirects.findById(r.id);
    expect(updated!.hit_count).toBe(0);
    expect(updated!.last_hit_at).toBeUndefined();
  });
});
