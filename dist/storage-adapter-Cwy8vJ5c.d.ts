declare const RedirectStatus: {
    readonly enabled: "enabled";
    readonly disabled: "disabled";
};
type RedirectStatus = (typeof RedirectStatus)[keyof typeof RedirectStatus];
declare const TenantStatus: {
    readonly active: "active";
    readonly suspended: "suspended";
};
type TenantStatus = (typeof TenantStatus)[keyof typeof TenantStatus];
declare const QueryHandling: {
    readonly ignore: "ignore";
    readonly exact: "exact";
    readonly pass: "pass";
    readonly exact_order: "exact_order";
};
type QueryHandling = (typeof QueryHandling)[keyof typeof QueryHandling];
declare const MatchType: {
    readonly url: "url";
    readonly ip: "ip";
    readonly user_agent: "user_agent";
    readonly referrer: "referrer";
    readonly login_status: "login_status";
    readonly header: "header";
    readonly cookie: "cookie";
    readonly role: "role";
    readonly server_variable: "server_variable";
    readonly language: "language";
};
type MatchType = (typeof MatchType)[keyof typeof MatchType];
declare const ActionType: {
    readonly redirect: "redirect";
    readonly error: "error";
    readonly nothing: "nothing";
    readonly rewrite: "rewrite";
    readonly random: "random";
};
type ActionType = (typeof ActionType)[keyof typeof ActionType];
declare const IpLogging: {
    readonly full: "full";
    readonly anonymized: "anonymized";
    readonly none: "none";
};
type IpLogging = (typeof IpLogging)[keyof typeof IpLogging];

interface SourceFlags {
    case_insensitive: boolean;
    ignore_trailing_slash: boolean;
    query_handling: QueryHandling;
    is_regex: boolean;
}
interface Tenant {
    id: string;
    name: string;
    status: TenantStatus;
}
interface TenantHost {
    id: string;
    tenant_id: string;
    hostname: string;
    environment?: string;
    status: RedirectStatus;
}
interface Group {
    id: string;
    tenant_id: string;
    name: string;
    status: RedirectStatus;
    position: number;
}
interface Redirect {
    id: string;
    group_id: string;
    position: number;
    title?: string;
    status: RedirectStatus;
    source_url: string;
    source_flags: SourceFlags;
    match_type: MatchType;
    match_value?: string;
    match_is_regex: boolean;
    target_url?: string;
    alternate_target_url?: string;
    action_type: ActionType;
    action_code: number;
    random_targets: string[];
    hit_count: number;
    last_hit_at?: Date;
    log_excluded: boolean;
}
interface RedirectLog {
    id: string;
    tenant_id: string;
    redirect_id?: string;
    created_at: Date;
    source_url: string;
    target_url?: string;
    domain?: string;
    ip?: string;
    http_code: number;
    user_agent?: string;
    referrer?: string;
    request_method?: string;
    request_headers?: string;
    redirect_source?: string;
}
interface NotFoundLog {
    id: string;
    tenant_id: string;
    created_at: Date;
    url: string;
    domain?: string;
    ip?: string;
    user_agent?: string;
    referrer?: string;
    request_method?: string;
    request_headers?: string;
}

type LogFilterOperator = 'eq' | 'neq' | 'contains' | 'not_contains' | 'gt' | 'gte' | 'lt' | 'lte';
interface LogFilter {
    field: string;
    operator: LogFilterOperator;
    value: string | number | Date;
}
interface LogQuery {
    tenant_id: string;
    filters?: LogFilter[];
    sort_by?: string;
    sort_dir?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
}
interface LogGroupQuery {
    tenant_id: string;
    group_by: string;
    filters?: LogFilter[];
    sort_by?: 'count' | 'field';
    sort_dir?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
}
interface LogGroupResult {
    value: string;
    count: number;
}
interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
}

interface TenantRepository {
    findById(id: string): Promise<Tenant | undefined>;
    findAll(): Promise<Tenant[]>;
    create(data: Omit<Tenant, 'id'>): Promise<Tenant>;
    update(id: string, data: Partial<Omit<Tenant, 'id'>>): Promise<Tenant>;
    delete(id: string): Promise<void>;
}

interface TenantHostRepository {
    findById(id: string): Promise<TenantHost | undefined>;
    findByHostname(hostname: string): Promise<TenantHost | undefined>;
    findByTenantId(tenantId: string): Promise<TenantHost[]>;
    create(data: Omit<TenantHost, 'id'>): Promise<TenantHost>;
    update(id: string, data: Partial<Omit<TenantHost, 'id'>>): Promise<TenantHost>;
    delete(id: string): Promise<void>;
}

interface GroupRepository {
    findById(id: string): Promise<Group | undefined>;
    findByTenantId(tenantId: string): Promise<Group[]>;
    create(data: Omit<Group, 'id'>): Promise<Group>;
    update(id: string, data: Partial<Omit<Group, 'id'>>): Promise<Group>;
    delete(id: string): Promise<void>;
    countByTenantId(tenantId: string): Promise<number>;
}

interface RedirectWithGroupPosition extends Redirect {
    group_position: number;
}
interface RedirectRepository {
    findById(id: string): Promise<Redirect | undefined>;
    findByGroupId(groupId: string): Promise<Redirect[]>;
    findActiveByTenantId(tenantId: string): Promise<RedirectWithGroupPosition[]>;
    create(data: Omit<Redirect, 'id'>): Promise<Redirect>;
    createMany(data: Omit<Redirect, 'id'>[]): Promise<Redirect[]>;
    update(id: string, data: Partial<Omit<Redirect, 'id'>>): Promise<Redirect>;
    updateManyStatus(ids: string[], status: Redirect['status']): Promise<void>;
    delete(id: string): Promise<void>;
    deleteMany(ids: string[]): Promise<void>;
    deleteByGroupId(groupId: string): Promise<void>;
    incrementHitCount(id: string, lastHitAt: Date): Promise<void>;
    resetHitCount(id: string): Promise<void>;
    countByGroupId(groupId: string): Promise<number>;
}

interface RedirectLogRepository {
    create(data: Omit<RedirectLog, 'id'>): Promise<RedirectLog>;
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

interface NotFoundLogRepository {
    create(data: Omit<NotFoundLog, 'id'>): Promise<NotFoundLog>;
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

interface StorageAdapter {
    tenants: TenantRepository;
    tenantHosts: TenantHostRepository;
    groups: GroupRepository;
    redirects: RedirectRepository;
    redirectLogs: RedirectLogRepository;
    notFoundLogs: NotFoundLogRepository;
}

export { ActionType as A, type Group as G, IpLogging as I, type LogQuery as L, MatchType as M, type NotFoundLog as N, type PaginatedResult as P, QueryHandling as Q, type Redirect as R, type SourceFlags as S, type Tenant as T, type StorageAdapter as a, type TenantHost as b, RedirectStatus as c, type RedirectLog as d, type LogGroupQuery as e, type LogGroupResult as f, type RedirectWithGroupPosition as g, type GroupRepository as h, type LogFilter as i, type LogFilterOperator as j, type NotFoundLogRepository as k, type RedirectLogRepository as l, type RedirectRepository as m, type TenantHostRepository as n, type TenantRepository as o, TenantStatus as p };
