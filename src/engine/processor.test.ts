import { describe, it, expect, beforeEach } from 'vitest';
import { processRequest } from './processor.js';
import { createMemoryStorage } from '../memory/memory-storage-adapter.js';
import { DEFAULT_CONFIG } from '../types/config.js';
import type { StorageAdapter } from '../repositories/index.js';
import type { RedirectForgeConfig, HttpRequest } from '../types/index.js';

let storage: StorageAdapter;
let config: RedirectForgeConfig;

function makeRequest(overrides: Partial<HttpRequest> = {}): HttpRequest {
  return {
    url: '/old',
    method: 'GET',
    domain: 'example.com',
    ip: '1.2.3.4',
    client_ip: '1.2.3.4',
    is_authenticated: false,
    ...overrides,
  };
}

async function seedTenant() {
  const tenant = await storage.tenants.create({ name: 'Test', status: 'active' });
  await storage.tenantHosts.create({ tenant_id: tenant.id, hostname: 'example.com', status: 'enabled' });
  const group = await storage.groups.create({ tenant_id: tenant.id, name: 'Default', status: 'enabled', position: 0 });
  return { tenant, group };
}

beforeEach(() => {
  storage = createMemoryStorage();
  config = { ...DEFAULT_CONFIG };
});

describe('processRequest', () => {
  it('returns pass for unknown hostname', async () => {
    const result = await processRequest(storage, config, makeRequest());
    expect(result.action.type).toBe('pass');
  });

  it('returns pass for disabled host', async () => {
    const tenant = await storage.tenants.create({ name: 'T', status: 'active' });
    await storage.tenantHosts.create({ tenant_id: tenant.id, hostname: 'example.com', status: 'disabled' });
    const result = await processRequest(storage, config, makeRequest());
    expect(result.action.type).toBe('pass');
  });

  it('returns pass for suspended tenant', async () => {
    const tenant = await storage.tenants.create({ name: 'T', status: 'suspended' });
    await storage.tenantHosts.create({ tenant_id: tenant.id, hostname: 'example.com', status: 'enabled' });
    const result = await processRequest(storage, config, makeRequest());
    expect(result.action.type).toBe('pass');
  });

  it('returns redirect when match found', async () => {
    const { group } = await seedTenant();
    await storage.redirects.create({
      group_id: group.id, position: 0, source_url: '/old', status: 'enabled',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact', is_regex: false },
      match_type: 'url', match_is_regex: false, target_url: '/new',
      action_type: 'redirect', action_code: 301, random_targets: [], hit_count: 0, log_excluded: false,
    });

    const result = await processRequest(storage, config, makeRequest());
    expect(result.action).toEqual({ type: 'redirect', url: '/new', code: 301 });
    expect(result.redirect_id).toBeDefined();
    expect(result.tenant_id).toBeDefined();
  });

  it('tracks hits when enabled', async () => {
    const { group } = await seedTenant();
    const r = await storage.redirects.create({
      group_id: group.id, position: 0, source_url: '/old', status: 'enabled',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact', is_regex: false },
      match_type: 'url', match_is_regex: false, target_url: '/new',
      action_type: 'redirect', action_code: 301, random_targets: [], hit_count: 0, log_excluded: false,
    });

    await processRequest(storage, config, makeRequest());
    const updated = await storage.redirects.findById(r.id);
    expect(updated!.hit_count).toBe(1);
  });

  it('does not track hits when disabled', async () => {
    config.track_hits = false;
    const { group } = await seedTenant();
    const r = await storage.redirects.create({
      group_id: group.id, position: 0, source_url: '/old', status: 'enabled',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact', is_regex: false },
      match_type: 'url', match_is_regex: false, target_url: '/new',
      action_type: 'redirect', action_code: 301, random_targets: [], hit_count: 0, log_excluded: false,
    });

    await processRequest(storage, config, makeRequest());
    const updated = await storage.redirects.findById(r.id);
    expect(updated!.hit_count).toBe(0);
  });

  it('creates redirect log entry', async () => {
    const { tenant, group } = await seedTenant();
    await storage.redirects.create({
      group_id: group.id, position: 0, source_url: '/old', status: 'enabled',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact', is_regex: false },
      match_type: 'url', match_is_regex: false, target_url: '/new',
      action_type: 'redirect', action_code: 301, random_targets: [], hit_count: 0, log_excluded: false,
    });

    await processRequest(storage, config, makeRequest());
    const logs = await storage.redirectLogs.query({ tenant_id: tenant.id });
    expect(logs.total).toBe(1);
    expect(logs.items[0].source_url).toBe('/old');
    expect(logs.items[0].target_url).toBe('/new');
  });

  it('does not log when log_excluded', async () => {
    const { tenant, group } = await seedTenant();
    await storage.redirects.create({
      group_id: group.id, position: 0, source_url: '/old', status: 'enabled',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact', is_regex: false },
      match_type: 'url', match_is_regex: false, target_url: '/new',
      action_type: 'redirect', action_code: 301, random_targets: [], hit_count: 0, log_excluded: true,
    });

    await processRequest(storage, config, makeRequest());
    const logs = await storage.redirectLogs.query({ tenant_id: tenant.id });
    expect(logs.total).toBe(0);
  });

  it('logs 404 when no match and response_code=404', async () => {
    const { tenant } = await seedTenant();

    await processRequest(storage, config, makeRequest({ url: '/missing', response_code: 404 }));
    const logs = await storage.notFoundLogs.query({ tenant_id: tenant.id });
    expect(logs.total).toBe(1);
    expect(logs.items[0].url).toBe('/missing');
  });

  it('does not log 404 for non-404 responses', async () => {
    const { tenant } = await seedTenant();

    await processRequest(storage, config, makeRequest({ url: '/missing', response_code: 200 }));
    const logs = await storage.notFoundLogs.query({ tenant_id: tenant.id });
    expect(logs.total).toBe(0);
  });

  it('anonymizes IP when configured', async () => {
    config.ip_logging = 'anonymized';
    const { tenant, group } = await seedTenant();
    await storage.redirects.create({
      group_id: group.id, position: 0, source_url: '/old', status: 'enabled',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact', is_regex: false },
      match_type: 'url', match_is_regex: false, target_url: '/new',
      action_type: 'redirect', action_code: 301, random_targets: [], hit_count: 0, log_excluded: false,
    });

    await processRequest(storage, config, makeRequest({ client_ip: '192.168.1.123' }));
    const logs = await storage.redirectLogs.query({ tenant_id: tenant.id });
    expect(logs.items[0].ip).toBe('192.168.1.0');
  });

  it('handles error action type', async () => {
    const { group } = await seedTenant();
    await storage.redirects.create({
      group_id: group.id, position: 0, source_url: '/old', status: 'enabled',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact', is_regex: false },
      match_type: 'url', match_is_regex: false, target_url: '/new',
      action_type: 'error', action_code: 410, random_targets: [], hit_count: 0, log_excluded: false,
    });

    const result = await processRequest(storage, config, makeRequest());
    expect(result.action).toEqual({ type: 'error', code: 410 });
  });

  it('handles conditional IP match with alternate target', async () => {
    const { group } = await seedTenant();
    await storage.redirects.create({
      group_id: group.id, position: 0, source_url: '/old', status: 'enabled',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact', is_regex: false },
      match_type: 'ip', match_value: '9.9.9.9', match_is_regex: false,
      target_url: '/matched', alternate_target_url: '/not-matched',
      action_type: 'redirect', action_code: 302, random_targets: [], hit_count: 0, log_excluded: false,
    });

    const result = await processRequest(storage, config, makeRequest({ client_ip: '1.2.3.4' }));
    expect(result.action).toEqual({ type: 'redirect', url: '/not-matched', code: 302 });
  });
});
