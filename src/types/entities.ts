import type {
  RedirectStatus,
  TenantStatus,
  QueryHandling,
  MatchType,
  ActionType,
} from './enums.js';

export interface SourceFlags {
  case_insensitive: boolean;
  ignore_trailing_slash: boolean;
  query_handling: QueryHandling;
  is_regex: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  status: TenantStatus;
}

export interface TenantHost {
  id: string;
  tenant_id: string;
  hostname: string;
  environment?: string;
  status: RedirectStatus;
}

export interface Group {
  id: string;
  tenant_id: string;
  name: string;
  status: RedirectStatus;
  position: number;
}

export interface Redirect {
  id: string;
  group_id: string;
  position: number;
  title?: string;
  status: RedirectStatus;
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
  hit_count: number;
  last_hit_at?: Date;
  log_excluded: boolean;
}

export interface RedirectLog {
  id: string;
  tenant_id: string;
  redirect_id?: string;
  created_at: Date;
  source_url: string;
  target_url?: string;
  domain?: string;
  ip?: string;
  http_code: number;
  user_agent?: string;
  referrer?: string;
  request_method?: string;
  request_headers?: string;
  redirect_source?: string;
}

export interface NotFoundLog {
  id: string;
  tenant_id: string;
  created_at: Date;
  url: string;
  domain?: string;
  ip?: string;
  user_agent?: string;
  referrer?: string;
  request_method?: string;
  request_headers?: string;
}
