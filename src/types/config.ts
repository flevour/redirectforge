import type { IpLogging } from './enums.js';

export interface RedirectForgeConfig {
  redirect_log_retention_days: number;
  not_found_log_retention_days: number;
  track_hits: boolean;
  log_request_headers: boolean;
  ip_logging: IpLogging;
  ip_header_priority: string[];
  trusted_proxy_ranges: string[];
  log_cleanup_batch_size: number;
  aggressive_cleanup_threshold: number;
  aggressive_cleanup_batch_size: number;
  monitor_content_types: Set<string>;
}

export const DEFAULT_CONFIG: RedirectForgeConfig = {
  redirect_log_retention_days: 0,
  not_found_log_retention_days: 0,
  track_hits: true,
  log_request_headers: false,
  ip_logging: 'full',
  ip_header_priority: ['X-Forwarded-For'],
  trusted_proxy_ranges: [],
  log_cleanup_batch_size: 20_000,
  aggressive_cleanup_threshold: 100_000,
  aggressive_cleanup_batch_size: 50_000,
  monitor_content_types: new Set(),
};
