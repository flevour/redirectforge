import type { StorageAdapter } from '../repositories/index.js';
import type { RedirectForgeConfig, HttpRequest, ProcessResult } from '../types/index.js';
import { findRedirect } from '../matching/pipeline.js';
import { executeAction } from './action-executor.js';
import { trackHit } from './hit-tracker.js';
import { logRedirect, logNotFound } from './logger.js';

const PASS_RESULT: ProcessResult = { action: { type: 'pass' } };

export async function processRequest(
  storage: StorageAdapter,
  config: RedirectForgeConfig,
  request: HttpRequest,
): Promise<ProcessResult> {
  // 1. Resolve tenant from hostname
  const host = await storage.tenantHosts.findByHostname(request.domain);
  if (!host || host.status !== 'enabled') return PASS_RESULT;

  // 2. Check tenant is active
  const tenant = await storage.tenants.findById(host.tenant_id);
  if (!tenant || tenant.status !== 'active') return PASS_RESULT;

  // 3. Get sorted active redirects
  const candidates = await storage.redirects.findActiveByTenantId(tenant.id);

  // 4. Find matching redirect
  const match = findRedirect(candidates, request);

  if (!match) {
    // 5. No match — log 404 if applicable
    if (request.response_code === 404) {
      await logNotFound(storage, config, request, tenant.id);
    }
    return PASS_RESULT;
  }

  // 6. Execute action
  const action = executeAction(match.redirect, match.target, request);

  // 7. Track hit
  await trackHit(storage, config, match.redirect);

  // 8. Log redirect
  await logRedirect(storage, config, request, match.redirect, match.target, tenant.id);

  return {
    action,
    redirect_id: match.redirect.id,
    tenant_id: tenant.id,
  };
}
