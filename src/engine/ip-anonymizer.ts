import type { IpLogging } from '../types/index.js';
import { anonymizeIp } from '../matching/helpers/ip.js';

export function captureIp(clientIp: string, mode: IpLogging): string | undefined {
  switch (mode) {
    case 'full':
      return clientIp;
    case 'anonymized':
      return anonymizeIp(clientIp);
    case 'none':
      return undefined;
  }
}
