import { describe, it, expect, beforeEach } from 'vitest';
import { importRedirects } from './importer.js';
import { createMemoryStorage } from '../memory/memory-storage-adapter.js';
import { createTenant } from '../operations/tenant-ops.js';
import { createGroup } from '../operations/group-ops.js';
import type { StorageAdapter } from '../repositories/index.js';

let storage: StorageAdapter;
let groupId: string;

beforeEach(async () => {
  storage = createMemoryStorage();
  const t = await createTenant(storage, 'T');
  const g = await createGroup(storage, t.id, 'G');
  groupId = g.id;
});

describe('importRedirects - JSON', () => {
  it('imports valid JSON records', async () => {
    const json = JSON.stringify([
      { source_url: '/old1', target_url: '/new1', action_code: 301 },
      { source_url: '/old2', target_url: '/new2', action_code: 302 },
    ]);

    const result = await importRedirects(storage, json, 'json', groupId);
    expect(result.created).toBe(2);
    expect(result.errors).toEqual([]);

    const redirects = await storage.redirects.findByGroupId(groupId);
    expect(redirects).toHaveLength(2);
    expect(redirects[0].source_url).toBe('/old1');
    expect(redirects[1].source_url).toBe('/old2');
  });

  it('reports errors for invalid records', async () => {
    const json = JSON.stringify([
      { source_url: '/valid', target_url: '/new' },
      { target_url: '/no-source' },
    ]);

    const result = await importRedirects(storage, json, 'json', groupId);
    expect(result.created).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(1);
  });

  it('handles invalid JSON', async () => {
    const result = await importRedirects(storage, 'not json', 'json', groupId);
    expect(result.created).toBe(0);
    expect(result.errors).toHaveLength(1);
  });
});

describe('importRedirects - CSV', () => {
  it('imports valid CSV', async () => {
    const csv = [
      'source_url,target_url,action_type,action_code',
      '/old1,/new1,redirect,301',
      '/old2,/new2,redirect,302',
    ].join('\n');

    const result = await importRedirects(storage, csv, 'csv', groupId);
    expect(result.created).toBe(2);

    const redirects = await storage.redirects.findByGroupId(groupId);
    expect(redirects[0].source_url).toBe('/old1');
    expect(redirects[0].action_code).toBe(301);
    expect(redirects[1].action_code).toBe(302);
  });

  it('handles quoted CSV fields', async () => {
    const csv = [
      'source_url,target_url,title',
      '"/old, path",/new,"A ""title"" here"',
    ].join('\n');

    const result = await importRedirects(storage, csv, 'csv', groupId);
    expect(result.created).toBe(1);

    const redirects = await storage.redirects.findByGroupId(groupId);
    expect(redirects[0].source_url).toBe('/old, path');
    expect(redirects[0].title).toBe('A "title" here');
  });

  it('assigns sequential positions', async () => {
    const csv = [
      'source_url,target_url',
      '/a,/b',
      '/c,/d',
    ].join('\n');

    await importRedirects(storage, csv, 'csv', groupId);
    const redirects = await storage.redirects.findByGroupId(groupId);
    expect(redirects[0].position).toBe(0);
    expect(redirects[1].position).toBe(1);
  });
});
