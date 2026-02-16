export interface HeaderSpec {
  name: string;
  value: string;
}

export function parseHeaderSpec(nameValue: string | undefined): HeaderSpec {
  if (!nameValue) return { name: '', value: '' };
  const idx = nameValue.indexOf(':');
  if (idx === -1) return { name: nameValue.trim(), value: '' };
  return {
    name: nameValue.slice(0, idx).trim(),
    value: nameValue.slice(idx + 1).trim(),
  };
}
