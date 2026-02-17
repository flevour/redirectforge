import type { LogFilter } from '../types/index.js';
import { RedirectForgeError } from '../types/index.js';

const SAFE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

function validateFieldName(field: string): void {
  if (!SAFE_IDENTIFIER.test(field)) {
    throw new RedirectForgeError(`Invalid field name: ${field}`);
  }
}

export function buildFilterClause(
  filters: LogFilter[],
  startParam: number,
): { clause: string; values: unknown[]; nextParam: number } {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = startParam;

  for (const f of filters) {
    validateFieldName(f.field);
    const val = f.value instanceof Date ? f.value.toISOString() : f.value;

    switch (f.operator) {
      case 'eq':
        conditions.push(`"${f.field}" = $${idx}`);
        values.push(val);
        idx++;
        break;
      case 'neq':
        conditions.push(`"${f.field}" != $${idx}`);
        values.push(val);
        idx++;
        break;
      case 'contains':
        conditions.push(`"${f.field}" ILIKE $${idx}`);
        values.push(`%${val}%`);
        idx++;
        break;
      case 'not_contains':
        conditions.push(`"${f.field}" NOT ILIKE $${idx}`);
        values.push(`%${val}%`);
        idx++;
        break;
      case 'gt':
        conditions.push(`"${f.field}" > $${idx}`);
        values.push(val);
        idx++;
        break;
      case 'gte':
        conditions.push(`"${f.field}" >= $${idx}`);
        values.push(val);
        idx++;
        break;
      case 'lt':
        conditions.push(`"${f.field}" < $${idx}`);
        values.push(val);
        idx++;
        break;
      case 'lte':
        conditions.push(`"${f.field}" <= $${idx}`);
        values.push(val);
        idx++;
        break;
    }
  }

  return {
    clause: conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '',
    values,
    nextParam: idx,
  };
}

export function buildSetClause(
  data: Record<string, unknown>,
  startParam: number,
): { clause: string; values: unknown[]; nextParam: number } {
  const keys = Object.keys(data);
  const values = keys.map((k) => data[k]);
  const clause = keys.map((k, i) => `"${k}" = $${startParam + i}`).join(', ');
  return { clause, values, nextParam: startParam + keys.length };
}
