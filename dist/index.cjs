"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ActionType: () => ActionType,
  DEFAULT_CONFIG: () => DEFAULT_CONFIG,
  IpLogging: () => IpLogging,
  MatchType: () => MatchType,
  NotFoundError: () => NotFoundError,
  PreconditionError: () => PreconditionError,
  QueryHandling: () => QueryHandling,
  RedirectForge: () => RedirectForge,
  RedirectForgeError: () => RedirectForgeError,
  RedirectStatus: () => RedirectStatus,
  TenantStatus: () => TenantStatus,
  ValidationError: () => ValidationError,
  applyQueryHandling: () => applyQueryHandling,
  createMemoryStorage: () => createMemoryStorage,
  evaluateCondition: () => evaluateCondition,
  evaluateUrlPattern: () => evaluateUrlPattern,
  findRedirect: () => findRedirect,
  resolveTarget: () => resolveTarget
});
module.exports = __toCommonJS(index_exports);

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

// src/matching/helpers/regex.ts
function safeRegex(pattern, flags) {
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}
function regexMatch(pattern, subject, caseInsensitive) {
  const flags = caseInsensitive ? "i" : "";
  const re = safeRegex(pattern, flags);
  if (!re) {
    return { matched: false, captured_groups: [] };
  }
  const match = re.exec(subject);
  if (!match) {
    return { matched: false, captured_groups: [] };
  }
  return {
    matched: true,
    captured_groups: match.slice(1).map((g) => g ?? "")
  };
}
function regexTest(pattern, subject) {
  const re = safeRegex(pattern, "i");
  if (!re) return false;
  return re.test(subject);
}
function regexSubstitute(template, capturedGroups) {
  return template.replace(/\$(\d+)/g, (_, index) => {
    const i = parseInt(index, 10) - 1;
    return i >= 0 && i < capturedGroups.length ? capturedGroups[i] : "";
  });
}

// src/matching/url-pattern.ts
function extractPath(url) {
  const qIdx = url.indexOf("?");
  return qIdx === -1 ? url : url.slice(0, qIdx);
}
function extractQuery(url) {
  const qIdx = url.indexOf("?");
  return qIdx === -1 ? null : url.slice(qIdx + 1);
}
function normalizePath(path, caseInsensitive, ignoreTrailingSlash) {
  let normalized = path;
  if (caseInsensitive) {
    normalized = normalized.toLowerCase();
  }
  if (ignoreTrailingSlash && normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}
function queryMatches(sourceQuery, requestQuery, queryHandling) {
  switch (queryHandling) {
    case "ignore":
    case "pass":
      return true;
    case "exact": {
      if (!sourceQuery && !requestQuery) return true;
      if (!sourceQuery || !requestQuery) return sourceQuery === requestQuery;
      const sortParams = (q) => q.split("&").sort().join("&");
      return sortParams(sourceQuery) === sortParams(requestQuery);
    }
    case "exact_order":
      return (sourceQuery ?? "") === (requestQuery ?? "");
    default:
      return true;
  }
}
function evaluateUrlPattern(redirect, requestUrl) {
  if (redirect.source_flags.is_regex) {
    return regexMatch(
      redirect.source_url,
      requestUrl,
      redirect.source_flags.case_insensitive
    );
  }
  const sourcePath = extractPath(redirect.source_url);
  const requestPath = extractPath(requestUrl);
  const { case_insensitive, ignore_trailing_slash, query_handling } = redirect.source_flags;
  const normSource = normalizePath(sourcePath, case_insensitive, ignore_trailing_slash);
  const normRequest = normalizePath(requestPath, case_insensitive, ignore_trailing_slash);
  if (normSource !== normRequest) {
    return { matched: false, captured_groups: [] };
  }
  const sourceQuery = extractQuery(redirect.source_url);
  const requestQuery = extractQuery(requestUrl);
  if (!queryMatches(sourceQuery, requestQuery, query_handling)) {
    return { matched: false, captured_groups: [] };
  }
  return { matched: true, captured_groups: [] };
}

// src/matching/helpers/ip.ts
function parseIpList(csv) {
  if (!csv) return [];
  return csv.split(",").map((s) => s.trim()).filter(Boolean);
}
function parseIpv4(ip) {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return null;
  return nums;
}
function ipv4ToNumber(parts) {
  return (parts[0] << 24 | parts[1] << 16 | parts[2] << 8 | parts[3]) >>> 0;
}
function matchCidr(ip, cidr) {
  const [network, prefixStr] = cidr.split("/");
  const prefix = parseInt(prefixStr, 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;
  const ipParts = parseIpv4(ip);
  const networkParts = parseIpv4(network);
  if (!ipParts || !networkParts) return false;
  const ipNum = ipv4ToNumber(ipParts);
  const netNum = ipv4ToNumber(networkParts);
  const mask = prefix === 0 ? 0 : ~0 << 32 - prefix >>> 0;
  return (ipNum & mask) === (netNum & mask);
}
function ipInList(ip, list) {
  for (const entry of list) {
    if (entry.includes("/")) {
      if (matchCidr(ip, entry)) return true;
    } else if (ip === entry) {
      return true;
    }
  }
  return false;
}
function anonymizeIp(ip) {
  const parts = ip.split(".");
  if (parts.length === 4) {
    parts[3] = "0";
    return parts.join(".");
  }
  const segments = ip.split(":");
  if (segments.length > 1) {
    segments[segments.length - 1] = "0";
    return segments.join(":");
  }
  return ip;
}

// src/matching/helpers/locale.ts
function parseAcceptLanguage(header) {
  if (!header) return [];
  return header.split(",").map((part) => {
    const [tag, ...params] = part.trim().split(";");
    let quality = 1;
    for (const p of params) {
      const match = p.trim().match(/^q=(\d+(?:\.\d+)?)$/);
      if (match) {
        quality = parseFloat(match[1]);
      }
    }
    return { tag: tag.trim().toLowerCase(), quality };
  }).filter((l) => l.quality > 0).sort((a, b) => b.quality - a.quality);
}
function localeMatches(acceptLanguage, targetLocale) {
  const languages = parseAcceptLanguage(acceptLanguage);
  const target = targetLocale.toLowerCase();
  for (const { tag } of languages) {
    if (tag === target) return true;
    if (tag.startsWith(target + "-") || target.startsWith(tag + "-")) return true;
  }
  return false;
}

// src/matching/helpers/header-spec.ts
function parseHeaderSpec(nameValue) {
  if (!nameValue) return { name: "", value: "" };
  const idx = nameValue.indexOf(":");
  if (idx === -1) return { name: nameValue.trim(), value: "" };
  return {
    name: nameValue.slice(0, idx).trim(),
    value: nameValue.slice(idx + 1).trim()
  };
}

// src/matching/conditions.ts
function containsInsensitive(haystack, needle) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}
function evaluateIp(redirect, request) {
  const ipList = parseIpList(redirect.match_value);
  return request.client_ip ? ipInList(request.client_ip, ipList) : false;
}
function evaluateUserAgent(redirect, request) {
  const ua = request.user_agent ?? "";
  if (redirect.match_is_regex) {
    return regexTest(redirect.match_value ?? "", ua);
  }
  return containsInsensitive(ua, redirect.match_value ?? "");
}
function evaluateReferrer(redirect, request) {
  const ref = request.referrer ?? "";
  if (redirect.match_is_regex) {
    return regexTest(redirect.match_value ?? "", ref);
  }
  return containsInsensitive(ref, redirect.match_value ?? "");
}
function evaluateLoginStatus(_redirect, request) {
  return request.is_authenticated;
}
function evaluateHeader(redirect, request) {
  const spec = parseHeaderSpec(redirect.match_value);
  const actual = request.headers?.[spec.name.toLowerCase()] ?? request.headers?.[spec.name];
  if (redirect.match_is_regex) {
    return regexTest(spec.value, actual ?? "");
  }
  return actual === spec.value;
}
function evaluateCookie(redirect, request) {
  const spec = parseHeaderSpec(redirect.match_value);
  const actual = request.cookies?.[spec.name];
  if (redirect.match_is_regex) {
    return regexTest(spec.value, actual ?? "");
  }
  return actual === spec.value;
}
function evaluateRole(redirect, request) {
  return request.is_authenticated && request.user_role === redirect.match_value;
}
function evaluateServerVariable(redirect, request) {
  const spec = parseHeaderSpec(redirect.match_value);
  const actual = request.server_variables?.[spec.name];
  return actual === spec.value;
}
function evaluateLanguage(redirect, request) {
  return localeMatches(request.accept_language, redirect.match_value ?? "");
}
function evaluateCondition(redirect, request) {
  switch (redirect.match_type) {
    case MatchType.url:
      return { checked: false, matched: true };
    case MatchType.ip:
      return { checked: true, matched: evaluateIp(redirect, request) };
    case MatchType.user_agent:
      return { checked: true, matched: evaluateUserAgent(redirect, request) };
    case MatchType.referrer:
      return { checked: true, matched: evaluateReferrer(redirect, request) };
    case MatchType.login_status:
      return { checked: true, matched: evaluateLoginStatus(redirect, request) };
    case MatchType.header:
      return { checked: true, matched: evaluateHeader(redirect, request) };
    case MatchType.cookie:
      return { checked: true, matched: evaluateCookie(redirect, request) };
    case MatchType.role:
      return { checked: true, matched: evaluateRole(redirect, request) };
    case MatchType.server_variable:
      return { checked: true, matched: evaluateServerVariable(redirect, request) };
    case MatchType.language:
      return { checked: true, matched: evaluateLanguage(redirect, request) };
    default:
      return { checked: false, matched: true };
  }
}

// src/matching/target-resolver.ts
function applyQueryHandling(targetUrl, requestUrl, queryHandling) {
  switch (queryHandling) {
    case "ignore": {
      const qIdx = targetUrl.indexOf("?");
      return qIdx === -1 ? targetUrl : targetUrl.slice(0, qIdx);
    }
    case "pass": {
      const requestQuery = extractQuery(requestUrl);
      if (!requestQuery) return targetUrl;
      const separator = targetUrl.includes("?") ? "&" : "?";
      return targetUrl + separator + requestQuery;
    }
    case "exact":
    case "exact_order":
    default:
      return targetUrl;
  }
}
function selectRawTarget(redirect, condition) {
  if (redirect.match_type === MatchType.url) {
    return redirect.target_url ?? null;
  }
  if (condition.matched) {
    return redirect.target_url ?? null;
  }
  return redirect.alternate_target_url ?? null;
}
function resolveTarget(redirect, requestUrl, urlResult, condition) {
  const rawTarget = selectRawTarget(redirect, condition);
  if (rawTarget === null) return null;
  let substituted = rawTarget;
  if (redirect.source_flags.is_regex) {
    substituted = regexSubstitute(rawTarget, urlResult.captured_groups);
  }
  return applyQueryHandling(
    substituted,
    requestUrl,
    redirect.source_flags.query_handling
  );
}

// src/matching/pipeline.ts
function findRedirect(candidates, request) {
  for (const candidate of candidates) {
    const urlResult = evaluateUrlPattern(candidate, request.url);
    if (!urlResult.matched) continue;
    const condition = evaluateCondition(candidate, request);
    const target = resolveTarget(candidate, request.url, urlResult, condition);
    if (target === null) continue;
    return { redirect: candidate, target };
  }
  return null;
}

// src/engine/action-executor.ts
function executeAction(redirect, target, request) {
  switch (redirect.action_type) {
    case ActionType.redirect:
      return { type: "redirect", url: target, code: redirect.action_code };
    case ActionType.error:
      return { type: "error", code: redirect.action_code };
    case ActionType.rewrite:
      return { type: "rewrite", original_url: request.url, target_url: target };
    case ActionType.random: {
      if (redirect.random_targets.length === 0) {
        return { type: "nothing" };
      }
      const idx = Math.floor(Math.random() * redirect.random_targets.length);
      return { type: "random_redirect", url: redirect.random_targets[idx], code: redirect.action_code };
    }
    case ActionType.nothing:
      return { type: "nothing" };
    default:
      return { type: "pass" };
  }
}

// src/engine/hit-tracker.ts
async function trackHit(storage, config, redirect) {
  if (!config.track_hits) return;
  await storage.redirects.incrementHitCount(redirect.id, /* @__PURE__ */ new Date());
}

// src/engine/ip-anonymizer.ts
function captureIp(clientIp, mode) {
  if (!clientIp) return void 0;
  switch (mode) {
    case "full":
      return clientIp;
    case "anonymized":
      return anonymizeIp(clientIp);
    case "none":
      return void 0;
  }
}

// src/engine/logger.ts
function serializeHeaders(request) {
  if (!request.headers) return void 0;
  return JSON.stringify(request.headers);
}
async function logRedirect(storage, config, request, redirect, target, tenantId) {
  if (redirect.log_excluded) return;
  const ip = captureIp(request.client_ip, config.ip_logging);
  const headers = config.log_request_headers ? serializeHeaders(request) : void 0;
  await storage.redirectLogs.create({
    tenant_id: tenantId,
    redirect_id: redirect.id,
    created_at: /* @__PURE__ */ new Date(),
    source_url: request.url,
    target_url: target,
    domain: request.domain,
    ip,
    http_code: redirect.action_code,
    user_agent: request.user_agent,
    referrer: request.referrer,
    request_method: request.method,
    request_headers: headers,
    redirect_source: "redirection"
  });
}
async function logNotFound(storage, config, request, tenantId) {
  const ip = captureIp(request.client_ip, config.ip_logging);
  const headers = config.log_request_headers ? serializeHeaders(request) : void 0;
  await storage.notFoundLogs.create({
    tenant_id: tenantId,
    created_at: /* @__PURE__ */ new Date(),
    url: request.url,
    domain: request.domain,
    ip,
    user_agent: request.user_agent,
    referrer: request.referrer,
    request_method: request.method,
    request_headers: headers
  });
}

// src/engine/processor.ts
var PASS_RESULT = { action: { type: "pass" } };
async function processRequest(storage, config, request) {
  const host = await storage.tenantHosts.findByHostname(request.domain);
  if (!host || host.status !== "enabled") return PASS_RESULT;
  const tenant = await storage.tenants.findById(host.tenant_id);
  if (!tenant || tenant.status !== "active") return PASS_RESULT;
  const candidates = await storage.redirects.findActiveByTenantId(tenant.id);
  const match = findRedirect(candidates, request);
  if (!match) {
    if (request.response_code === 404) {
      await logNotFound(storage, config, request, tenant.id);
    }
    return PASS_RESULT;
  }
  const action = executeAction(match.redirect, match.target, request);
  await trackHit(storage, config, match.redirect);
  await logRedirect(storage, config, request, match.redirect, match.target, tenant.id);
  return {
    action,
    redirect_id: match.redirect.id,
    tenant_id: tenant.id
  };
}

// src/operations/tenant-ops.ts
async function createTenant(storage, name) {
  return storage.tenants.create({ name, status: "active" });
}
async function suspendTenant(storage, tenantId) {
  const tenant = await storage.tenants.findById(tenantId);
  if (!tenant) throw new NotFoundError("Tenant", tenantId);
  if (tenant.status !== "active") {
    throw new PreconditionError("Tenant must be active to suspend");
  }
  return storage.tenants.update(tenantId, { status: "suspended" });
}
async function activateTenant(storage, tenantId) {
  const tenant = await storage.tenants.findById(tenantId);
  if (!tenant) throw new NotFoundError("Tenant", tenantId);
  if (tenant.status !== "suspended") {
    throw new PreconditionError("Tenant must be suspended to activate");
  }
  return storage.tenants.update(tenantId, { status: "active" });
}

// src/operations/host-ops.ts
async function addHost(storage, tenantId, hostname, environment) {
  const tenant = await storage.tenants.findById(tenantId);
  if (!tenant) throw new NotFoundError("Tenant", tenantId);
  if (tenant.status !== "active") {
    throw new PreconditionError("Tenant must be active to add host");
  }
  const existing = await storage.tenantHosts.findByHostname(hostname);
  if (existing) {
    throw new PreconditionError(`Hostname already registered: ${hostname}`);
  }
  return storage.tenantHosts.create({
    tenant_id: tenantId,
    hostname,
    environment,
    status: "enabled"
  });
}
async function removeHost(storage, hostId) {
  const host = await storage.tenantHosts.findById(hostId);
  if (!host) throw new NotFoundError("TenantHost", hostId);
  const allHosts = await storage.tenantHosts.findByTenantId(host.tenant_id);
  const activeHosts = allHosts.filter((h) => h.status === "enabled");
  if (activeHosts.length <= 1 && host.status === "enabled") {
    throw new PreconditionError("Cannot remove last active host");
  }
  await storage.tenantHosts.delete(hostId);
}
async function enableHost(storage, hostId) {
  const host = await storage.tenantHosts.findById(hostId);
  if (!host) throw new NotFoundError("TenantHost", hostId);
  if (host.status !== "disabled") {
    throw new PreconditionError("Host must be disabled to enable");
  }
  return storage.tenantHosts.update(hostId, { status: "enabled" });
}
async function disableHost(storage, hostId) {
  const host = await storage.tenantHosts.findById(hostId);
  if (!host) throw new NotFoundError("TenantHost", hostId);
  if (host.status !== "enabled") {
    throw new PreconditionError("Host must be enabled to disable");
  }
  return storage.tenantHosts.update(hostId, { status: "disabled" });
}

// src/operations/group-ops.ts
async function createGroup(storage, tenantId, name) {
  const tenant = await storage.tenants.findById(tenantId);
  if (!tenant) throw new NotFoundError("Tenant", tenantId);
  if (tenant.status !== "active") {
    throw new PreconditionError("Tenant must be active to create group");
  }
  const position = await storage.groups.countByTenantId(tenantId);
  return storage.groups.create({
    tenant_id: tenantId,
    name,
    status: "enabled",
    position
  });
}
async function enableGroup(storage, groupId) {
  const group = await storage.groups.findById(groupId);
  if (!group) throw new NotFoundError("Group", groupId);
  if (group.status !== "disabled") {
    throw new PreconditionError("Group must be disabled to enable");
  }
  const redirects = await storage.redirects.findByGroupId(groupId);
  const ids = redirects.map((r) => r.id);
  if (ids.length > 0) {
    await storage.redirects.updateManyStatus(ids, "enabled");
  }
  return storage.groups.update(groupId, { status: "enabled" });
}
async function disableGroup(storage, groupId) {
  const group = await storage.groups.findById(groupId);
  if (!group) throw new NotFoundError("Group", groupId);
  if (group.status !== "enabled") {
    throw new PreconditionError("Group must be enabled to disable");
  }
  const redirects = await storage.redirects.findByGroupId(groupId);
  const ids = redirects.map((r) => r.id);
  if (ids.length > 0) {
    await storage.redirects.updateManyStatus(ids, "disabled");
  }
  return storage.groups.update(groupId, { status: "disabled" });
}
async function deleteGroup(storage, groupId) {
  const group = await storage.groups.findById(groupId);
  if (!group) throw new NotFoundError("Group", groupId);
  await storage.redirects.deleteByGroupId(groupId);
  await storage.groups.delete(groupId);
}

// src/operations/redirect-ops.ts
async function createRedirect(storage, input) {
  const position = await storage.redirects.countByGroupId(input.group_id);
  return storage.redirects.create({
    group_id: input.group_id,
    position,
    source_url: input.source_url,
    source_flags: input.source_flags,
    match_type: input.match_type,
    match_value: input.match_value,
    match_is_regex: input.match_is_regex ?? false,
    target_url: input.target_url,
    alternate_target_url: input.alternate_target_url,
    action_type: input.action_type,
    action_code: input.action_code,
    random_targets: input.random_targets ?? [],
    title: input.title,
    status: "enabled",
    hit_count: 0,
    log_excluded: input.log_excluded ?? false
  });
}
async function updateRedirect(storage, redirectId, input) {
  const existing = await storage.redirects.findById(redirectId);
  if (!existing) throw new NotFoundError("Redirect", redirectId);
  return storage.redirects.update(redirectId, {
    source_url: input.source_url ?? existing.source_url,
    source_flags: input.source_flags ?? existing.source_flags,
    match_type: input.match_type ?? existing.match_type,
    match_value: input.match_value ?? existing.match_value,
    match_is_regex: input.match_is_regex ?? existing.match_is_regex,
    target_url: input.target_url ?? existing.target_url,
    alternate_target_url: input.alternate_target_url ?? existing.alternate_target_url,
    action_type: input.action_type ?? existing.action_type,
    action_code: input.action_code ?? existing.action_code,
    group_id: input.group_id ?? existing.group_id,
    title: input.title ?? existing.title,
    random_targets: input.random_targets ?? existing.random_targets,
    log_excluded: input.log_excluded ?? existing.log_excluded
  });
}
async function enableRedirect(storage, redirectId) {
  const redirect = await storage.redirects.findById(redirectId);
  if (!redirect) throw new NotFoundError("Redirect", redirectId);
  if (redirect.status !== "disabled") {
    throw new PreconditionError("Redirect must be disabled to enable");
  }
  return storage.redirects.update(redirectId, { status: "enabled" });
}
async function disableRedirect(storage, redirectId) {
  const redirect = await storage.redirects.findById(redirectId);
  if (!redirect) throw new NotFoundError("Redirect", redirectId);
  if (redirect.status !== "enabled") {
    throw new PreconditionError("Redirect must be enabled to disable");
  }
  return storage.redirects.update(redirectId, { status: "disabled" });
}
async function deleteRedirect(storage, redirectId) {
  await storage.redirects.delete(redirectId);
}
async function resetRedirectHits(storage, redirectId) {
  const redirect = await storage.redirects.findById(redirectId);
  if (!redirect) throw new NotFoundError("Redirect", redirectId);
  await storage.redirects.resetHitCount(redirectId);
}

// src/operations/bulk-ops.ts
async function bulkDeleteRedirects(storage, ids) {
  await storage.redirects.deleteMany(ids);
}
async function bulkSetRedirectStatus(storage, ids, status) {
  await storage.redirects.updateManyStatus(ids, status);
}
async function bulkDeleteRedirectLogs(storage, ids) {
  await storage.redirectLogs.deleteMany(ids);
}
async function bulkDeleteNotFoundLogs(storage, ids) {
  await storage.notFoundLogs.deleteMany(ids);
}
async function deleteAllTenantRedirectLogs(storage, tenantId) {
  await storage.redirectLogs.deleteByTenantId(tenantId);
}
async function deleteAllTenantNotFoundLogs(storage, tenantId) {
  await storage.notFoundLogs.deleteByTenantId(tenantId);
}

// src/operations/content-monitor.ts
async function handleContentUrlChange(storage, config, tenantId, targetGroupId, item) {
  if (!item.previous_url) return null;
  if (item.previous_url === item.current_url) return null;
  if (!config.monitor_content_types.has(item.content_type)) return null;
  const position = await storage.redirects.countByGroupId(targetGroupId);
  return storage.redirects.create({
    group_id: targetGroupId,
    position,
    source_url: item.previous_url,
    source_flags: {
      case_insensitive: false,
      ignore_trailing_slash: false,
      query_handling: "exact",
      is_regex: false
    },
    match_type: "url",
    match_value: void 0,
    match_is_regex: false,
    target_url: item.current_url,
    alternate_target_url: void 0,
    action_type: "redirect",
    action_code: 301,
    random_targets: [],
    title: void 0,
    status: "enabled",
    hit_count: 0,
    log_excluded: false
  });
}

// src/operations/log-expiration.ts
async function expireLogs(storage, config) {
  const result = {
    redirect_logs: { deleted: 0, hasMore: false },
    not_found_logs: { deleted: 0, hasMore: false }
  };
  if (config.redirect_log_retention_days > 0) {
    const cutoff = /* @__PURE__ */ new Date();
    cutoff.setDate(cutoff.getDate() - config.redirect_log_retention_days);
    const count = await storage.redirectLogs.countExpired(cutoff);
    if (count > 0) {
      const batchSize = count > config.aggressive_cleanup_threshold ? config.aggressive_cleanup_batch_size : config.log_cleanup_batch_size;
      result.redirect_logs = await storage.redirectLogs.deleteExpiredBatch(cutoff, batchSize);
    }
  }
  if (config.not_found_log_retention_days > 0) {
    const cutoff = /* @__PURE__ */ new Date();
    cutoff.setDate(cutoff.getDate() - config.not_found_log_retention_days);
    const count = await storage.notFoundLogs.countExpired(cutoff);
    if (count > 0) {
      const batchSize = count > config.aggressive_cleanup_threshold ? config.aggressive_cleanup_batch_size : config.log_cleanup_batch_size;
      result.not_found_logs = await storage.notFoundLogs.deleteExpiredBatch(cutoff, batchSize);
    }
  }
  return result;
}

// src/import/parser-json.ts
var VALID_MATCH_TYPES = new Set(Object.values(MatchType));
var VALID_ACTION_TYPES = new Set(Object.values(ActionType));
var VALID_QUERY_HANDLING = new Set(Object.values(QueryHandling));
function validateRecord(raw, index) {
  if (!raw.source_url || typeof raw.source_url !== "string") {
    return { row: index, message: "Missing or invalid source_url" };
  }
  const matchType = raw.match_type ?? "url";
  if (!VALID_MATCH_TYPES.has(matchType)) {
    return { row: index, message: `Invalid match_type: ${matchType}` };
  }
  const actionType = raw.action_type ?? "redirect";
  if (!VALID_ACTION_TYPES.has(actionType)) {
    return { row: index, message: `Invalid action_type: ${actionType}` };
  }
  const queryHandling = raw.source_flags?.query_handling ?? raw.query_handling ?? "exact";
  if (!VALID_QUERY_HANDLING.has(queryHandling)) {
    return { row: index, message: `Invalid query_handling: ${queryHandling}` };
  }
  return {
    source_url: raw.source_url,
    source_flags: {
      case_insensitive: raw.source_flags?.case_insensitive ?? raw.case_insensitive ?? false,
      ignore_trailing_slash: raw.source_flags?.ignore_trailing_slash ?? raw.ignore_trailing_slash ?? false,
      query_handling: queryHandling,
      is_regex: raw.source_flags?.is_regex ?? raw.is_regex ?? false
    },
    match_type: matchType,
    match_value: raw.match_value,
    match_is_regex: raw.match_is_regex ?? false,
    target_url: raw.target_url,
    alternate_target_url: raw.alternate_target_url,
    action_type: actionType,
    action_code: raw.action_code ?? 301,
    random_targets: raw.random_targets ?? [],
    title: raw.title
  };
}
function parseJson(source) {
  const records = [];
  const errors = [];
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch {
    return { records: [], errors: [{ row: 0, message: "Invalid JSON" }] };
  }
  if (!Array.isArray(parsed)) {
    return { records: [], errors: [{ row: 0, message: "Expected JSON array" }] };
  }
  for (let i = 0; i < parsed.length; i++) {
    const result = validateRecord(parsed[i], i);
    if ("message" in result) {
      errors.push(result);
    } else {
      records.push(result);
    }
  }
  return { records, errors };
}

// src/import/parser-csv.ts
function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}
function parseCsv(source) {
  const records = [];
  const errors = [];
  const lines = source.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { records: [], errors: [] };
  }
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const colIdx = (name) => header.indexOf(name);
  const srcIdx = colIdx("source_url");
  const tgtIdx = colIdx("target_url");
  const actionTypeIdx = colIdx("action_type");
  const actionCodeIdx = colIdx("action_code");
  const matchTypeIdx = colIdx("match_type");
  const titleIdx = colIdx("title");
  if (srcIdx === -1) {
    return { records: [], errors: [{ row: 0, message: "Missing source_url column in header" }] };
  }
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const sourceUrl = fields[srcIdx];
    if (!sourceUrl) {
      errors.push({ row: i, message: "Empty source_url" });
      continue;
    }
    records.push({
      source_url: sourceUrl,
      source_flags: {
        case_insensitive: false,
        ignore_trailing_slash: false,
        query_handling: "exact",
        is_regex: false
      },
      match_type: fields[matchTypeIdx] || "url",
      match_is_regex: false,
      target_url: tgtIdx !== -1 ? fields[tgtIdx] || void 0 : void 0,
      action_type: fields[actionTypeIdx] || "redirect",
      action_code: actionCodeIdx !== -1 ? parseInt(fields[actionCodeIdx], 10) || 301 : 301,
      random_targets: [],
      title: titleIdx !== -1 ? fields[titleIdx] || void 0 : void 0
    });
  }
  return { records, errors };
}

// src/import/importer.ts
async function importRedirects(storage, sourceData, format, targetGroupId) {
  const parseResult = format === "json" ? parseJson(sourceData) : parseCsv(sourceData);
  if (parseResult.records.length === 0) {
    return { created: 0, errors: parseResult.errors };
  }
  const existingCount = await storage.redirects.countByGroupId(targetGroupId);
  const createData = parseResult.records.map((record, i) => ({
    group_id: targetGroupId,
    position: existingCount + i,
    source_url: record.source_url,
    source_flags: record.source_flags,
    match_type: record.match_type,
    match_value: record.match_value,
    match_is_regex: record.match_is_regex,
    target_url: record.target_url,
    alternate_target_url: record.alternate_target_url,
    action_type: record.action_type,
    action_code: record.action_code,
    random_targets: record.random_targets,
    title: record.title,
    status: "enabled",
    hit_count: 0,
    log_excluded: false
  }));
  await storage.redirects.createMany(createData);
  return {
    created: parseResult.records.length,
    errors: parseResult.errors
  };
}

// src/export/exporter.ts
function escapeCsvField(value) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
function redirectToCsvRow(r) {
  return [
    escapeCsvField(r.source_url),
    escapeCsvField(r.target_url ?? ""),
    r.action_type,
    String(r.action_code),
    r.match_type,
    escapeCsvField(r.title ?? "")
  ].join(",");
}
function redirectToJsonObj(r) {
  return {
    source_url: r.source_url,
    target_url: r.target_url,
    alternate_target_url: r.alternate_target_url,
    source_flags: r.source_flags,
    match_type: r.match_type,
    match_value: r.match_value,
    match_is_regex: r.match_is_regex,
    action_type: r.action_type,
    action_code: r.action_code,
    random_targets: r.random_targets.length > 0 ? r.random_targets : void 0,
    title: r.title
  };
}
function exportRedirects(redirects, format) {
  if (format === "json") {
    return JSON.stringify(redirects.map(redirectToJsonObj), null, 2);
  }
  const header = "source_url,target_url,action_type,action_code,match_type,title";
  const rows = redirects.map(redirectToCsvRow);
  return [header, ...rows].join("\n");
}
function exportRedirectLogsAsCsv(logs) {
  const header = "created_at,source_url,target_url,domain,ip,http_code,user_agent,referrer,request_method";
  const rows = logs.map(
    (l) => [
      l.created_at.toISOString(),
      escapeCsvField(l.source_url),
      escapeCsvField(l.target_url ?? ""),
      escapeCsvField(l.domain ?? ""),
      l.ip ?? "",
      String(l.http_code),
      escapeCsvField(l.user_agent ?? ""),
      escapeCsvField(l.referrer ?? ""),
      l.request_method ?? ""
    ].join(",")
  );
  return [header, ...rows].join("\n");
}
function exportNotFoundLogsAsCsv(logs) {
  const header = "created_at,url,domain,ip,user_agent,referrer,request_method";
  const rows = logs.map(
    (l) => [
      l.created_at.toISOString(),
      escapeCsvField(l.url),
      escapeCsvField(l.domain ?? ""),
      l.ip ?? "",
      escapeCsvField(l.user_agent ?? ""),
      escapeCsvField(l.referrer ?? ""),
      l.request_method ?? ""
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

// src/redirectforge.ts
var RedirectForge = class {
  storage;
  config;
  constructor(options) {
    this.storage = options.storage;
    this.config = { ...DEFAULT_CONFIG, ...options.config };
    if (options.config?.monitor_content_types) {
      this.config.monitor_content_types = new Set(options.config.monitor_content_types);
    }
  }
  // --- Request Processing ---
  processRequest(request) {
    return processRequest(this.storage, this.config, request);
  }
  // --- Tenant Lifecycle ---
  createTenant(name) {
    return createTenant(this.storage, name);
  }
  suspendTenant(tenantId) {
    return suspendTenant(this.storage, tenantId);
  }
  activateTenant(tenantId) {
    return activateTenant(this.storage, tenantId);
  }
  // --- Host Management ---
  addHost(tenantId, hostname, environment) {
    return addHost(this.storage, tenantId, hostname, environment);
  }
  removeHost(hostId) {
    return removeHost(this.storage, hostId);
  }
  enableHost(hostId) {
    return enableHost(this.storage, hostId);
  }
  disableHost(hostId) {
    return disableHost(this.storage, hostId);
  }
  // --- Group Management ---
  createGroup(tenantId, name) {
    return createGroup(this.storage, tenantId, name);
  }
  enableGroup(groupId) {
    return enableGroup(this.storage, groupId);
  }
  disableGroup(groupId) {
    return disableGroup(this.storage, groupId);
  }
  deleteGroup(groupId) {
    return deleteGroup(this.storage, groupId);
  }
  // --- Redirect Management ---
  createRedirect(input) {
    return createRedirect(this.storage, input);
  }
  updateRedirect(redirectId, input) {
    return updateRedirect(this.storage, redirectId, input);
  }
  enableRedirect(redirectId) {
    return enableRedirect(this.storage, redirectId);
  }
  disableRedirect(redirectId) {
    return disableRedirect(this.storage, redirectId);
  }
  deleteRedirect(redirectId) {
    return deleteRedirect(this.storage, redirectId);
  }
  resetRedirectHits(redirectId) {
    return resetRedirectHits(this.storage, redirectId);
  }
  // --- Bulk Operations ---
  bulkDeleteRedirects(ids) {
    return bulkDeleteRedirects(this.storage, ids);
  }
  bulkSetRedirectStatus(ids, status) {
    return bulkSetRedirectStatus(this.storage, ids, status);
  }
  bulkDeleteRedirectLogs(ids) {
    return bulkDeleteRedirectLogs(this.storage, ids);
  }
  bulkDeleteNotFoundLogs(ids) {
    return bulkDeleteNotFoundLogs(this.storage, ids);
  }
  deleteAllTenantRedirectLogs(tenantId) {
    return deleteAllTenantRedirectLogs(this.storage, tenantId);
  }
  deleteAllTenantNotFoundLogs(tenantId) {
    return deleteAllTenantNotFoundLogs(this.storage, tenantId);
  }
  // --- Log Queries ---
  queryRedirectLogs(query) {
    return this.storage.redirectLogs.query(query);
  }
  groupRedirectLogs(query) {
    return this.storage.redirectLogs.groupBy(query);
  }
  queryNotFoundLogs(query) {
    return this.storage.notFoundLogs.query(query);
  }
  groupNotFoundLogs(query) {
    return this.storage.notFoundLogs.groupBy(query);
  }
  // --- Log Expiration ---
  expireLogs() {
    return expireLogs(this.storage, this.config);
  }
  // --- Content Monitoring ---
  handleContentUrlChange(tenantId, targetGroupId, item) {
    return handleContentUrlChange(this.storage, this.config, tenantId, targetGroupId, item);
  }
  // --- Import/Export ---
  importRedirects(sourceData, format, targetGroupId) {
    return importRedirects(this.storage, sourceData, format, targetGroupId);
  }
  exportRedirects(redirects, format) {
    return exportRedirects(redirects, format);
  }
  exportRedirectLogsAsCsv(logs) {
    return exportRedirectLogsAsCsv(logs);
  }
  exportNotFoundLogsAsCsv(logs) {
    return exportNotFoundLogsAsCsv(logs);
  }
};

// src/memory/memory-tenant.repository.ts
var MemoryTenantRepository = class {
  store = /* @__PURE__ */ new Map();
  nextId = 1;
  async findById(id) {
    return this.store.get(id);
  }
  async findAll() {
    return [...this.store.values()];
  }
  async create(data) {
    const id = String(this.nextId++);
    const tenant = { id, ...data };
    this.store.set(id, tenant);
    return tenant;
  }
  async update(id, data) {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Tenant not found: ${id}`);
    const updated = { ...existing, ...data };
    this.store.set(id, updated);
    return updated;
  }
  async delete(id) {
    this.store.delete(id);
  }
};

// src/memory/memory-tenant-host.repository.ts
var MemoryTenantHostRepository = class {
  store = /* @__PURE__ */ new Map();
  nextId = 1;
  async findById(id) {
    return this.store.get(id);
  }
  async findByHostname(hostname) {
    for (const host of this.store.values()) {
      if (host.hostname === hostname) return host;
    }
    return void 0;
  }
  async findByTenantId(tenantId) {
    return [...this.store.values()].filter((h) => h.tenant_id === tenantId);
  }
  async create(data) {
    const id = String(this.nextId++);
    const host = { id, ...data };
    this.store.set(id, host);
    return host;
  }
  async update(id, data) {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`TenantHost not found: ${id}`);
    const updated = { ...existing, ...data };
    this.store.set(id, updated);
    return updated;
  }
  async delete(id) {
    this.store.delete(id);
  }
};

// src/memory/memory-group.repository.ts
var MemoryGroupRepository = class {
  store = /* @__PURE__ */ new Map();
  nextId = 1;
  async findById(id) {
    return this.store.get(id);
  }
  async findByTenantId(tenantId) {
    return [...this.store.values()].filter((g) => g.tenant_id === tenantId).sort((a, b) => a.position - b.position);
  }
  async create(data) {
    const id = String(this.nextId++);
    const group = { id, ...data };
    this.store.set(id, group);
    return group;
  }
  async update(id, data) {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Group not found: ${id}`);
    const updated = { ...existing, ...data };
    this.store.set(id, updated);
    return updated;
  }
  async delete(id) {
    this.store.delete(id);
  }
  async countByTenantId(tenantId) {
    return [...this.store.values()].filter((g) => g.tenant_id === tenantId).length;
  }
};

// src/memory/memory-redirect.repository.ts
var MemoryRedirectRepository = class {
  store = /* @__PURE__ */ new Map();
  nextId = 1;
  groupRepo;
  constructor(groupRepo) {
    this.groupRepo = groupRepo;
  }
  async findById(id) {
    return this.store.get(id);
  }
  async findByGroupId(groupId) {
    return [...this.store.values()].filter((r) => r.group_id === groupId).sort((a, b) => a.position - b.position);
  }
  async findActiveByTenantId(tenantId) {
    const groups = await this.groupRepo.findByTenantId(tenantId);
    const activeGroupIds = /* @__PURE__ */ new Map();
    for (const g of groups) {
      if (g.status === "enabled") {
        activeGroupIds.set(g.id, g.position);
      }
    }
    const results = [];
    for (const r of this.store.values()) {
      if (r.status === "enabled" && activeGroupIds.has(r.group_id)) {
        results.push({
          ...r,
          group_position: activeGroupIds.get(r.group_id)
        });
      }
    }
    return results.sort(
      (a, b) => a.group_position - b.group_position || a.position - b.position
    );
  }
  async create(data) {
    const id = String(this.nextId++);
    const redirect = { id, ...data };
    this.store.set(id, redirect);
    return redirect;
  }
  async createMany(data) {
    return Promise.all(data.map((d) => this.create(d)));
  }
  async update(id, data) {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Redirect not found: ${id}`);
    const updated = { ...existing, ...data };
    this.store.set(id, updated);
    return updated;
  }
  async updateManyStatus(ids, status) {
    for (const id of ids) {
      const existing = this.store.get(id);
      if (existing) {
        this.store.set(id, { ...existing, status });
      }
    }
  }
  async delete(id) {
    this.store.delete(id);
  }
  async deleteMany(ids) {
    for (const id of ids) {
      this.store.delete(id);
    }
  }
  async deleteByGroupId(groupId) {
    for (const [id, r] of this.store) {
      if (r.group_id === groupId) this.store.delete(id);
    }
  }
  async incrementHitCount(id, lastHitAt) {
    const existing = this.store.get(id);
    if (!existing) return;
    this.store.set(id, {
      ...existing,
      hit_count: existing.hit_count + 1,
      last_hit_at: lastHitAt
    });
  }
  async resetHitCount(id) {
    const existing = this.store.get(id);
    if (!existing) return;
    this.store.set(id, {
      ...existing,
      hit_count: 0,
      last_hit_at: void 0
    });
  }
  async countByGroupId(groupId) {
    return [...this.store.values()].filter((r) => r.group_id === groupId).length;
  }
};

// src/memory/log-query-helpers.ts
function getField(record, field) {
  return record[field];
}
function matchesFilter(record, filter) {
  const actual = getField(record, filter.field);
  const expected = filter.value;
  switch (filter.operator) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "contains":
      return typeof actual === "string" && typeof expected === "string" ? actual.toLowerCase().includes(expected.toLowerCase()) : false;
    case "not_contains":
      return typeof actual === "string" && typeof expected === "string" ? !actual.toLowerCase().includes(expected.toLowerCase()) : true;
    case "gt":
      if (actual instanceof Date && expected instanceof Date) return actual > expected;
      return actual > expected;
    case "gte":
      if (actual instanceof Date && expected instanceof Date) return actual >= expected;
      return actual >= expected;
    case "lt":
      if (actual instanceof Date && expected instanceof Date) return actual < expected;
      return actual < expected;
    case "lte":
      if (actual instanceof Date && expected instanceof Date) return actual <= expected;
      return actual <= expected;
    default:
      return true;
  }
}
function applyFilters(items, filters) {
  if (!filters || filters.length === 0) return items;
  return items.filter((item) => filters.every((f) => matchesFilter(item, f)));
}
function applySort(items, sortBy, sortDir) {
  if (!sortBy) return items;
  const dir = sortDir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const va = getField(a, sortBy);
    const vb = getField(b, sortBy);
    if (va instanceof Date && vb instanceof Date) return (va.getTime() - vb.getTime()) * dir;
    if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb) * dir;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
    return 0;
  });
}
function paginate(items, page, perPage) {
  const p = Math.max(1, page ?? 1);
  const pp = Math.max(1, perPage ?? 50);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pp));
  const start = (p - 1) * pp;
  return {
    items: items.slice(start, start + pp),
    total,
    page: p,
    per_page: pp,
    total_pages: totalPages
  };
}
function queryItems(allItems, tenantIdField, query) {
  let items = allItems.filter((i) => getField(i, tenantIdField) === query.tenant_id);
  items = applyFilters(items, query.filters);
  items = applySort(items, query.sort_by ?? "created_at", query.sort_dir ?? "desc");
  return paginate(items, query.page, query.per_page);
}
function groupItems(allItems, tenantIdField, query) {
  let items = allItems.filter((i) => getField(i, tenantIdField) === query.tenant_id);
  items = applyFilters(items, query.filters);
  const counts = /* @__PURE__ */ new Map();
  for (const item of items) {
    const val = String(getField(item, query.group_by) ?? "");
    counts.set(val, (counts.get(val) ?? 0) + 1);
  }
  let results = [...counts.entries()].map(([value, count]) => ({ value, count }));
  if (query.sort_by === "field") {
    const dir = query.sort_dir === "asc" ? 1 : -1;
    results.sort((a, b) => a.value.localeCompare(b.value) * dir);
  } else {
    const dir = query.sort_dir === "asc" ? 1 : -1;
    results.sort((a, b) => (a.count - b.count) * dir);
  }
  return paginate(results, query.page, query.per_page);
}

// src/memory/memory-redirect-log.repository.ts
var MemoryRedirectLogRepository = class {
  store = /* @__PURE__ */ new Map();
  nextId = 1;
  async create(data) {
    const id = String(this.nextId++);
    const log = { id, ...data };
    this.store.set(id, log);
    return log;
  }
  async query(query) {
    return queryItems([...this.store.values()], "tenant_id", query);
  }
  async groupBy(query) {
    return groupItems([...this.store.values()], "tenant_id", query);
  }
  async deleteMany(ids) {
    for (const id of ids) this.store.delete(id);
  }
  async deleteByTenantId(tenantId) {
    for (const [id, log] of this.store) {
      if (log.tenant_id === tenantId) this.store.delete(id);
    }
  }
  async deleteExpiredBatch(cutoff, batchSize) {
    const expired = [];
    for (const [id, log] of this.store) {
      if (log.created_at < cutoff) expired.push(id);
    }
    const toDelete = expired.slice(0, batchSize);
    for (const id of toDelete) this.store.delete(id);
    return { deleted: toDelete.length, hasMore: expired.length > batchSize };
  }
  async countExpired(cutoff) {
    let count = 0;
    for (const log of this.store.values()) {
      if (log.created_at < cutoff) count++;
    }
    return count;
  }
};

// src/memory/memory-not-found-log.repository.ts
var MemoryNotFoundLogRepository = class {
  store = /* @__PURE__ */ new Map();
  nextId = 1;
  async create(data) {
    const id = String(this.nextId++);
    const log = { id, ...data };
    this.store.set(id, log);
    return log;
  }
  async query(query) {
    return queryItems([...this.store.values()], "tenant_id", query);
  }
  async groupBy(query) {
    return groupItems([...this.store.values()], "tenant_id", query);
  }
  async deleteMany(ids) {
    for (const id of ids) this.store.delete(id);
  }
  async deleteByTenantId(tenantId) {
    for (const [id, log] of this.store) {
      if (log.tenant_id === tenantId) this.store.delete(id);
    }
  }
  async deleteExpiredBatch(cutoff, batchSize) {
    const expired = [];
    for (const [id, log] of this.store) {
      if (log.created_at < cutoff) expired.push(id);
    }
    const toDelete = expired.slice(0, batchSize);
    for (const id of toDelete) this.store.delete(id);
    return { deleted: toDelete.length, hasMore: expired.length > batchSize };
  }
  async countExpired(cutoff) {
    let count = 0;
    for (const log of this.store.values()) {
      if (log.created_at < cutoff) count++;
    }
    return count;
  }
};

// src/memory/memory-storage-adapter.ts
function createMemoryStorage() {
  const groups = new MemoryGroupRepository();
  return {
    tenants: new MemoryTenantRepository(),
    tenantHosts: new MemoryTenantHostRepository(),
    groups,
    redirects: new MemoryRedirectRepository(groups),
    redirectLogs: new MemoryRedirectLogRepository(),
    notFoundLogs: new MemoryNotFoundLogRepository()
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ActionType,
  DEFAULT_CONFIG,
  IpLogging,
  MatchType,
  NotFoundError,
  PreconditionError,
  QueryHandling,
  RedirectForge,
  RedirectForgeError,
  RedirectStatus,
  TenantStatus,
  ValidationError,
  applyQueryHandling,
  createMemoryStorage,
  evaluateCondition,
  evaluateUrlPattern,
  findRedirect,
  resolveTarget
});
//# sourceMappingURL=index.cjs.map