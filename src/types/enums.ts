export const RedirectStatus = {
  enabled: 'enabled',
  disabled: 'disabled',
} as const;
export type RedirectStatus = (typeof RedirectStatus)[keyof typeof RedirectStatus];

export const TenantStatus = {
  active: 'active',
  suspended: 'suspended',
} as const;
export type TenantStatus = (typeof TenantStatus)[keyof typeof TenantStatus];

export const QueryHandling = {
  ignore: 'ignore',
  exact: 'exact',
  pass: 'pass',
  exact_order: 'exact_order',
} as const;
export type QueryHandling = (typeof QueryHandling)[keyof typeof QueryHandling];

export const MatchType = {
  url: 'url',
  ip: 'ip',
  user_agent: 'user_agent',
  referrer: 'referrer',
  login_status: 'login_status',
  header: 'header',
  cookie: 'cookie',
  role: 'role',
  server_variable: 'server_variable',
  language: 'language',
} as const;
export type MatchType = (typeof MatchType)[keyof typeof MatchType];

export const ActionType = {
  redirect: 'redirect',
  error: 'error',
  nothing: 'nothing',
  rewrite: 'rewrite',
  random: 'random',
} as const;
export type ActionType = (typeof ActionType)[keyof typeof ActionType];

export const IpLogging = {
  full: 'full',
  anonymized: 'anonymized',
  none: 'none',
} as const;
export type IpLogging = (typeof IpLogging)[keyof typeof IpLogging];
