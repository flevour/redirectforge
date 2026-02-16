import type { UrlMatchResult } from '../../types/index.js';

export function safeRegex(pattern: string, flags?: string): RegExp | null {
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

export function regexMatch(
  pattern: string,
  subject: string,
  caseInsensitive: boolean,
): UrlMatchResult {
  const flags = caseInsensitive ? 'i' : '';
  const re = safeRegex(pattern, flags);
  if (!re) {
    return { matched: false, captured_groups: [] };
  }
  const match = re.exec(subject);
  if (!match) {
    return { matched: false, captured_groups: [] };
  }
  return {
    matched: true,
    captured_groups: match.slice(1).map((g) => g ?? ''),
  };
}

export function regexTest(pattern: string, subject: string): boolean {
  const re = safeRegex(pattern, 'i');
  if (!re) return false;
  return re.test(subject);
}

export function regexSubstitute(template: string, capturedGroups: string[]): string {
  return template.replace(/\$(\d+)/g, (_, index) => {
    const i = parseInt(index, 10) - 1;
    return i >= 0 && i < capturedGroups.length ? capturedGroups[i] : '';
  });
}
