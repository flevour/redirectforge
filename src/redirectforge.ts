import type { StorageAdapter } from './repositories/index.js';
import type {
  RedirectForgeConfig,
  HttpRequest,
  ContentItem,
  ProcessResult,
  Tenant,
  TenantHost,
  Group,
  Redirect,
  RedirectLog,
  NotFoundLog,
  RedirectStatus,
  LogQuery,
  LogGroupQuery,
  LogGroupResult,
  PaginatedResult,
} from './types/index.js';
import { DEFAULT_CONFIG } from './types/index.js';
import type { ImportFormat, ImportResult } from './import/types.js';
import type { ExportFormat } from './export/types.js';
import type { ExpirationResult } from './operations/log-expiration.js';
import type { CreateRedirectInput, UpdateRedirectInput } from './operations/redirect-ops.js';

import { processRequest } from './engine/processor.js';
import { createTenant, suspendTenant, activateTenant } from './operations/tenant-ops.js';
import { addHost, removeHost, enableHost, disableHost } from './operations/host-ops.js';
import { createGroup, enableGroup, disableGroup, deleteGroup } from './operations/group-ops.js';
import {
  createRedirect,
  updateRedirect,
  enableRedirect,
  disableRedirect,
  deleteRedirect,
  resetRedirectHits,
} from './operations/redirect-ops.js';
import {
  bulkDeleteRedirects,
  bulkSetRedirectStatus,
  bulkDeleteRedirectLogs,
  bulkDeleteNotFoundLogs,
  deleteAllTenantRedirectLogs,
  deleteAllTenantNotFoundLogs,
} from './operations/bulk-ops.js';
import { handleContentUrlChange } from './operations/content-monitor.js';
import { expireLogs } from './operations/log-expiration.js';
import { importRedirects } from './import/importer.js';
import { exportRedirects, exportRedirectLogsAsCsv, exportNotFoundLogsAsCsv } from './export/exporter.js';

export interface RedirectForgeOptions {
  storage: StorageAdapter;
  config?: Partial<RedirectForgeConfig>;
}

export class RedirectForge {
  private storage: StorageAdapter;
  private config: RedirectForgeConfig;

  constructor(options: RedirectForgeOptions) {
    this.storage = options.storage;
    this.config = { ...DEFAULT_CONFIG, ...options.config };
    // Ensure monitor_content_types is a Set even if overridden with one
    if (options.config?.monitor_content_types) {
      this.config.monitor_content_types = new Set(options.config.monitor_content_types);
    }
  }

  // --- Request Processing ---

  processRequest(request: HttpRequest): Promise<ProcessResult> {
    return processRequest(this.storage, this.config, request);
  }

  // --- Tenant Lifecycle ---

  createTenant(name: string): Promise<Tenant> {
    return createTenant(this.storage, name);
  }

  suspendTenant(tenantId: string): Promise<Tenant> {
    return suspendTenant(this.storage, tenantId);
  }

  activateTenant(tenantId: string): Promise<Tenant> {
    return activateTenant(this.storage, tenantId);
  }

  // --- Host Management ---

  addHost(tenantId: string, hostname: string, environment?: string): Promise<TenantHost> {
    return addHost(this.storage, tenantId, hostname, environment);
  }

  removeHost(hostId: string): Promise<void> {
    return removeHost(this.storage, hostId);
  }

  enableHost(hostId: string): Promise<TenantHost> {
    return enableHost(this.storage, hostId);
  }

  disableHost(hostId: string): Promise<TenantHost> {
    return disableHost(this.storage, hostId);
  }

  // --- Group Management ---

  createGroup(tenantId: string, name: string): Promise<Group> {
    return createGroup(this.storage, tenantId, name);
  }

  enableGroup(groupId: string): Promise<Group> {
    return enableGroup(this.storage, groupId);
  }

  disableGroup(groupId: string): Promise<Group> {
    return disableGroup(this.storage, groupId);
  }

  deleteGroup(groupId: string): Promise<void> {
    return deleteGroup(this.storage, groupId);
  }

  // --- Redirect Management ---

  createRedirect(input: CreateRedirectInput): Promise<Redirect> {
    return createRedirect(this.storage, input);
  }

  updateRedirect(redirectId: string, input: UpdateRedirectInput): Promise<Redirect> {
    return updateRedirect(this.storage, redirectId, input);
  }

  enableRedirect(redirectId: string): Promise<Redirect> {
    return enableRedirect(this.storage, redirectId);
  }

  disableRedirect(redirectId: string): Promise<Redirect> {
    return disableRedirect(this.storage, redirectId);
  }

  deleteRedirect(redirectId: string): Promise<void> {
    return deleteRedirect(this.storage, redirectId);
  }

  resetRedirectHits(redirectId: string): Promise<void> {
    return resetRedirectHits(this.storage, redirectId);
  }

  // --- Bulk Operations ---

  bulkDeleteRedirects(ids: string[]): Promise<void> {
    return bulkDeleteRedirects(this.storage, ids);
  }

  bulkSetRedirectStatus(ids: string[], status: RedirectStatus): Promise<void> {
    return bulkSetRedirectStatus(this.storage, ids, status);
  }

  bulkDeleteRedirectLogs(ids: string[]): Promise<void> {
    return bulkDeleteRedirectLogs(this.storage, ids);
  }

  bulkDeleteNotFoundLogs(ids: string[]): Promise<void> {
    return bulkDeleteNotFoundLogs(this.storage, ids);
  }

  deleteAllTenantRedirectLogs(tenantId: string): Promise<void> {
    return deleteAllTenantRedirectLogs(this.storage, tenantId);
  }

  deleteAllTenantNotFoundLogs(tenantId: string): Promise<void> {
    return deleteAllTenantNotFoundLogs(this.storage, tenantId);
  }

  // --- Log Queries ---

  queryRedirectLogs(query: LogQuery): Promise<PaginatedResult<RedirectLog>> {
    return this.storage.redirectLogs.query(query);
  }

  groupRedirectLogs(query: LogGroupQuery): Promise<PaginatedResult<LogGroupResult>> {
    return this.storage.redirectLogs.groupBy(query);
  }

  queryNotFoundLogs(query: LogQuery): Promise<PaginatedResult<NotFoundLog>> {
    return this.storage.notFoundLogs.query(query);
  }

  groupNotFoundLogs(query: LogGroupQuery): Promise<PaginatedResult<LogGroupResult>> {
    return this.storage.notFoundLogs.groupBy(query);
  }

  // --- Log Expiration ---

  expireLogs(): Promise<ExpirationResult> {
    return expireLogs(this.storage, this.config);
  }

  // --- Content Monitoring ---

  handleContentUrlChange(tenantId: string, targetGroupId: string, item: ContentItem): Promise<Redirect | null> {
    return handleContentUrlChange(this.storage, this.config, tenantId, targetGroupId, item);
  }

  // --- Import/Export ---

  importRedirects(sourceData: string, format: ImportFormat, targetGroupId: string): Promise<ImportResult> {
    return importRedirects(this.storage, sourceData, format, targetGroupId);
  }

  exportRedirects(redirects: Redirect[], format: ExportFormat): string {
    return exportRedirects(redirects, format);
  }

  exportRedirectLogsAsCsv(logs: RedirectLog[]): string {
    return exportRedirectLogsAsCsv(logs);
  }

  exportNotFoundLogsAsCsv(logs: NotFoundLog[]): string {
    return exportNotFoundLogsAsCsv(logs);
  }
}
