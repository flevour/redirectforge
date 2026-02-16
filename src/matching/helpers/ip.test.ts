import { describe, it, expect } from 'vitest';
import { parseIpList, ipInList, anonymizeIp } from './ip.js';

describe('parseIpList', () => {
  it('parses comma-separated IPs', () => {
    expect(parseIpList('1.2.3.4, 5.6.7.8')).toEqual(['1.2.3.4', '5.6.7.8']);
  });

  it('handles undefined', () => {
    expect(parseIpList(undefined)).toEqual([]);
  });

  it('filters empty entries', () => {
    expect(parseIpList('1.2.3.4,,5.6.7.8')).toEqual(['1.2.3.4', '5.6.7.8']);
  });
});

describe('ipInList', () => {
  it('matches exact IP', () => {
    expect(ipInList('1.2.3.4', ['1.2.3.4', '5.6.7.8'])).toBe(true);
    expect(ipInList('9.9.9.9', ['1.2.3.4', '5.6.7.8'])).toBe(false);
  });

  it('matches CIDR range', () => {
    expect(ipInList('192.168.1.50', ['192.168.1.0/24'])).toBe(true);
    expect(ipInList('192.168.2.50', ['192.168.1.0/24'])).toBe(false);
  });

  it('handles /32 CIDR (single host)', () => {
    expect(ipInList('10.0.0.1', ['10.0.0.1/32'])).toBe(true);
    expect(ipInList('10.0.0.2', ['10.0.0.1/32'])).toBe(false);
  });
});

describe('anonymizeIp', () => {
  it('zeros last octet of IPv4', () => {
    expect(anonymizeIp('192.168.1.123')).toBe('192.168.1.0');
  });

  it('zeros last segment of IPv6', () => {
    expect(anonymizeIp('2001:db8::1')).toBe('2001:db8::0');
  });
});
