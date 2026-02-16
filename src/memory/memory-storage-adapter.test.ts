import { describe, it, expect, beforeEach } from 'vitest';
import { createMemoryStorage } from './memory-storage-adapter.js';
import type { StorageAdapter } from '../repositories/index.js';

let storage: StorageAdapter;

beforeEach(() => {
  storage = createMemoryStorage();
});

describe('MemoryTenantRepository', () => {
  it('creates and finds a tenant', async () => {
    const t = await storage.tenants.create({ name: 'Test', status: 'active' });
    expect(t.id).toBeDefined();
    const found = await storage.tenants.findById(t.id);
    expect(found).toEqual(t);
  });

  it('updates a tenant', async () => {
    const t = await storage.tenants.create({ name: 'Test', status: 'active' });
    const updated = await storage.tenants.update(t.id, { status: 'suspended' });
    expect(updated.status).toBe('suspended');
  });

  it('deletes a tenant', async () => {
    const t = await storage.tenants.create({ name: 'Test', status: 'active' });
    await storage.tenants.delete(t.id);
    expect(await storage.tenants.findById(t.id)).toBeUndefined();
  });
});

describe('MemoryTenantHostRepository', () => {
  it('finds by hostname', async () => {
    const t = await storage.tenants.create({ name: 'T', status: 'active' });
    await storage.tenantHosts.create({ tenant_id: t.id, hostname: 'example.com', status: 'enabled' });
    const found = await storage.tenantHosts.findByHostname('example.com');
    expect(found?.hostname).toBe('example.com');
  });

  it('returns undefined for unknown hostname', async () => {
    expect(await storage.tenantHosts.findByHostname('nope.com')).toBeUndefined();
  });
});

describe('MemoryGroupRepository', () => {
  it('returns groups sorted by position', async () => {
    const t = await storage.tenants.create({ name: 'T', status: 'active' });
    await storage.groups.create({ tenant_id: t.id, name: 'B', status: 'enabled', position: 1 });
    await storage.groups.create({ tenant_id: t.id, name: 'A', status: 'enabled', position: 0 });
    const groups = await storage.groups.findByTenantId(t.id);
    expect(groups[0].name).toBe('A');
    expect(groups[1].name).toBe('B');
  });
});

describe('MemoryRedirectRepository', () => {
  it('findActiveByTenantId returns sorted active redirects', async () => {
    const t = await storage.tenants.create({ name: 'T', status: 'active' });
    const g1 = await storage.groups.create({ tenant_id: t.id, name: 'G1', status: 'enabled', position: 1 });
    const g0 = await storage.groups.create({ tenant_id: t.id, name: 'G0', status: 'enabled', position: 0 });

    const base = {
      source_url: '/a',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact' as const, is_regex: false },
      match_type: 'url' as const,
      match_is_regex: false,
      action_type: 'redirect' as const,
      action_code: 301,
      random_targets: [],
      hit_count: 0,
      log_excluded: false,
      status: 'enabled' as const,
    };

    const r1 = await storage.redirects.create({ ...base, group_id: g1.id, position: 0, source_url: '/g1-r0' });
    const r2 = await storage.redirects.create({ ...base, group_id: g0.id, position: 1, source_url: '/g0-r1' });
    const r3 = await storage.redirects.create({ ...base, group_id: g0.id, position: 0, source_url: '/g0-r0' });

    const active = await storage.redirects.findActiveByTenantId(t.id);
    expect(active.map((r) => r.id)).toEqual([r3.id, r2.id, r1.id]);
  });

  it('excludes disabled redirects and groups', async () => {
    const t = await storage.tenants.create({ name: 'T', status: 'active' });
    const g = await storage.groups.create({ tenant_id: t.id, name: 'G', status: 'disabled', position: 0 });

    const base = {
      source_url: '/a',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact' as const, is_regex: false },
      match_type: 'url' as const,
      match_is_regex: false,
      action_type: 'redirect' as const,
      action_code: 301,
      random_targets: [],
      hit_count: 0,
      log_excluded: false,
      status: 'enabled' as const,
    };

    await storage.redirects.create({ ...base, group_id: g.id, position: 0 });
    const active = await storage.redirects.findActiveByTenantId(t.id);
    expect(active).toHaveLength(0);
  });

  it('incrementHitCount updates count and timestamp', async () => {
    const t = await storage.tenants.create({ name: 'T', status: 'active' });
    const g = await storage.groups.create({ tenant_id: t.id, name: 'G', status: 'enabled', position: 0 });
    const r = await storage.redirects.create({
      group_id: g.id, position: 0, source_url: '/a', status: 'enabled',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact', is_regex: false },
      match_type: 'url', match_is_regex: false, action_type: 'redirect', action_code: 301,
      random_targets: [], hit_count: 0, log_excluded: false,
    });

    const now = new Date();
    await storage.redirects.incrementHitCount(r.id, now);
    const updated = await storage.redirects.findById(r.id);
    expect(updated!.hit_count).toBe(1);
    expect(updated!.last_hit_at).toEqual(now);
  });
});

describe('MemoryRedirectLogRepository', () => {
  it('query filters by tenant_id', async () => {
    await storage.redirectLogs.create({ tenant_id: 't1', created_at: new Date(), source_url: '/a', http_code: 301 });
    await storage.redirectLogs.create({ tenant_id: 't2', created_at: new Date(), source_url: '/b', http_code: 301 });

    const result = await storage.redirectLogs.query({ tenant_id: 't1' });
    expect(result.total).toBe(1);
    expect(result.items[0].source_url).toBe('/a');
  });

  it('groupBy groups by field', async () => {
    const now = new Date();
    await storage.redirectLogs.create({ tenant_id: 't1', created_at: now, source_url: '/a', ip: '1.1.1.1', http_code: 301 });
    await storage.redirectLogs.create({ tenant_id: 't1', created_at: now, source_url: '/b', ip: '1.1.1.1', http_code: 301 });
    await storage.redirectLogs.create({ tenant_id: 't1', created_at: now, source_url: '/c', ip: '2.2.2.2', http_code: 301 });

    const result = await storage.redirectLogs.groupBy({ tenant_id: 't1', group_by: 'ip' });
    expect(result.total).toBe(2);
    const sorted = result.items.sort((a, b) => b.count - a.count);
    expect(sorted[0]).toEqual({ value: '1.1.1.1', count: 2 });
    expect(sorted[1]).toEqual({ value: '2.2.2.2', count: 1 });
  });

  it('deleteExpiredBatch respects batch size', async () => {
    const old = new Date('2020-01-01');
    const recent = new Date('2025-01-01');
    const cutoff = new Date('2024-01-01');

    await storage.redirectLogs.create({ tenant_id: 't1', created_at: old, source_url: '/a', http_code: 301 });
    await storage.redirectLogs.create({ tenant_id: 't1', created_at: old, source_url: '/b', http_code: 301 });
    await storage.redirectLogs.create({ tenant_id: 't1', created_at: recent, source_url: '/c', http_code: 301 });

    const result = await storage.redirectLogs.deleteExpiredBatch(cutoff, 1);
    expect(result.deleted).toBe(1);
    expect(result.hasMore).toBe(true);
  });
});
