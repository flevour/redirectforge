import type { Redirect } from '../types/entities.js';
import type { HttpRequest } from '../types/external.js';
import type { RedirectWithGroupPosition } from '../repositories/redirect.repository.js';
import { evaluateUrlPattern } from './url-pattern.js';
import { evaluateCondition } from './conditions.js';
import { resolveTarget } from './target-resolver.js';

export interface PipelineMatch {
  redirect: Redirect;
  target: string;
}

export function findRedirect(
  candidates: RedirectWithGroupPosition[],
  request: HttpRequest,
): PipelineMatch | null {
  // Candidates should already be sorted by (group_position ASC, position ASC)
  for (const candidate of candidates) {
    const urlResult = evaluateUrlPattern(candidate, request.url);
    if (!urlResult.matched) continue;

    const condition = evaluateCondition(candidate, request);
    const target = resolveTarget(candidate, request.url, urlResult, condition);
    if (target === null) continue;

    return { redirect: candidate, target };
  }

  return null;
}
