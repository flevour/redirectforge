export interface HttpRequest {
  url: string;
  method: string;
  domain: string;
  ip: string;
  client_ip: string;
  user_agent?: string;
  referrer?: string;
  accept_language?: string;
  is_authenticated: boolean;
  user_role?: string;
  response_code?: number;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  server_variables?: Record<string, string>;
}

export interface ContentItem {
  content_type: string;
  current_url: string;
  previous_url?: string;
}

export interface User {
  is_admin: boolean;
}
