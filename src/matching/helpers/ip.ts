export function parseIpList(csv: string | undefined): string[] {
  if (!csv) return [];
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseIpv4(ip: string): number[] | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return null;
  return nums;
}

function ipv4ToNumber(parts: number[]): number {
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function matchCidr(ip: string, cidr: string): boolean {
  const [network, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;

  const ipParts = parseIpv4(ip);
  const networkParts = parseIpv4(network);
  if (!ipParts || !networkParts) return false;

  const ipNum = ipv4ToNumber(ipParts);
  const netNum = ipv4ToNumber(networkParts);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;

  return (ipNum & mask) === (netNum & mask);
}

export function ipInList(ip: string, list: string[]): boolean {
  for (const entry of list) {
    if (entry.includes('/')) {
      if (matchCidr(ip, entry)) return true;
    } else if (ip === entry) {
      return true;
    }
  }
  return false;
}

export function anonymizeIp(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    parts[3] = '0';
    return parts.join('.');
  }
  // IPv6: truncate last segment
  const segments = ip.split(':');
  if (segments.length > 1) {
    segments[segments.length - 1] = '0';
    return segments.join(':');
  }
  return ip;
}
