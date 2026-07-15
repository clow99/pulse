import { describe, expect, it, afterEach } from 'vitest';
import { buildSelfAnalyticsScript, GET, NOOP_SCRIPT } from './self-analytics.js/route';

const originalToken = process.env.PULSE_SELF_ANALYTICS_SITE_TOKEN;

afterEach(() => {
  if (originalToken === undefined) {
    delete process.env.PULSE_SELF_ANALYTICS_SITE_TOKEN;
  } else {
    process.env.PULSE_SELF_ANALYTICS_SITE_TOKEN = originalToken;
  }
});

describe('self analytics route', () => {
  it('returns a no-op script without a configured token', async () => {
    delete process.env.PULSE_SELF_ANALYTICS_SITE_TOKEN;

    const response = GET();

    expect(await response.text()).toBe(NOOP_SCRIPT);
  });

  it('returns a same-origin tracker with the configured token', async () => {
    process.env.PULSE_SELF_ANALYTICS_SITE_TOKEN = 'pulse-self-token';

    const response = GET();
    const script = await response.text();

    expect(script).toContain('pulse-self-token');
    expect(script).toContain('/api/collect');
    expect(script).toContain('web_vital');
    expect(script).toContain('doNotTrack');
    expect(script).toContain("window.location.pathname === '/demo'");
  });

  it('builds tracker JavaScript without external endpoints', () => {
    const script = buildSelfAnalyticsScript('token');

    expect(script).toContain('/api/collect');
    expect(script).not.toContain('pulsewebanalytics.com');
  });

  it('excludes the public read-only demo from collection', () => {
    const script = buildSelfAnalyticsScript('token');

    expect(script).toContain('if (isReadOnlyDemo()) return;');
    expect(script.indexOf('if (isReadOnlyDemo()) return;')).toBeLessThan(
      script.indexOf('var payload = {')
    );
  });
});
