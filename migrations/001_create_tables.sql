-- RedirectForge: Create tables
-- Apply via: supabase db push (or copy into supabase/migrations/)

-- Tenants
CREATE TABLE redirectforge_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended'))
);

-- Tenant Hosts
CREATE TABLE redirectforge_tenant_hosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES redirectforge_tenants(id) ON DELETE CASCADE,
  hostname text NOT NULL,
  environment text,
  status text NOT NULL DEFAULT 'enabled'
    CHECK (status IN ('enabled', 'disabled'))
);

CREATE UNIQUE INDEX idx_redirectforge_tenant_hosts_hostname
  ON redirectforge_tenant_hosts (hostname);

CREATE INDEX idx_redirectforge_tenant_hosts_tenant_id
  ON redirectforge_tenant_hosts (tenant_id);

-- Groups
CREATE TABLE redirectforge_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES redirectforge_tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'enabled'
    CHECK (status IN ('enabled', 'disabled')),
  position int NOT NULL DEFAULT 0
);

CREATE INDEX idx_redirectforge_groups_tenant_id
  ON redirectforge_groups (tenant_id);

-- Redirects
CREATE TABLE redirectforge_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES redirectforge_groups(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  title text,
  status text NOT NULL DEFAULT 'enabled'
    CHECK (status IN ('enabled', 'disabled')),
  source_url text NOT NULL,
  source_flags jsonb NOT NULL DEFAULT '{"case_insensitive":false,"ignore_trailing_slash":false,"query_handling":"ignore","is_regex":false}',
  match_type text NOT NULL DEFAULT 'url',
  match_value text,
  match_is_regex boolean NOT NULL DEFAULT false,
  target_url text,
  alternate_target_url text,
  action_type text NOT NULL DEFAULT 'redirect',
  action_code int NOT NULL DEFAULT 301,
  random_targets text[] NOT NULL DEFAULT '{}',
  hit_count int NOT NULL DEFAULT 0,
  last_hit_at timestamptz,
  log_excluded boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_redirectforge_redirects_group_id
  ON redirectforge_redirects (group_id);

-- Redirect Logs
CREATE TABLE redirectforge_redirect_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES redirectforge_tenants(id) ON DELETE CASCADE,
  redirect_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  source_url text NOT NULL,
  target_url text,
  domain text,
  ip text,
  http_code int NOT NULL,
  user_agent text,
  referrer text,
  request_method text,
  request_headers text,
  redirect_source text
);

CREATE INDEX idx_redirectforge_redirect_logs_tenant_id
  ON redirectforge_redirect_logs (tenant_id);

CREATE INDEX idx_redirectforge_redirect_logs_created_at
  ON redirectforge_redirect_logs (created_at);

-- Not Found Logs
CREATE TABLE redirectforge_not_found_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES redirectforge_tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  url text NOT NULL,
  domain text,
  ip text,
  user_agent text,
  referrer text,
  request_method text,
  request_headers text
);

CREATE INDEX idx_redirectforge_not_found_logs_tenant_id
  ON redirectforge_not_found_logs (tenant_id);

CREATE INDEX idx_redirectforge_not_found_logs_created_at
  ON redirectforge_not_found_logs (created_at);
