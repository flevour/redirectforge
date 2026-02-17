import type { IpLogging } from '../types/index.js';
import { anonymizeIp } from '../matching/helpers/ip.js';

export function captureIp(clientIp: string | undefined, mode: IpLogging): string | undefined {
  if (!clientIp) return undefined;
  switch (mode) {
    case 'full':
      return clientIp;
    case 'anonymized':
      return anonymizeIp(clientIp);
    case 'none':
      return undefined;
  }
}
