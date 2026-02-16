interface LanguageTag {
  tag: string;
  quality: number;
}

function parseAcceptLanguage(header: string | undefined): LanguageTag[] {
  if (!header) return [];
  return header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      let quality = 1;
      for (const p of params) {
        const match = p.trim().match(/^q=(\d+(?:\.\d+)?)$/);
        if (match) {
          quality = parseFloat(match[1]);
        }
      }
      return { tag: tag.trim().toLowerCase(), quality };
    })
    .filter((l) => l.quality > 0)
    .sort((a, b) => b.quality - a.quality);
}

export function localeMatches(acceptLanguage: string | undefined, targetLocale: string): boolean {
  const languages = parseAcceptLanguage(acceptLanguage);
  const target = targetLocale.toLowerCase();

  for (const { tag } of languages) {
    if (tag === target) return true;
    // Prefix match: "en" matches "en-US"
    if (tag.startsWith(target + '-') || target.startsWith(tag + '-')) return true;
  }
  return false;
}
