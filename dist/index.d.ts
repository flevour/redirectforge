import { I as IpLogging, S as SourceFlags, M as MatchType, A as ActionType, a as StorageAdapter, T as Tenant, b as TenantHost, G as Group, R as Redirect, c as RedirectStatus, L as LogQuery, P as PaginatedResult, d as RedirectLog, e as LogGroupQuery, f as LogGroupResult, N as NotFoundLog, g as RedirectWithGroupPosition } from './storage-adapter-Cwy8vJ5c.js';
export { h as GroupRepository, i as LogFilter, j as LogFilterOperator, k as NotFoundLogRepository, Q as QueryHandling, l as RedirectLogRepository, m as RedirectRepository, n as TenantHostRepository, o as TenantRepository, p as TenantStatus } from './storage-adapter-Cwy8vJ5c.js';

interface HttpRequest {
    url: string;
    method: string;
    domain: string;
    ip?: string;
    client_ip?: string;
    user_agent?: string;
    referrer?: string;
    accept_language?: string;
    is_authenticated: boolean;
    user_role?: string;
    response_code?: number;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
    server_variables?: Record<string, string>;
}
interface ContentItem {
    content_type: string;
    current_url: string;
    previous_url?: string;
}
interface User {
    is_admin: boolean;
}

interface RedirectForgeConfig {
    redirect_log_retention_days: number;
    not_found_log_retention_days: number;
    track_hits: boolean;
    log_request_headers: boolean;
    ip_logging: IpLogging;
    ip_header_priority: string[];
    trusted_proxy_ranges: string[];
    log_cleanup_batch_size: number;
    aggressive_cleanup_threshold: number;
    aggressive_cleanup_batch_size: number;
    monitor_content_types: Set<string>;
}
declare const DEFAULT_CONFIG: RedirectForgeConfig;

type ActionResult = {
    type: 'redirect';
    url: string;
    code: number;
} | {
    type: 'error';
    code: number;
} | {
    type: 'rewrite';
    original_url: string;
    target_url: string;
} | {
    type: 'random_redirect';
    url: string;
    code: number;
} | {
    type: 'nothing';
} | {
    type: 'pass';
};
interface ProcessResult {
    action: ActionResult;
    redirect_id?: string;
    tenant_id?: string;
}
interface UrlMatchResult {
    matched: boolean;
    captured_groups: string[];
}
interface ConditionEvaluation {
    checked: boolean;
    matched: boolean;
}

declare class RedirectForgeError extends Error {
    constructor(message: string);
}
declare class NotFoundError extends RedirectForgeError {
    constructor(entity: string, id: string);
}
declare class PreconditionError extends RedirectForgeError {
    constructor(message: string);
}
declare class ValidationError extends RedirectForgeError {
    readonly field?: string;
    constructor(message: string, field?: string);
}

declare const ImportFormat: {
    readonly json: "json";
    readonly csv: "csv";
};
type ImportFormat = (typeof ImportFormat)[keyof typeof ImportFormat];
interface ImportRecord {
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
    title?: string;
}
interface ParseError {
    row: number;
    message: string;
}
interface ParseResult {
    records: ImportRecord[];
    errors: ParseError[];
}
interface ImportResult {
    created: number;
    errors: ParseError[];
}

declare const ExportFormat: {
    readonly json: "json";
    readonly csv: "csv";
};
type ExportFormat = (typeof ExportFormat)[keyof typeof ExportFormat];
interface ExportOptions {
    format: ExportFormat;
}

interface ExpirationResult {
    redirect_logs: {
        deleted: number;
        hasMore: boolean;
    };
    not_found_logs: {
        deleted: number;
        hasMore: boolean;
    };
}

interface CreateRedirectInput {
    group_id: string;
    source_url: string;
    source_flags: SourceFlags;
    match_type: MatchType;
    action_type: ActionType;
    action_code: number;
    target_url?: string;
    alternate_target_url?: string;
    title?: string;
    match_value?: string;
    match_is_regex?: boolean;
    random_targets?: string[];
    log_excluded?: boolean;
}
interface UpdateRedirectInput {
    source_url?: string;
    source_flags?: SourceFlags;
    match_type?: MatchType;
    match_value?: string;
    match_is_regex?: boolean;
    target_url?: string;
    alternate_target_url?: string;
    action_type?: ActionType;
    action_code?: number;
    group_id?: string;
    title?: string;
    random_targets?: string[];
    log_excluded?: boolean;
}

interface RedirectForgeOptions {
    storage: StorageAdapter;
    config?: Partial<RedirectForgeConfig>;
}
declare class RedirectForge {
    private storage;
    private config;
    constructor(options: RedirectForgeOptions);
    processRequest(request: HttpRequest): Promise<ProcessResult>;
    createTenant(name: string): Promise<Tenant>;
    suspendTenant(tenantId: string): Promise<Tenant>;
    activateTenant(tenantId: string): Promise<Tenant>;
    addHost(tenantId: string, hostname: string, environment?: string): Promise<TenantHost>;
    removeHost(hostId: string): Promise<void>;
    enableHost(hostId: string): Promise<TenantHost>;
    disableHost(hostId: string): Promise<TenantHost>;
    createGroup(tenantId: string, name: string): Promise<Group>;
    enableGroup(groupId: string): Promise<Group>;
    disableGroup(groupId: string): Promise<Group>;
    deleteGroup(groupId: string): Promise<void>;
    createRedirect(input: CreateRedirectInput): Promise<Redirect>;
    updateRedirect(redirectId: string, input: UpdateRedirectInput): Promise<Redirect>;
    enableRedirect(redirectId: string): Promise<Redirect>;
    disableRedirect(redirectId: string): Promise<Redirect>;
    deleteRedirect(redirectId: string): Promise<void>;
    resetRedirectHits(redirectId: string): Promise<void>;
    bulkDeleteRedirects(ids: string[]): Promise<void>;
    bulkSetRedirectStatus(ids: string[], status: RedirectStatus): Promise<void>;
    bulkDeleteRedirectLogs(ids: string[]): Promise<void>;
    bulkDeleteNotFoundLogs(ids: string[]): Promise<void>;
    deleteAllTenantRedirectLogs(tenantId: string): Promise<void>;
    deleteAllTenantNotFoundLogs(tenantId: string): Promise<void>;
    queryRedirectLogs(query: LogQuery): Promise<PaginatedResult<RedirectLog>>;
    groupRedirectLogs(query: LogGroupQuery): Promise<PaginatedResult<LogGroupResult>>;
    queryNotFoundLogs(query: LogQuery): Promise<PaginatedResult<NotFoundLog>>;
    groupNotFoundLogs(query: LogGroupQuery): Promise<PaginatedResult<LogGroupResult>>;
    expireLogs(): Promise<ExpirationResult>;
    handleContentUrlChange(tenantId: string, targetGroupId: string, item: ContentItem): Promise<Redirect | null>;
    importRedirects(sourceData: string, format: ImportFormat, targetGroupId: string): Promise<ImportResult>;
    exportRedirects(redirects: Redirect[], format: ExportFormat): string;
    exportRedirectLogsAsCsv(logs: RedirectLog[]): string;
    exportNotFoundLogsAsCsv(logs: NotFoundLog[]): string;
}

declare function createMemoryStorage(): StorageAdapter;

interface PipelineMatch {
    redirect: Redirect;
    target: string;
}
declare function findRedirect(candidates: RedirectWithGroupPosition[], request: HttpRequest): PipelineMatch | null;

declare function evaluateUrlPattern(redirect: Redirect, requestUrl: string): UrlMatchResult;

declare function evaluateCondition(redirect: Redirect, request: HttpRequest): ConditionEvaluation;

declare function applyQueryHandling(targetUrl: string, requestUrl: string, queryHandling: string): string;
declare function resolveTarget(redirect: Redirect, requestUrl: string, urlResult: UrlMatchResult, condition: ConditionEvaluation): string | null;

export { type ActionResult, ActionType, type ConditionEvaluation, type ContentItem, type CreateRedirectInput, DEFAULT_CONFIG, type ExpirationResult, ExportFormat, type ExportOptions, Group, type HttpRequest, ImportFormat, type ImportRecord, type ImportResult, IpLogging, LogGroupQuery, LogGroupResult, LogQuery, MatchType, NotFoundError, NotFoundLog, PaginatedResult, type ParseError, type ParseResult, type PipelineMatch, PreconditionError, type ProcessResult, Redirect, RedirectForge, type RedirectForgeConfig, RedirectForgeError, type RedirectForgeOptions, RedirectLog, RedirectStatus, RedirectWithGroupPosition, SourceFlags, StorageAdapter, Tenant, TenantHost, type UpdateRedirectInput, type UrlMatchResult, type User, ValidationError, applyQueryHandling, createMemoryStorage, evaluateCondition, evaluateUrlPattern, findRedirect, resolveTarget };
