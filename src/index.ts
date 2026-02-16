// ============================================================
// Tier 1: Consumer API
// ============================================================

export { RedirectForge } from './redirectforge.js';
export type { RedirectForgeOptions } from './redirectforge.js';
export { createMemoryStorage } from './memory/memory-storage-adapter.js';

// Types & Enums
export {
  RedirectStatus,
  TenantStatus,
  QueryHandling,
  MatchType,
  ActionType,
  IpLogging,
} from './types/index.js';

export type {
  HttpRequest,
  ContentItem,
  User,
  SourceFlags,
  Tenant,
  TenantHost,
  Group,
  Redirect,
  RedirectLog,
  NotFoundLog,
} from './types/index.js';

// Config
export type { RedirectForgeConfig } from './types/index.js';
export { DEFAULT_CONFIG } from './types/index.js';

// Results
export type {
  ActionResult,
  ProcessResult,
  UrlMatchResult,
  ConditionEvaluation,
} from './types/index.js';

// Query
export type {
  LogFilterOperator,
  LogFilter,
  LogQuery,
  LogGroupQuery,
  LogGroupResult,
  PaginatedResult,
} from './types/index.js';

// Errors
export {
  RedirectForgeError,
  NotFoundError,
  PreconditionError,
  ValidationError,
} from './types/index.js';

// Operation input types
export type { CreateRedirectInput, UpdateRedirectInput } from './operations/redirect-ops.js';
export type { ImportFormat, ImportResult, ImportRecord, ParseResult, ParseError } from './import/types.js';
export type { ExportFormat, ExportOptions } from './export/types.js';
export type { ExpirationResult } from './operations/log-expiration.js';

// ============================================================
// Tier 2: Storage Implementor API
// ============================================================

export type {
  StorageAdapter,
  TenantRepository,
  TenantHostRepository,
  GroupRepository,
  RedirectRepository,
  RedirectWithGroupPosition,
  RedirectLogRepository,
  NotFoundLogRepository,
} from './repositories/index.js';

// ============================================================
// Tier 3: Advanced — Pipeline Composition
// ============================================================

export { findRedirect } from './matching/pipeline.js';
export type { PipelineMatch } from './matching/pipeline.js';
export { evaluateUrlPattern } from './matching/url-pattern.js';
export { evaluateCondition } from './matching/conditions.js';
export { resolveTarget, applyQueryHandling } from './matching/target-resolver.js';
