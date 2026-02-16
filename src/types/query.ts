export type LogFilterOperator =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'not_contains'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte';

export interface LogFilter {
  field: string;
  operator: LogFilterOperator;
  value: string | number | Date;
}

export interface LogQuery {
  tenant_id: string;
  filters?: LogFilter[];
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export interface LogGroupQuery {
  tenant_id: string;
  group_by: string;
  filters?: LogFilter[];
  sort_by?: 'count' | 'field';
  sort_dir?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export interface LogGroupResult {
  value: string;
  count: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
