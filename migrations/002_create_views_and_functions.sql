-- RedirectForge: Views and RPC functions

-- View: active redirects joined with their group for position sorting
CREATE OR REPLACE VIEW redirectforge_active_redirects_with_group AS
SELECT
  r.*,
  g.position AS group_position
FROM redirectforge_redirects r
INNER JOIN redirectforge_groups g ON r.group_id = g.id
WHERE r.status = 'enabled' AND g.status = 'enabled';

-- Function: get active redirects for a tenant, ordered by group_position then position
CREATE OR REPLACE FUNCTION redirectforge_get_active_redirects_by_tenant(p_tenant_id uuid)
RETURNS SETOF redirectforge_active_redirects_with_group
LANGUAGE sql STABLE
AS $$
  SELECT v.*
  FROM redirectforge_active_redirects_with_group v
  INNER JOIN redirectforge_groups g ON v.group_id = g.id
  WHERE g.tenant_id = p_tenant_id
  ORDER BY v.group_position ASC, v.position ASC;
$$;

-- Function: atomic hit count increment
CREATE OR REPLACE FUNCTION redirectforge_increment_redirect_hit(
  p_id uuid,
  p_last_hit_at timestamptz
)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE redirectforge_redirects
  SET hit_count = hit_count + 1,
      last_hit_at = p_last_hit_at
  WHERE id = p_id;
$$;

-- Function: delete expired redirect logs in batches
CREATE OR REPLACE FUNCTION redirectforge_delete_expired_redirect_logs(
  p_cutoff timestamptz,
  p_batch_size int
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted int;
  v_total int;
BEGIN
  SELECT count(*) INTO v_total
  FROM redirectforge_redirect_logs
  WHERE created_at < p_cutoff;

  WITH to_delete AS (
    SELECT id FROM redirectforge_redirect_logs
    WHERE created_at < p_cutoff
    ORDER BY created_at ASC
    LIMIT p_batch_size
  )
  DELETE FROM redirectforge_redirect_logs
  WHERE id IN (SELECT id FROM to_delete);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN json_build_object(
    'deleted_count', v_deleted,
    'has_more', v_total > p_batch_size
  );
END;
$$;

-- Function: delete expired not-found logs in batches
CREATE OR REPLACE FUNCTION redirectforge_delete_expired_not_found_logs(
  p_cutoff timestamptz,
  p_batch_size int
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted int;
  v_total int;
BEGIN
  SELECT count(*) INTO v_total
  FROM redirectforge_not_found_logs
  WHERE created_at < p_cutoff;

  WITH to_delete AS (
    SELECT id FROM redirectforge_not_found_logs
    WHERE created_at < p_cutoff
    ORDER BY created_at ASC
    LIMIT p_batch_size
  )
  DELETE FROM redirectforge_not_found_logs
  WHERE id IN (SELECT id FROM to_delete);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN json_build_object(
    'deleted_count', v_deleted,
    'has_more', v_total > p_batch_size
  );
END;
$$;

-- Function: group-by query for redirect logs
CREATE OR REPLACE FUNCTION redirectforge_query_redirect_log_groups(
  p_tenant_id uuid,
  p_group_by text,
  p_filters json DEFAULT '[]',
  p_sort_by text DEFAULT 'count',
  p_sort_dir text DEFAULT 'desc',
  p_page int DEFAULT 1,
  p_per_page int DEFAULT 50
)
RETURNS json
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_where text := format('tenant_id = %L', p_tenant_id);
  v_filter json;
  v_field text;
  v_op text;
  v_val text;
  v_order text;
  v_offset int;
  v_total int;
  v_items json;
BEGIN
  -- Build WHERE from filters
  FOR v_filter IN SELECT * FROM json_array_elements(p_filters)
  LOOP
    v_field := v_filter->>'field';
    v_op := v_filter->>'operator';
    v_val := v_filter->>'value';

    -- Validate field name (alphanumeric + underscore only)
    IF v_field !~ '^[a-z_][a-z0-9_]*$' THEN
      RAISE EXCEPTION 'Invalid field name: %', v_field;
    END IF;

    CASE v_op
      WHEN 'eq' THEN v_where := v_where || format(' AND %I = %L', v_field, v_val);
      WHEN 'neq' THEN v_where := v_where || format(' AND %I != %L', v_field, v_val);
      WHEN 'contains' THEN v_where := v_where || format(' AND %I ILIKE %L', v_field, '%' || v_val || '%');
      WHEN 'not_contains' THEN v_where := v_where || format(' AND %I NOT ILIKE %L', v_field, '%' || v_val || '%');
      WHEN 'gt' THEN v_where := v_where || format(' AND %I > %L', v_field, v_val);
      WHEN 'gte' THEN v_where := v_where || format(' AND %I >= %L', v_field, v_val);
      WHEN 'lt' THEN v_where := v_where || format(' AND %I < %L', v_field, v_val);
      WHEN 'lte' THEN v_where := v_where || format(' AND %I <= %L', v_field, v_val);
      ELSE RAISE EXCEPTION 'Unknown operator: %', v_op;
    END CASE;
  END LOOP;

  -- Validate group_by field
  IF p_group_by !~ '^[a-z_][a-z0-9_]*$' THEN
    RAISE EXCEPTION 'Invalid group_by field: %', p_group_by;
  END IF;

  -- Sort order
  IF p_sort_by = 'field' THEN
    v_order := format('%I %s', p_group_by, CASE WHEN p_sort_dir = 'asc' THEN 'ASC' ELSE 'DESC' END);
  ELSE
    v_order := 'cnt ' || CASE WHEN p_sort_dir = 'asc' THEN 'ASC' ELSE 'DESC' END;
  END IF;

  v_offset := (p_page - 1) * p_per_page;

  -- Get total count of groups
  EXECUTE format(
    'SELECT count(DISTINCT %I) FROM redirectforge_redirect_logs WHERE %s',
    p_group_by, v_where
  ) INTO v_total;

  -- Get paginated groups
  EXECUTE format(
    'SELECT coalesce(json_agg(r), ''[]''::json) FROM ('
    '  SELECT %I::text AS value, count(*)::int AS cnt'
    '  FROM redirectforge_redirect_logs'
    '  WHERE %s'
    '  GROUP BY %I'
    '  ORDER BY %s'
    '  OFFSET %s LIMIT %s'
    ') r',
    p_group_by, v_where, p_group_by, v_order, v_offset, p_per_page
  ) INTO v_items;

  RETURN json_build_object(
    'items', v_items,
    'total', v_total,
    'page', p_page,
    'per_page', p_per_page,
    'total_pages', greatest(1, ceil(v_total::numeric / p_per_page))
  );
END;
$$;

-- Function: group-by query for not-found logs
CREATE OR REPLACE FUNCTION redirectforge_query_not_found_log_groups(
  p_tenant_id uuid,
  p_group_by text,
  p_filters json DEFAULT '[]',
  p_sort_by text DEFAULT 'count',
  p_sort_dir text DEFAULT 'desc',
  p_page int DEFAULT 1,
  p_per_page int DEFAULT 50
)
RETURNS json
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_where text := format('tenant_id = %L', p_tenant_id);
  v_filter json;
  v_field text;
  v_op text;
  v_val text;
  v_order text;
  v_offset int;
  v_total int;
  v_items json;
BEGIN
  -- Build WHERE from filters
  FOR v_filter IN SELECT * FROM json_array_elements(p_filters)
  LOOP
    v_field := v_filter->>'field';
    v_op := v_filter->>'operator';
    v_val := v_filter->>'value';

    IF v_field !~ '^[a-z_][a-z0-9_]*$' THEN
      RAISE EXCEPTION 'Invalid field name: %', v_field;
    END IF;

    CASE v_op
      WHEN 'eq' THEN v_where := v_where || format(' AND %I = %L', v_field, v_val);
      WHEN 'neq' THEN v_where := v_where || format(' AND %I != %L', v_field, v_val);
      WHEN 'contains' THEN v_where := v_where || format(' AND %I ILIKE %L', v_field, '%' || v_val || '%');
      WHEN 'not_contains' THEN v_where := v_where || format(' AND %I NOT ILIKE %L', v_field, '%' || v_val || '%');
      WHEN 'gt' THEN v_where := v_where || format(' AND %I > %L', v_field, v_val);
      WHEN 'gte' THEN v_where := v_where || format(' AND %I >= %L', v_field, v_val);
      WHEN 'lt' THEN v_where := v_where || format(' AND %I < %L', v_field, v_val);
      WHEN 'lte' THEN v_where := v_where || format(' AND %I <= %L', v_field, v_val);
      ELSE RAISE EXCEPTION 'Unknown operator: %', v_op;
    END CASE;
  END LOOP;

  IF p_group_by !~ '^[a-z_][a-z0-9_]*$' THEN
    RAISE EXCEPTION 'Invalid group_by field: %', p_group_by;
  END IF;

  IF p_sort_by = 'field' THEN
    v_order := format('%I %s', p_group_by, CASE WHEN p_sort_dir = 'asc' THEN 'ASC' ELSE 'DESC' END);
  ELSE
    v_order := 'cnt ' || CASE WHEN p_sort_dir = 'asc' THEN 'ASC' ELSE 'DESC' END;
  END IF;

  v_offset := (p_page - 1) * p_per_page;

  EXECUTE format(
    'SELECT count(DISTINCT %I) FROM redirectforge_not_found_logs WHERE %s',
    p_group_by, v_where
  ) INTO v_total;

  EXECUTE format(
    'SELECT coalesce(json_agg(r), ''[]''::json) FROM ('
    '  SELECT %I::text AS value, count(*)::int AS cnt'
    '  FROM redirectforge_not_found_logs'
    '  WHERE %s'
    '  GROUP BY %I'
    '  ORDER BY %s'
    '  OFFSET %s LIMIT %s'
    ') r',
    p_group_by, v_where, p_group_by, v_order, v_offset, p_per_page
  ) INTO v_items;

  RETURN json_build_object(
    'items', v_items,
    'total', v_total,
    'page', p_page,
    'per_page', p_per_page,
    'total_pages', greatest(1, ceil(v_total::numeric / p_per_page))
  );
END;
$$;
