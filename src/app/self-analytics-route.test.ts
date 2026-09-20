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

  it('keeps cached public pages from collecting even with the old configuration', async () => {
    process.env.PULSE_SELF_ANALYTICS_SITE_TOKEN = 'synthetic-old-token';
    const response = GET();
    expect(await response.text()).toBe(NOOP_SCRIPT);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
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
