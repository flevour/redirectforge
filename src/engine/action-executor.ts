import type { Redirect } from '../types/entities.js';
import type { HttpRequest } from '../types/external.js';
import type { ActionResult } from '../types/results.js';
import { ActionType } from '../types/enums.js';

export function executeAction(
  redirect: Redirect,
  target: string,
  request: HttpRequest,
): ActionResult {
  switch (redirect.action_type) {
    case ActionType.redirect:
      return { type: 'redirect', url: target, code: redirect.action_code };

    case ActionType.error:
      return { type: 'error', code: redirect.action_code };

    case ActionType.rewrite:
      return { type: 'rewrite', original_url: request.url, target_url: target };

    case ActionType.random: {
      if (redirect.random_targets.length === 0) {
        return { type: 'nothing' };
      }
      const idx = Math.floor(Math.random() * redirect.random_targets.length);
      return { type: 'random_redirect', url: redirect.random_targets[idx], code: redirect.action_code };
    }

    case ActionType.nothing:
      return { type: 'nothing' };

    default:
      return { type: 'pass' };
  }
}
