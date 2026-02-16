export type ActionResult =
  | { type: 'redirect'; url: string; code: number }
  | { type: 'error'; code: number }
  | { type: 'rewrite'; original_url: string; target_url: string }
  | { type: 'random_redirect'; url: string; code: number }
  | { type: 'nothing' }
  | { type: 'pass' };

export interface ProcessResult {
  action: ActionResult;
  redirect_id?: string;
  tenant_id?: string;
}

export interface UrlMatchResult {
  matched: boolean;
  captured_groups: string[];
}

export interface ConditionEvaluation {
  checked: boolean;
  matched: boolean;
}
