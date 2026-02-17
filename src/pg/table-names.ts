export const TABLES = {
  tenants: 'redirectforge_tenants',
  tenantHosts: 'redirectforge_tenant_hosts',
  groups: 'redirectforge_groups',
  redirects: 'redirectforge_redirects',
  redirectLogs: 'redirectforge_redirect_logs',
  notFoundLogs: 'redirectforge_not_found_logs',
} as const;

export const FUNCTIONS = {
  getActiveRedirectsByTenant: 'redirectforge_get_active_redirects_by_tenant',
  incrementRedirectHit: 'redirectforge_increment_redirect_hit',
  deleteExpiredRedirectLogs: 'redirectforge_delete_expired_redirect_logs',
  deleteExpiredNotFoundLogs: 'redirectforge_delete_expired_not_found_logs',
  queryRedirectLogGroups: 'redirectforge_query_redirect_log_groups',
  queryNotFoundLogGroups: 'redirectforge_query_not_found_log_groups',
} as const;
