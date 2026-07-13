import { describe, expect, it } from 'vitest';
import { assertSafeHttpUrl, isBlockedAddress } from './safe-fetch';

describe('outbound URL safety', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.2',
    '169.254.169.254',
    '172.16.0.1',
    '192.168.1.1',
    '::1',
    'fd00::1',
    'fe80::1',
    '2001:db8::1',
  ])('blocks reserved address %s', (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each(['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111'])('allows public address %s', (address) => {
    expect(isBlockedAddress(address)).toBe(false);
  });

  it('rejects encoded loopback hosts', async () => {
    await expect(assertSafeHttpUrl('http://2130706433/')).rejects.toThrow('blocked');
  });

  it('rejects credentials and non-http schemes', async () => {
    await expect(assertSafeHttpUrl('ftp://example.com/file')).rejects.toThrow('HTTP');
    await expect(assertSafeHttpUrl('https://user:pass@example.com')).rejects.toThrow('credentials');
  });
});
