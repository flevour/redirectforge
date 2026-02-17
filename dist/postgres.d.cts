import { a as StorageAdapter, o as TenantRepository, T as Tenant, n as TenantHostRepository, b as TenantHost, h as GroupRepository, G as Group, m as RedirectRepository, R as Redirect, g as RedirectWithGroupPosition, l as RedirectLogRepository, d as RedirectLog, L as LogQuery, P as PaginatedResult, e as LogGroupQuery, f as LogGroupResult, k as NotFoundLogRepository, N as NotFoundLog } from './storage-adapter-Cwy8vJ5c.cjs';

/**
 * Minimal interface satisfied by pg.Pool, pg.Client, pg.PoolClient,
 * @vercel/postgres, @neondatabase/serverless, and similar libraries.
 */
interface PgPool {
    query(text: string, values?: unknown[]): Promise<{
        rows: any[];
        rowCount: number | null;
    }>;
}

declare function createPostgresStorage(pool: PgPool): StorageAdapter;

declare class PgTenantRepository implements TenantRepository {
    private readonly pool;
    constructor(pool: PgPool);
    findById(id: string): Promise<Tenant | undefined>;
    findAll(): Promise<Tenant[]>;
    create(input: Omit<Tenant, 'id'>): Promise<Tenant>;
    update(id: string, input: Partial<Omit<Tenant, 'id'>>): Promise<Tenant>;
    delete(id: string): Promise<void>;
}

declare class PgTenantHostRepository implements TenantHostRepository {
    private readonly pool;
    constructor(pool: PgPool);
    findById(id: string): Promise<TenantHost | undefined>;
    findByHostname(hostname: string): Promise<TenantHost | undefined>;
    findByTenantId(tenantId: string): Promise<TenantHost[]>;
    create(input: Omit<TenantHost, 'id'>): Promise<TenantHost>;
    update(id: string, input: Partial<Omit<TenantHost, 'id'>>): Promise<TenantHost>;
    delete(id: string): Promise<void>;
}

declare class PgGroupRepository implements GroupRepository {
    private readonly pool;
    constructor(pool: PgPool);
    findById(id: string): Promise<Group | undefined>;
    findByTenantId(tenantId: string): Promise<Group[]>;
    create(input: Omit<Group, 'id'>): Promise<Group>;
    update(id: string, input: Partial<Omit<Group, 'id'>>): Promise<Group>;
    delete(id: string): Promise<void>;
    countByTenantId(tenantId: string): Promise<number>;
}

declare class PgRedirectRepository implements RedirectRepository {
    private readonly pool;
    constructor(pool: PgPool);
    findById(id: string): Promise<Redirect | undefined>;
    findByGroupId(groupId: string): Promise<Redirect[]>;
    findActiveByTenantId(tenantId: string): Promise<RedirectWithGroupPosition[]>;
    create(input: Omit<Redirect, 'id'>): Promise<Redirect>;
    createMany(inputs: Omit<Redirect, 'id'>[]): Promise<Redirect[]>;
    update(id: string, input: Partial<Omit<Redirect, 'id'>>): Promise<Redirect>;
    updateManyStatus(ids: string[], status: Redirect['status']): Promise<void>;
    delete(id: string): Promise<void>;
    deleteMany(ids: string[]): Promise<void>;
    deleteByGroupId(groupId: string): Promise<void>;
    incrementHitCount(id: string, lastHitAt: Date): Promise<void>;
    resetHitCount(id: string): Promise<void>;
    countByGroupId(groupId: string): Promise<number>;
}

declare class PgRedirectLogRepository implements RedirectLogRepository {
    private readonly pool;
    constructor(pool: PgPool);
    create(input: Omit<RedirectLog, 'id'>): Promise<RedirectLog>;
    query(query: LogQuery): Promise<PaginatedResult<RedirectLog>>;
    groupBy(query: LogGroupQuery): Promise<PaginatedResult<LogGroupResult>>;
    deleteMany(ids: string[]): Promise<void>;
    deleteByTenantId(tenantId: string): Promise<void>;
    deleteExpiredBatch(cutoff: Date, batchSize: number): Promise<{
        deleted: number;
        hasMore: boolean;
    }>;
    countExpired(cutoff: Date): Promise<number>;
}

declare class PgNotFoundLogRepository implements NotFoundLogRepository {
    private readonly pool;
    constructor(pool: PgPool);
    create(input: Omit<NotFoundLog, 'id'>): Promise<NotFoundLog>;
    query(query: LogQuery): Promise<PaginatedResult<NotFoundLog>>;
    groupBy(query: LogGroupQuery): Promise<PaginatedResult<LogGroupResult>>;
    deleteMany(ids: string[]): Promise<void>;
    deleteByTenantId(tenantId: string): Promise<void>;
    deleteExpiredBatch(cutoff: Date, batchSize: number): Promise<{
        deleted: number;
        hasMore: boolean;
    }>;
    countExpired(cutoff: Date): Promise<number>;
}

export { PgGroupRepository, PgNotFoundLogRepository, type PgPool, PgRedirectLogRepository, PgRedirectRepository, PgTenantHostRepository, PgTenantRepository, createPostgresStorage };
