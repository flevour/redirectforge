import type { StorageAdapter } from '../repositories/index.js';
import type { RedirectForgeConfig, HttpRequest, Redirect } from '../types/index.js';
import { captureIp } from './ip-anonymizer.js';

function serializeHeaders(request: HttpRequest): string | undefined {
  if (!request.headers) return undefined;
  return JSON.stringify(request.headers);
}

export async function logRedirect(
  storage: StorageAdapter,
  config: RedirectForgeConfig,
  request: HttpRequest,
  redirect: Redirect,
  target: string,
  tenantId: string,
): Promise<void> {
  if (redirect.log_excluded) return;

  const ip = captureIp(request.client_ip, config.ip_logging);
  const headers = config.log_request_headers ? serializeHeaders(request) : undefined;

  await storage.redirectLogs.create({
    tenant_id: tenantId,
    redirect_id: redirect.id,
    created_at: new Date(),
    source_url: request.url,
    target_url: target,
    domain: request.domain,
    ip,
    http_code: redirect.action_code,
    user_agent: request.user_agent,
    referrer: request.referrer,
    request_method: request.method,
    request_headers: headers,
    redirect_source: 'redirection',
  });
}

export async function logNotFound(
  storage: StorageAdapter,
  config: RedirectForgeConfig,
  request: HttpRequest,
  tenantId: string,
): Promise<void> {
  const ip = captureIp(request.client_ip, config.ip_logging);
  const headers = config.log_request_headers ? serializeHeaders(request) : undefined;

  await storage.notFoundLogs.create({
    tenant_id: tenantId,
    created_at: new Date(),
    url: request.url,
    domain: request.domain,
    ip,
    user_agent: request.user_agent,
    referrer: request.referrer,
    request_method: request.method,
    request_headers: headers,
  });
}
