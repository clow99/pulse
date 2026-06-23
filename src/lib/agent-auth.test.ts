import { afterEach, describe, expect, it } from 'vitest';
import {
  AGENT_SCOPES,
  generateAgentTokenSecret,
  getAgentTokenPrefix,
  hasAgentScopes,
  hashAgentToken,
  safeCompareTokenHash,
} from './agent-auth';
import { checkRateLimit, clearRateLimitBuckets } from './rate-limit';

afterEach(() => {
  clearRateLimitBuckets();
});

describe('agent auth helpers', () => {
  it('generates prefixed secrets and hashes without storing plaintext', () => {
    const token = generateAgentTokenSecret();
    const hash = hashAgentToken(token);

    expect(token.startsWith('pulse_at_')).toBe(true);
    expect(getAgentTokenPrefix(token)).toBe(token.slice(0, 18));
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain(token);
    expect(safeCompareTokenHash(hash, hashAgentToken(token))).toBe(true);
  });

  it('enforces exact required scopes', () => {
    expect(hasAgentScopes([...AGENT_SCOPES], ['analytics:read'])).toBe(true);
    expect(hasAgentScopes(['analytics:read'], ['events:read'])).toBe(false);
    expect(
      hasAgentScopes(['reports:generate', 'events:read'], [
        'reports:generate',
        'events:read',
      ])
    ).toBe(true);
  });

  it('rate limits by key and resets independent buckets', () => {
    expect(checkRateLimit('a', { limit: 2, windowMs: 60_000 }).allowed).toBe(true);
    expect(checkRateLimit('a', { limit: 2, windowMs: 60_000 }).allowed).toBe(true);
    expect(checkRateLimit('a', { limit: 2, windowMs: 60_000 }).allowed).toBe(false);
    expect(checkRateLimit('b', { limit: 2, windowMs: 60_000 }).allowed).toBe(true);
  });
});
