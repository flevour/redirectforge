import { describe, it, expect, beforeEach } from 'vitest';
import { createGroup, enableGroup, disableGroup, deleteGroup } from './group-ops.js';
import { createTenant } from './tenant-ops.js';
import { createRedirect } from './redirect-ops.js';
import { createMemoryStorage } from '../memory/memory-storage-adapter.js';
import type { StorageAdapter } from '../repositories/index.js';

let storage: StorageAdapter;

beforeEach(() => {
  storage = createMemoryStorage();
});

describe('createGroup', () => {
  it('creates group with auto position', async () => {
    const t = await createTenant(storage, 'T');
    const g1 = await createGroup(storage, t.id, 'First');
    const g2 = await createGroup(storage, t.id, 'Second');
    expect(g1.position).toBe(0);
    expect(g2.position).toBe(1);
  });
});

describe('disableGroup', () => {
  it('cascades status to redirects', async () => {
    const t = await createTenant(storage, 'T');
    const g = await createGroup(storage, t.id, 'G');
    const r = await createRedirect(storage, {
      group_id: g.id,
      source_url: '/a',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact', is_regex: false },
      match_type: 'url', action_type: 'redirect', action_code: 301,
    });

    await disableGroup(storage, g.id);
    const updated = await storage.redirects.findById(r.id);
    expect(updated!.status).toBe('disabled');
  });
});

describe('enableGroup', () => {
  it('cascades status to redirects', async () => {
    const t = await createTenant(storage, 'T');
    const g = await createGroup(storage, t.id, 'G');
    await createRedirect(storage, {
      group_id: g.id,
      source_url: '/a',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact', is_regex: false },
      match_type: 'url', action_type: 'redirect', action_code: 301,
    });

    await disableGroup(storage, g.id);
    await enableGroup(storage, g.id);

    const redirects = await storage.redirects.findByGroupId(g.id);
    expect(redirects[0].status).toBe('enabled');
  });
});

describe('deleteGroup', () => {
  it('cascade deletes all redirects', async () => {
    const t = await createTenant(storage, 'T');
    const g = await createGroup(storage, t.id, 'G');
    await createRedirect(storage, {
      group_id: g.id,
      source_url: '/a',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact', is_regex: false },
      match_type: 'url', action_type: 'redirect', action_code: 301,
    });

    await deleteGroup(storage, g.id);
    expect(await storage.groups.findById(g.id)).toBeUndefined();
    expect(await storage.redirects.findByGroupId(g.id)).toEqual([]);
  });
});
