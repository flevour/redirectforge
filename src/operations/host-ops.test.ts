import { describe, it, expect, beforeEach } from 'vitest';
import { addHost, removeHost, enableHost, disableHost } from './host-ops.js';
import { createTenant } from './tenant-ops.js';
import { createMemoryStorage } from '../memory/memory-storage-adapter.js';
import type { StorageAdapter } from '../repositories/index.js';

let storage: StorageAdapter;

beforeEach(() => {
  storage = createMemoryStorage();
});

describe('addHost', () => {
  it('adds a host to an active tenant', async () => {
    const t = await createTenant(storage, 'T');
    const host = await addHost(storage, t.id, 'example.com');
    expect(host.hostname).toBe('example.com');
    expect(host.status).toBe('enabled');
  });

  it('throws if hostname already registered', async () => {
    const t = await createTenant(storage, 'T');
    await addHost(storage, t.id, 'example.com');
    await expect(addHost(storage, t.id, 'example.com')).rejects.toThrow('already registered');
  });

  it('throws if tenant is suspended', async () => {
    const t = await createTenant(storage, 'T');
    await storage.tenants.update(t.id, { status: 'suspended' });
    await expect(addHost(storage, t.id, 'example.com')).rejects.toThrow('must be active');
  });
});

describe('removeHost', () => {
  it('removes a host', async () => {
    const t = await createTenant(storage, 'T');
    const h1 = await addHost(storage, t.id, 'a.com');
    await addHost(storage, t.id, 'b.com');
    await removeHost(storage, h1.id);
    expect(await storage.tenantHosts.findById(h1.id)).toBeUndefined();
  });

  it('throws when removing last active host', async () => {
    const t = await createTenant(storage, 'T');
    const h = await addHost(storage, t.id, 'a.com');
    await expect(removeHost(storage, h.id)).rejects.toThrow('last active host');
  });
});

describe('enableHost / disableHost', () => {
  it('disables and re-enables a host', async () => {
    const t = await createTenant(storage, 'T');
    const h = await addHost(storage, t.id, 'a.com');
    const disabled = await disableHost(storage, h.id);
    expect(disabled.status).toBe('disabled');
    const enabled = await enableHost(storage, h.id);
    expect(enabled.status).toBe('enabled');
  });
});
