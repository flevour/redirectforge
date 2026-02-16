import { describe, it, expect, beforeEach } from 'vitest';
import { createTenant, suspendTenant, activateTenant } from './tenant-ops.js';
import { createMemoryStorage } from '../memory/memory-storage-adapter.js';
import type { StorageAdapter } from '../repositories/index.js';

let storage: StorageAdapter;

beforeEach(() => {
  storage = createMemoryStorage();
});

describe('createTenant', () => {
  it('creates an active tenant', async () => {
    const t = await createTenant(storage, 'My Site');
    expect(t.name).toBe('My Site');
    expect(t.status).toBe('active');
  });
});

describe('suspendTenant', () => {
  it('suspends an active tenant', async () => {
    const t = await createTenant(storage, 'T');
    const suspended = await suspendTenant(storage, t.id);
    expect(suspended.status).toBe('suspended');
  });

  it('throws if tenant is not active', async () => {
    const t = await createTenant(storage, 'T');
    await suspendTenant(storage, t.id);
    await expect(suspendTenant(storage, t.id)).rejects.toThrow('must be active');
  });
});

describe('activateTenant', () => {
  it('activates a suspended tenant', async () => {
    const t = await createTenant(storage, 'T');
    await suspendTenant(storage, t.id);
    const activated = await activateTenant(storage, t.id);
    expect(activated.status).toBe('active');
  });

  it('throws if tenant is not suspended', async () => {
    const t = await createTenant(storage, 'T');
    await expect(activateTenant(storage, t.id)).rejects.toThrow('must be suspended');
  });
});
