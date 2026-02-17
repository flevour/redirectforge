// src/types/enums.ts
var RedirectStatus = {
  enabled: "enabled",
  disabled: "disabled"
};
var TenantStatus = {
  active: "active",
  suspended: "suspended"
};
var QueryHandling = {
  ignore: "ignore",
  exact: "exact",
  pass: "pass",
  exact_order: "exact_order"
};
var MatchType = {
  url: "url",
  ip: "ip",
  user_agent: "user_agent",
  referrer: "referrer",
  login_status: "login_status",
  header: "header",
  cookie: "cookie",
  role: "role",
  server_variable: "server_variable",
  language: "language"
};
var ActionType = {
  redirect: "redirect",
  error: "error",
  nothing: "nothing",
  rewrite: "rewrite",
  random: "random"
};
var IpLogging = {
  full: "full",
  anonymized: "anonymized",
  none: "none"
};

// src/types/config.ts
var DEFAULT_CONFIG = {
  redirect_log_retention_days: 0,
  not_found_log_retention_days: 0,
  track_hits: true,
  log_request_headers: false,
  ip_logging: "full",
  ip_header_priority: ["X-Forwarded-For"],
  trusted_proxy_ranges: [],
  log_cleanup_batch_size: 2e4,
  aggressive_cleanup_threshold: 1e5,
  aggressive_cleanup_batch_size: 5e4,
  monitor_content_types: /* @__PURE__ */ new Set()
};

// src/types/errors.ts
var RedirectForgeError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "RedirectForgeError";
  }
};
var NotFoundError = class extends RedirectForgeError {
  constructor(entity, id) {
    super(`${entity} not found: ${id}`);
    this.name = "NotFoundError";
  }
};
var PreconditionError = class extends RedirectForgeError {
  constructor(message) {
    super(message);
    this.name = "PreconditionError";
  }
};
var ValidationError = class extends RedirectForgeError {
  field;
  constructor(message, field) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
};

export {
  RedirectStatus,
  TenantStatus,
  QueryHandling,
  MatchType,
  ActionType,
  IpLogging,
  DEFAULT_CONFIG,
  RedirectForgeError,
  NotFoundError,
  PreconditionError,
  ValidationError
};
//# sourceMappingURL=chunk-DMSUCQMX.js.map