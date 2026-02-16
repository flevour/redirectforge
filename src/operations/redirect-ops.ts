import type { StorageAdapter } from '../repositories/index.js';
import type { Redirect, SourceFlags, MatchType, ActionType } from '../types/index.js';
import { NotFoundError, PreconditionError } from '../types/index.js';

export interface CreateRedirectInput {
  group_id: string;
  source_url: string;
  source_flags: SourceFlags;
  match_type: MatchType;
  action_type: ActionType;
  action_code: number;
  target_url?: string;
  alternate_target_url?: string;
  title?: string;
  match_value?: string;
  match_is_regex?: boolean;
  random_targets?: string[];
  log_excluded?: boolean;
}

export interface UpdateRedirectInput {
  source_url?: string;
  source_flags?: SourceFlags;
  match_type?: MatchType;
  match_value?: string;
  match_is_regex?: boolean;
  target_url?: string;
  alternate_target_url?: string;
  action_type?: ActionType;
  action_code?: number;
  group_id?: string;
  title?: string;
  random_targets?: string[];
  log_excluded?: boolean;
}

export async function createRedirect(
  storage: StorageAdapter,
  input: CreateRedirectInput,
): Promise<Redirect> {
  const position = await storage.redirects.countByGroupId(input.group_id);
  return storage.redirects.create({
    group_id: input.group_id,
    position,
    source_url: input.source_url,
    source_flags: input.source_flags,
    match_type: input.match_type,
    match_value: input.match_value,
    match_is_regex: input.match_is_regex ?? false,
    target_url: input.target_url,
    alternate_target_url: input.alternate_target_url,
    action_type: input.action_type,
    action_code: input.action_code,
    random_targets: input.random_targets ?? [],
    title: input.title,
    status: 'enabled',
    hit_count: 0,
    log_excluded: input.log_excluded ?? false,
  });
}

export async function updateRedirect(
  storage: StorageAdapter,
  redirectId: string,
  input: UpdateRedirectInput,
): Promise<Redirect> {
  const existing = await storage.redirects.findById(redirectId);
  if (!existing) throw new NotFoundError('Redirect', redirectId);

  return storage.redirects.update(redirectId, {
    source_url: input.source_url ?? existing.source_url,
    source_flags: input.source_flags ?? existing.source_flags,
    match_type: input.match_type ?? existing.match_type,
    match_value: input.match_value ?? existing.match_value,
    match_is_regex: input.match_is_regex ?? existing.match_is_regex,
    target_url: input.target_url ?? existing.target_url,
    alternate_target_url: input.alternate_target_url ?? existing.alternate_target_url,
    action_type: input.action_type ?? existing.action_type,
    action_code: input.action_code ?? existing.action_code,
    group_id: input.group_id ?? existing.group_id,
    title: input.title ?? existing.title,
    random_targets: input.random_targets ?? existing.random_targets,
    log_excluded: input.log_excluded ?? existing.log_excluded,
  });
}

export async function enableRedirect(
  storage: StorageAdapter,
  redirectId: string,
): Promise<Redirect> {
  const redirect = await storage.redirects.findById(redirectId);
  if (!redirect) throw new NotFoundError('Redirect', redirectId);
  if (redirect.status !== 'disabled') {
    throw new PreconditionError('Redirect must be disabled to enable');
  }
  return storage.redirects.update(redirectId, { status: 'enabled' });
}

export async function disableRedirect(
  storage: StorageAdapter,
  redirectId: string,
): Promise<Redirect> {
  const redirect = await storage.redirects.findById(redirectId);
  if (!redirect) throw new NotFoundError('Redirect', redirectId);
  if (redirect.status !== 'enabled') {
    throw new PreconditionError('Redirect must be enabled to disable');
  }
  return storage.redirects.update(redirectId, { status: 'disabled' });
}

export async function deleteRedirect(
  storage: StorageAdapter,
  redirectId: string,
): Promise<void> {
  await storage.redirects.delete(redirectId);
}

export async function resetRedirectHits(
  storage: StorageAdapter,
  redirectId: string,
): Promise<void> {
  const redirect = await storage.redirects.findById(redirectId);
  if (!redirect) throw new NotFoundError('Redirect', redirectId);
  await storage.redirects.resetHitCount(redirectId);
}
