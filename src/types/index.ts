export {
  RedirectStatus,
  TenantStatus,
  QueryHandling,
  MatchType,
  ActionType,
  IpLogging,
} from './enums.js';

export type { HttpRequest, ContentItem, User } from './external.js';

export type {
  SourceFlags,
  Tenant,
  TenantHost,
  Group,
  Redirect,
  RedirectLog,
  NotFoundLog,
} from './entities.js';

export type { RedirectForgeConfig } from './config.js';
export { DEFAULT_CONFIG } from './config.js';

export type {
  ActionResult,
  ProcessResult,
  UrlMatchResult,
  ConditionEvaluation,
} from './results.js';

export type {
  LogFilterOperator,
  LogFilter,
  LogQuery,
  LogGroupQuery,
  LogGroupResult,
  PaginatedResult,
} from './query.js';

export {
  RedirectForgeError,
  NotFoundError,
  PreconditionError,
  ValidationError,
} from './errors.js';
