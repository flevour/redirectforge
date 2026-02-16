import { describe, it, expect, beforeEach } from 'vitest';
import { RedirectForge, createMemoryStorage } from './index.js';
import type { HttpRequest } from './index.js';

function makeRequest(overrides: Partial<HttpRequest> = {}): HttpRequest {
  return {
    url: '/old-page',
    method: 'GET',
    domain: 'example.com',
    ip: '10.0.0.1',
    client_ip: '10.0.0.1',
    is_authenticated: false,
    ...overrides,
  };
}

describe('RedirectForge integration', () => {
  let forge: RedirectForge;

  beforeEach(() => {
    forge = new RedirectForge({ storage: createMemoryStorage() });
  });

  // 1. Full lifecycle: tenant → host → group → redirect → processRequest → verify
  it('end-to-end redirect lifecycle', async () => {
    const tenant = await forge.createTenant('My Site');
    await forge.addHost(tenant.id, 'example.com');
    const group = await forge.createGroup(tenant.id, 'Default');
    await forge.createRedirect({
      group_id: group.id,
      source_url: '/old-page',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact', is_regex: false },
      match_type: 'url',
      target_url: '/new-page',
      action_type: 'redirect',
      action_code: 301,
    });

    const result = await forge.processRequest(makeRequest());
    expect(result.action).toEqual({ type: 'redirect', url: '/new-page', code: 301 });
    expect(result.tenant_id).toBe(tenant.id);
  });

  // 2. Multi-tenant isolation
  it('multi-tenant isolation: same path, different redirects', async () => {
    const t1 = await forge.createTenant('Site A');
    await forge.addHost(t1.id, 'a.example.com');
    const g1 = await forge.createGroup(t1.id, 'G');
    await forge.createRedirect({
      group_id: g1.id,
      source_url: '/shared',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact', is_regex: false },
      match_type: 'url',
      target_url: '/a-destination',
      action_type: 'redirect',
      action_code: 301,
    });

    const t2 = await forge.createTenant('Site B');
    await forge.addHost(t2.id, 'b.example.com');
    const g2 = await forge.createGroup(t2.id, 'G');
    await forge.createRedirect({
      group_id: g2.id,
      source_url: '/shared',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact', is_regex: false },
      match_type: 'url',
      target_url: '/b-destination',
      action_type: 'redirect',
      action_code: 302,
    });

    const resultA = await forge.processRequest(makeRequest({ url: '/shared', domain: 'a.example.com' }));
    expect(resultA.action).toEqual({ type: 'redirect', url: '/a-destination', code: 301 });

    const resultB = await forge.processRequest(makeRequest({ url: '/shared', domain: 'b.example.com' }));
    expect(resultB.action).toEqual({ type: 'redirect', url: '/b-destination', code: 302 });
  });

  // 3. Conditional matching: IP-based with matched/not-matched targets
  it('conditional IP match with alternate target', async () => {
    const tenant = await forge.createTenant('T');
    await forge.addHost(tenant.id, 'example.com');
    const group = await forge.createGroup(tenant.id, 'G');
    await forge.createRedirect({
      group_id: group.id,
      source_url: '/geo',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact', is_regex: false },
      match_type: 'ip',
      match_value: '192.168.1.0/24',
      target_url: '/internal',
      alternate_target_url: '/external',
      action_type: 'redirect',
      action_code: 302,
    });

    const internal = await forge.processRequest(makeRequest({ url: '/geo', client_ip: '192.168.1.50' }));
    expect(internal.action).toEqual({ type: 'redirect', url: '/internal', code: 302 });

    const external = await forge.processRequest(makeRequest({ url: '/geo', client_ip: '10.0.0.1' }));
    expect(external.action).toEqual({ type: 'redirect', url: '/external', code: 302 });
  });

  // 4. Import round-trip: export → re-import → verify equivalence
  it('JSON import round-trip', async () => {
    const tenant = await forge.createTenant('T');
    await forge.addHost(tenant.id, 'example.com');
    const group = await forge.createGroup(tenant.id, 'Source');

    await forge.createRedirect({
      group_id: group.id,
      source_url: '/page-1',
      source_flags: { case_insensitive: true, ignore_trailing_slash: true, query_handling: 'pass', is_regex: false },
      match_type: 'url',
      target_url: '/new-page-1',
      action_type: 'redirect',
      action_code: 301,
    });
    await forge.createRedirect({
      group_id: group.id,
      source_url: '^/posts/(\\d+)$',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact', is_regex: true },
      match_type: 'url',
      target_url: '/articles/$1',
      action_type: 'redirect',
      action_code: 301,
    });

    // Export
    const sourceRedirects = await forge['storage'].redirects.findByGroupId(group.id);
    const exported = forge.exportRedirects(sourceRedirects, 'json');

    // Re-import into a new group
    const targetGroup = await forge.createGroup(tenant.id, 'Imported');
    const importResult = await forge.importRedirects(exported, 'json', targetGroup.id);
    expect(importResult.created).toBe(2);
    expect(importResult.errors).toEqual([]);

    // Verify the imported redirects work
    const result1 = await forge.processRequest(makeRequest({ url: '/page-1' }));
    expect(result1.action.type).toBe('redirect');
    if (result1.action.type === 'redirect') {
      expect(result1.action.url).toBe('/new-page-1');
    }
  });

  // 5. Log expiration with batching
  it('log expiration with batch control', async () => {
    const forgeWithRetention = new RedirectForge({
      storage: createMemoryStorage(),
      config: {
        redirect_log_retention_days: 30,
        log_cleanup_batch_size: 2,
      },
    });

    const tenant = await forgeWithRetention.createTenant('T');
    await forgeWithRetention.addHost(tenant.id, 'example.com');
    const group = await forgeWithRetention.createGroup(tenant.id, 'G');
    await forgeWithRetention.createRedirect({
      group_id: group.id,
      source_url: '/page',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact', is_regex: false },
      match_type: 'url',
      target_url: '/new-page',
      action_type: 'redirect',
      action_code: 301,
    });

    // Generate log entries by processing requests
    for (let i = 0; i < 5; i++) {
      await forgeWithRetention.processRequest(makeRequest({ url: '/page', domain: 'example.com' }));
    }

    // Verify logs exist
    const logsBefore = await forgeWithRetention.queryRedirectLogs({ tenant_id: tenant.id });
    expect(logsBefore.total).toBe(5);

    // Manually backdate all logs to 60 days ago
    const storage = forgeWithRetention['storage'];
    const allLogs = await storage.redirectLogs.query({ tenant_id: tenant.id, per_page: 100 });
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 60);
    for (const log of allLogs.items) {
      // Directly manipulate the in-memory store for testing
      (log as { created_at: Date }).created_at = oldDate;
    }

    // First expiration: batch size 2, so should delete 2 and report hasMore
    const result1 = await forgeWithRetention.expireLogs();
    expect(result1.redirect_logs.deleted).toBe(2);
    expect(result1.redirect_logs.hasMore).toBe(true);

    // Second expiration
    const result2 = await forgeWithRetention.expireLogs();
    expect(result2.redirect_logs.deleted).toBe(2);
    expect(result2.redirect_logs.hasMore).toBe(true);

    // Third expiration: only 1 left
    const result3 = await forgeWithRetention.expireLogs();
    expect(result3.redirect_logs.deleted).toBe(1);
    expect(result3.redirect_logs.hasMore).toBe(false);
  });

  // Additional: regex with capture group substitution
  it('regex capture group substitution', async () => {
    const tenant = await forge.createTenant('T');
    await forge.addHost(tenant.id, 'example.com');
    const group = await forge.createGroup(tenant.id, 'G');
    await forge.createRedirect({
      group_id: group.id,
      source_url: '^/blog/(\\d{4})/(\\d{2})/(.+)$',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact', is_regex: true },
      match_type: 'url',
      target_url: '/posts/$3?year=$1&month=$2',
      action_type: 'redirect',
      action_code: 301,
    });

    const result = await forge.processRequest(makeRequest({ url: '/blog/2024/06/hello-world' }));
    expect(result.action).toEqual({
      type: 'redirect',
      url: '/posts/hello-world?year=2024&month=06',
      code: 301,
    });
  });

  // Additional: login_status conditional
  it('login_status routes authenticated vs unauthenticated', async () => {
    const tenant = await forge.createTenant('T');
    await forge.addHost(tenant.id, 'example.com');
    const group = await forge.createGroup(tenant.id, 'G');
    await forge.createRedirect({
      group_id: group.id,
      source_url: '/dashboard',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact', is_regex: false },
      match_type: 'login_status',
      target_url: '/app/dashboard',
      alternate_target_url: '/login?next=/dashboard',
      action_type: 'redirect',
      action_code: 302,
    });

    const authed = await forge.processRequest(makeRequest({ url: '/dashboard', is_authenticated: true }));
    expect(authed.action).toEqual({ type: 'redirect', url: '/app/dashboard', code: 302 });

    const unauthed = await forge.processRequest(makeRequest({ url: '/dashboard', is_authenticated: false }));
    expect(unauthed.action).toEqual({ type: 'redirect', url: '/login?next=/dashboard', code: 302 });
  });

  // Additional: query string pass-through
  it('query_handling=pass appends request query to target', async () => {
    const tenant = await forge.createTenant('T');
    await forge.addHost(tenant.id, 'example.com');
    const group = await forge.createGroup(tenant.id, 'G');
    await forge.createRedirect({
      group_id: group.id,
      source_url: '/old',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'pass', is_regex: false },
      match_type: 'url',
      target_url: '/new',
      action_type: 'redirect',
      action_code: 301,
    });

    const result = await forge.processRequest(makeRequest({ url: '/old?ref=abc&utm=test' }));
    expect(result.action).toEqual({ type: 'redirect', url: '/new?ref=abc&utm=test', code: 301 });
  });

  // Additional: suspended tenant blocks processing
  it('suspended tenant returns pass', async () => {
    const tenant = await forge.createTenant('T');
    await forge.addHost(tenant.id, 'example.com');
    const group = await forge.createGroup(tenant.id, 'G');
    await forge.createRedirect({
      group_id: group.id,
      source_url: '/old-page',
      source_flags: { case_insensitive: false, ignore_trailing_slash: false, query_handling: 'exact', is_regex: false },
      match_type: 'url',
      target_url: '/new',
      action_type: 'redirect',
      action_code: 301,
    });

    await forge.suspendTenant(tenant.id);
    const result = await forge.processRequest(makeRequest());
    expect(result.action.type).toBe('pass');
  });

  // Additional: content URL monitor
  it('content URL change creates redirect', async () => {
    const forgeWithMonitor = new RedirectForge({
      storage: createMemoryStorage(),
      config: { monitor_content_types: new Set(['post']) },
    });

    const tenant = await forgeWithMonitor.createTenant('T');
    await forgeWithMonitor.addHost(tenant.id, 'example.com');
    const group = await forgeWithMonitor.createGroup(tenant.id, 'Monitored');

    const redirect = await forgeWithMonitor.handleContentUrlChange(tenant.id, group.id, {
      content_type: 'post',
      current_url: '/new-slug',
      previous_url: '/old-slug',
    });

    expect(redirect).not.toBeNull();
    expect(redirect!.source_url).toBe('/old-slug');
    expect(redirect!.target_url).toBe('/new-slug');
    expect(redirect!.action_code).toBe(301);

    // Verify the redirect actually works
    const result = await forgeWithMonitor.processRequest(
      makeRequest({ url: '/old-slug', domain: 'example.com' }),
    );
    expect(result.action).toEqual({ type: 'redirect', url: '/new-slug', code: 301 });
  });
});
