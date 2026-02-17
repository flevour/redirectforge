import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createPostgresStorage } from './pg-storage-adapter.js';
import type { PgPool } from './pg-client.js';
import type { StorageAdapter } from '../repositories/index.js';

/*
 * Integration tests for the PostgreSQL storage adapter.
 *
 * Prerequisites:
 *   1. A running PostgreSQL instance with the RedirectForge schema applied
 *      (run migrations/001_create_tables.sql and migrations/002_create_views_and_functions.sql)
 *   2. Set DATABASE_URL env var (e.g. postgres://user:pass@localhost:5432/dbname)
 *
 * Run with: DATABASE_URL=postgres://... pnpm vitest run src/pg/
 */

const DATABASE_URL = process.env.DATABASE_URL;
const canRun = Boolean(DATABASE_URL);

describe.skipIf(!canRun)('PgStorageAdapter (integration)', () => {
  let pool: PgPool & { end(): Promise<void> };
  let storage: StorageAdapter;

  beforeAll(async () => {
    // Dynamic import so tests don't fail when pg isn't installed
    const pg = await import('pg');
    pool = new pg.default.Pool({ connectionString: DATABASE_URL });
    storage = createPostgresStorage(pool);
  });

  afterAll(async () => {
    await pool?.end();
  });

  // Clean all tables between tests (reverse FK order)
  beforeEach(async () => {
    await pool.query('DELETE FROM redirectforge_not_found_logs');
    await pool.query('DELETE FROM redirectforge_redirect_logs');
    await pool.query('DELETE FROM redirectforge_redirects');
    await pool.query('DELETE FROM redirectforge_groups');
    await pool.query('DELETE FROM redirectforge_tenant_hosts');
    await pool.query('DELETE FROM redirectforge_tenants');
  });

  // ------- Tenant -------

  describe('tenants', () => {
    it('creates and retrieves a tenant', async () => {
      const tenant = await storage.tenants.create({ name: 'Acme', status: 'active' });
      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe('Acme');

      const found = await storage.tenants.findById(tenant.id);
      expect(found).toEqual(tenant);
    });

    it('updates a tenant', async () => {
      const tenant = await storage.tenants.create({ name: 'Acme', status: 'active' });
      const updated = await storage.tenants.update(tenant.id, { name: 'Acme Corp' });
      expect(updated.name).toBe('Acme Corp');
      expect(updated.status).toBe('active');
    });

    it('deletes a tenant', async () => {
      const tenant = await storage.tenants.create({ name: 'Acme', status: 'active' });
      await storage.tenants.delete(tenant.id);
      const found = await storage.tenants.findById(tenant.id);
      expect(found).toBeUndefined();
    });

    it('lists all tenants', async () => {
      await storage.tenants.create({ name: 'A', status: 'active' });
      await storage.tenants.create({ name: 'B', status: 'suspended' });
      const all = await storage.tenants.findAll();
      expect(all.length).toBe(2);
    });
  });

  // ------- Tenant Host -------

  describe('tenantHosts', () => {
    it('creates and finds by hostname', async () => {
      const tenant = await storage.tenants.create({ name: 'Acme', status: 'active' });
      const host = await storage.tenantHosts.create({
        tenant_id: tenant.id,
        hostname: 'acme.com',
        status: 'enabled',
      });

      const found = await storage.tenantHosts.findByHostname('acme.com');
      expect(found).toEqual(host);
    });

    it('finds hosts by tenant id', async () => {
      const tenant = await storage.tenants.create({ name: 'Acme', status: 'active' });
      await storage.tenantHosts.create({ tenant_id: tenant.id, hostname: 'a.com', status: 'enabled' });
      await storage.tenantHosts.create({ tenant_id: tenant.id, hostname: 'b.com', status: 'enabled' });
      const hosts = await storage.tenantHosts.findByTenantId(tenant.id);
      expect(hosts.length).toBe(2);
    });
  });

  // ------- Group -------

  describe('groups', () => {
    it('creates and retrieves groups ordered by position', async () => {
      const tenant = await storage.tenants.create({ name: 'Acme', status: 'active' });
      await storage.groups.create({ tenant_id: tenant.id, name: 'B', status: 'enabled', position: 2 });
      await storage.groups.create({ tenant_id: tenant.id, name: 'A', status: 'enabled', position: 1 });

      const groups = await storage.groups.findByTenantId(tenant.id);
      expect(groups.length).toBe(2);
      expect(groups[0].name).toBe('A');
      expect(groups[1].name).toBe('B');
    });

    it('counts groups by tenant', async () => {
      const tenant = await storage.tenants.create({ name: 'Acme', status: 'active' });
      await storage.groups.create({ tenant_id: tenant.id, name: 'G1', status: 'enabled', position: 0 });
      await storage.groups.create({ tenant_id: tenant.id, name: 'G2', status: 'enabled', position: 1 });
      const count = await storage.groups.countByTenantId(tenant.id);
      expect(count).toBe(2);
    });
  });

  // ------- Redirect -------

  describe('redirects', () => {
    const makeRedirectInput = (groupId: string, overrides = {}) => ({
      group_id: groupId,
      position: 0,
      status: 'enabled' as const,
      source_url: '/old',
      source_flags: {
        case_insensitive: false,
        ignore_trailing_slash: false,
        query_handling: 'ignore' as const,
        is_regex: false,
      },
      match_type: 'url' as const,
      match_is_regex: false,
      action_type: 'redirect' as const,
      action_code: 301,
      random_targets: [],
      hit_count: 0,
      log_excluded: false,
      ...overrides,
    });

    it('CRUD operations', async () => {
      const tenant = await storage.tenants.create({ name: 'Acme', status: 'active' });
      const group = await storage.groups.create({ tenant_id: tenant.id, name: 'Main', status: 'enabled', position: 0 });

      const redirect = await storage.redirects.create(makeRedirectInput(group.id, { target_url: '/new' }));
      expect(redirect.id).toBeDefined();
      expect(redirect.source_url).toBe('/old');
      expect(redirect.target_url).toBe('/new');

      const updated = await storage.redirects.update(redirect.id, { target_url: '/newer' });
      expect(updated.target_url).toBe('/newer');

      await storage.redirects.delete(redirect.id);
      const found = await storage.redirects.findById(redirect.id);
      expect(found).toBeUndefined();
    });

    it('createMany and batch operations', async () => {
      const tenant = await storage.tenants.create({ name: 'Acme', status: 'active' });
      const group = await storage.groups.create({ tenant_id: tenant.id, name: 'Main', status: 'enabled', position: 0 });

      const redirects = await storage.redirects.createMany([
        makeRedirectInput(group.id, { source_url: '/a', position: 0 }),
        makeRedirectInput(group.id, { source_url: '/b', position: 1 }),
        makeRedirectInput(group.id, { source_url: '/c', position: 2 }),
      ]);
      expect(redirects.length).toBe(3);

      await storage.redirects.updateManyStatus(redirects.map((r) => r.id), 'disabled');
      const r1 = await storage.redirects.findById(redirects[0].id);
      expect(r1?.status).toBe('disabled');

      await storage.redirects.deleteMany(redirects.map((r) => r.id));
      const count = await storage.redirects.countByGroupId(group.id);
      expect(count).toBe(0);
    });

    it('findActiveByTenantId returns sorted results with group_position', async () => {
      const tenant = await storage.tenants.create({ name: 'Acme', status: 'active' });
      const g1 = await storage.groups.create({ tenant_id: tenant.id, name: 'Second', status: 'enabled', position: 2 });
      const g2 = await storage.groups.create({ tenant_id: tenant.id, name: 'First', status: 'enabled', position: 1 });

      await storage.redirects.create(makeRedirectInput(g1.id, { source_url: '/g1-r1', position: 0 }));
      await storage.redirects.create(makeRedirectInput(g2.id, { source_url: '/g2-r1', position: 0 }));

      const active = await storage.redirects.findActiveByTenantId(tenant.id);
      expect(active.length).toBe(2);
      expect(active[0].source_url).toBe('/g2-r1');
      expect(active[0].group_position).toBe(1);
      expect(active[1].source_url).toBe('/g1-r1');
      expect(active[1].group_position).toBe(2);
    });

    it('incrementHitCount atomically increments', async () => {
      const tenant = await storage.tenants.create({ name: 'Acme', status: 'active' });
      const group = await storage.groups.create({ tenant_id: tenant.id, name: 'Main', status: 'enabled', position: 0 });
      const redirect = await storage.redirects.create(makeRedirectInput(group.id));

      const now = new Date();
      await storage.redirects.incrementHitCount(redirect.id, now);
      await storage.redirects.incrementHitCount(redirect.id, now);

      const found = await storage.redirects.findById(redirect.id);
      expect(found?.hit_count).toBe(2);
    });

    it('resetHitCount clears count and last_hit_at', async () => {
      const tenant = await storage.tenants.create({ name: 'Acme', status: 'active' });
      const group = await storage.groups.create({ tenant_id: tenant.id, name: 'Main', status: 'enabled', position: 0 });
      const redirect = await storage.redirects.create(makeRedirectInput(group.id));

      await storage.redirects.incrementHitCount(redirect.id, new Date());
      await storage.redirects.resetHitCount(redirect.id);

      const found = await storage.redirects.findById(redirect.id);
      expect(found?.hit_count).toBe(0);
      expect(found?.last_hit_at).toBeUndefined();
    });
  });

  // ------- Redirect Logs -------

  describe('redirectLogs', () => {
    it('creates and queries logs with pagination', async () => {
      const tenant = await storage.tenants.create({ name: 'Acme', status: 'active' });

      for (let i = 0; i < 5; i++) {
        await storage.redirectLogs.create({
          tenant_id: tenant.id,
          created_at: new Date(Date.now() - i * 1000),
          source_url: `/page-${i}`,
          http_code: 301,
        });
      }

      const result = await storage.redirectLogs.query({
        tenant_id: tenant.id,
        page: 1,
        per_page: 3,
      });

      expect(result.items.length).toBe(3);
      expect(result.total).toBe(5);
      expect(result.total_pages).toBe(2);
      expect(result.items[0].created_at).toBeInstanceOf(Date);
    });

    it('queries with filters', async () => {
      const tenant = await storage.tenants.create({ name: 'Acme', status: 'active' });

      await storage.redirectLogs.create({
        tenant_id: tenant.id,
        created_at: new Date(),
        source_url: '/match-me',
        http_code: 301,
      });
      await storage.redirectLogs.create({
        tenant_id: tenant.id,
        created_at: new Date(),
        source_url: '/other',
        http_code: 404,
      });

      const result = await storage.redirectLogs.query({
        tenant_id: tenant.id,
        filters: [{ field: 'http_code', operator: 'eq', value: 301 }],
      });

      expect(result.total).toBe(1);
      expect(result.items[0].source_url).toBe('/match-me');
    });

    it('groupBy aggregates correctly', async () => {
      const tenant = await storage.tenants.create({ name: 'Acme', status: 'active' });

      for (let i = 0; i < 3; i++) {
        await storage.redirectLogs.create({
          tenant_id: tenant.id,
          created_at: new Date(),
          source_url: '/a',
          http_code: 301,
        });
      }
      await storage.redirectLogs.create({
        tenant_id: tenant.id,
        created_at: new Date(),
        source_url: '/b',
        http_code: 301,
      });

      const result = await storage.redirectLogs.groupBy({
        tenant_id: tenant.id,
        group_by: 'source_url',
        sort_by: 'count',
        sort_dir: 'desc',
      });

      expect(result.items.length).toBe(2);
      expect(result.items[0].value).toBe('/a');
      expect(result.items[0].count).toBe(3);
    });

    it('deleteExpiredBatch removes old logs in batches', async () => {
      const tenant = await storage.tenants.create({ name: 'Acme', status: 'active' });
      const old = new Date('2020-01-01');
      const recent = new Date();

      for (let i = 0; i < 5; i++) {
        await storage.redirectLogs.create({
          tenant_id: tenant.id,
          created_at: old,
          source_url: `/old-${i}`,
          http_code: 301,
        });
      }
      await storage.redirectLogs.create({
        tenant_id: tenant.id,
        created_at: recent,
        source_url: '/recent',
        http_code: 301,
      });

      const result = await storage.redirectLogs.deleteExpiredBatch(new Date('2021-01-01'), 3);
      expect(result.deleted).toBe(3);
      expect(result.hasMore).toBe(true);

      const result2 = await storage.redirectLogs.deleteExpiredBatch(new Date('2021-01-01'), 10);
      expect(result2.deleted).toBe(2);
      expect(result2.hasMore).toBe(false);
    });

    it('countExpired counts logs before cutoff', async () => {
      const tenant = await storage.tenants.create({ name: 'Acme', status: 'active' });
      await storage.redirectLogs.create({
        tenant_id: tenant.id,
        created_at: new Date('2020-01-01'),
        source_url: '/old',
        http_code: 301,
      });
      await storage.redirectLogs.create({
        tenant_id: tenant.id,
        created_at: new Date(),
        source_url: '/recent',
        http_code: 301,
      });

      const count = await storage.redirectLogs.countExpired(new Date('2021-01-01'));
      expect(count).toBe(1);
    });
  });

  // ------- Not Found Logs -------

  describe('notFoundLogs', () => {
    it('creates and queries not-found logs', async () => {
      const tenant = await storage.tenants.create({ name: 'Acme', status: 'active' });
      await storage.notFoundLogs.create({
        tenant_id: tenant.id,
        created_at: new Date(),
        url: '/missing-page',
      });

      const result = await storage.notFoundLogs.query({ tenant_id: tenant.id });
      expect(result.total).toBe(1);
      expect(result.items[0].url).toBe('/missing-page');
      expect(result.items[0].created_at).toBeInstanceOf(Date);
    });

    it('deleteExpiredBatch works for not-found logs', async () => {
      const tenant = await storage.tenants.create({ name: 'Acme', status: 'active' });
      for (let i = 0; i < 3; i++) {
        await storage.notFoundLogs.create({
          tenant_id: tenant.id,
          created_at: new Date('2020-01-01'),
          url: `/old-${i}`,
        });
      }

      const result = await storage.notFoundLogs.deleteExpiredBatch(new Date('2021-01-01'), 2);
      expect(result.deleted).toBe(2);
      expect(result.hasMore).toBe(true);
    });
  });
});
