import { afterEach, describe, expect, it, vi } from 'vitest';
import { mayCreateGoogleAccount, publicRegistrationEnabled } from './registration';

afterEach(() => vi.unstubAllEnvs());

describe('private preview registration boundary', () => {
  it('fails closed by default and for unrecognized configuration', () => {
    for (const value of [undefined, '', 'false', '1', 'TRUE']) {
      vi.stubEnv('PULSE_ALLOW_PUBLIC_REGISTRATION', value);
      expect(publicRegistrationEnabled()).toBe(false);
      expect(mayCreateGoogleAccount(false, true)).toBe(false);
    }
  });
  it('keeps existing verified Google users able to sign in', () => {
    vi.stubEnv('PULSE_ALLOW_PUBLIC_REGISTRATION', 'false');
    expect(mayCreateGoogleAccount(true, true)).toBe(true);
    expect(mayCreateGoogleAccount(true, false)).toBe(false);
  });
  it('requires explicit opt-in and a verified Google email for a new account', () => {
    vi.stubEnv('PULSE_ALLOW_PUBLIC_REGISTRATION', 'true');
    expect(mayCreateGoogleAccount(false, true)).toBe(true);
    expect(mayCreateGoogleAccount(false, false)).toBe(false);
  });
});
