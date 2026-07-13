import { describe, expect, it } from 'vitest';
import { createHeartbeatSecret, hashHeartbeatSecret } from './monitoring';

describe('monitoring secrets', () => {
  it('creates a one-time heartbeat secret and stable hash', () => {
    const generated = createHeartbeatSecret();
    expect(generated.secret).toMatch(/^pulse_hb_/);
    expect(generated.prefix).toBe(generated.secret.slice(0, 18));
    expect(generated.hash).toBe(hashHeartbeatSecret(generated.secret));
    expect(generated.hash).not.toContain(generated.secret);
  });
});
