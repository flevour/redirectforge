import type { LogFilter, LogQuery, LogGroupQuery, LogGroupResult, PaginatedResult } from '../types/index.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getField(record: any, field: string): unknown {
  return record[field];
}

function matchesFilter(record: unknown, filter: LogFilter): boolean {
  const actual = getField(record, filter.field);
  const expected = filter.value;

  switch (filter.operator) {
    case 'eq':
      return actual === expected;
    case 'neq':
      return actual !== expected;
    case 'contains':
      return typeof actual === 'string' && typeof expected === 'string'
        ? actual.toLowerCase().includes(expected.toLowerCase())
        : false;
    case 'not_contains':
      return typeof actual === 'string' && typeof expected === 'string'
        ? !actual.toLowerCase().includes(expected.toLowerCase())
        : true;
    case 'gt':
      if (actual instanceof Date && expected instanceof Date) return actual > expected;
      return (actual as number) > (expected as number);
    case 'gte':
      if (actual instanceof Date && expected instanceof Date) return actual >= expected;
      return (actual as number) >= (expected as number);
    case 'lt':
      if (actual instanceof Date && expected instanceof Date) return actual < expected;
      return (actual as number) < (expected as number);
    case 'lte':
      if (actual instanceof Date && expected instanceof Date) return actual <= expected;
      return (actual as number) <= (expected as number);
    default:
      return true;
  }
}

function applyFilters<T>(items: T[], filters?: LogFilter[]): T[] {
  if (!filters || filters.length === 0) return items;
  return items.filter((item) => filters.every((f) => matchesFilter(item, f)));
}

function applySort<T>(items: T[], sortBy?: string, sortDir?: 'asc' | 'desc'): T[] {
  if (!sortBy) return items;
  const dir = sortDir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const va = getField(a, sortBy);
    const vb = getField(b, sortBy);
    if (va instanceof Date && vb instanceof Date) return (va.getTime() - vb.getTime()) * dir;
    if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb) * dir;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
    return 0;
  });
}

export function paginate<T>(items: T[], page?: number, perPage?: number): PaginatedResult<T> {
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
    total_pages: totalPages,
  };
}

export function queryItems<T>(
  allItems: T[],
  tenantIdField: string,
  query: LogQuery,
): PaginatedResult<T> {
  let items = allItems.filter((i) => getField(i, tenantIdField) === query.tenant_id);
  items = applyFilters(items, query.filters);
  items = applySort(items, query.sort_by ?? 'created_at', query.sort_dir ?? 'desc');
  return paginate(items, query.page, query.per_page);
}

export function groupItems<T>(
  allItems: T[],
  tenantIdField: string,
  query: LogGroupQuery,
): PaginatedResult<LogGroupResult> {
  let items = allItems.filter((i) => getField(i, tenantIdField) === query.tenant_id);
  items = applyFilters(items, query.filters);

  const counts = new Map<string, number>();
  for (const item of items) {
    const val = String(getField(item, query.group_by) ?? '');
    counts.set(val, (counts.get(val) ?? 0) + 1);
  }

  let results: LogGroupResult[] = [...counts.entries()].map(([value, count]) => ({ value, count }));

  if (query.sort_by === 'field') {
    const dir = query.sort_dir === 'asc' ? 1 : -1;
    results.sort((a, b) => a.value.localeCompare(b.value) * dir);
  } else {
    const dir = query.sort_dir === 'asc' ? 1 : -1;
    results.sort((a, b) => (a.count - b.count) * dir);
  }

  return paginate(results, query.page, query.per_page);
}
