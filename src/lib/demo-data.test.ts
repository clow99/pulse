import { describe, expect, it } from 'vitest';
import { DEMO_SNAPSHOT, DEMO_VIEWS, parseDemoView } from './demo-data';

describe('parseDemoView', () => {
  it.each(DEMO_VIEWS)('accepts the %s report', (view) => {
    expect(parseDemoView(view)).toBe(view);
  });

  it('defaults unknown, missing, and ambiguous values to overview', () => {
    expect(parseDemoView('settings')).toBe('overview');
    expect(parseDemoView('Overview')).toBe('overview');
    expect(parseDemoView('')).toBe('overview');
    expect(parseDemoView(undefined)).toBe('overview');
    expect(parseDemoView(null)).toBe('overview');
    expect(parseDemoView(['uptime', 'overview'])).toBe('overview');
  });
});

describe('demo fixture invariants', () => {
  it('is a fixed, internally consistent snapshot', () => {
    expect(DEMO_SNAPSHOT.generatedAt).toBe('2026-07-14T14:32:00.000Z');
    expect(DEMO_SNAPSHOT.site).toEqual({
      id: 'demo-site',
      name: 'Demo Site',
      domain: 'demo.example',
    });

    const trafficVisitors = DEMO_SNAPSHOT.overview.traffic.reduce(
      (sum, point) => sum + point.visitors,
      0
    );
    const trafficPageviews = DEMO_SNAPSHOT.overview.traffic.reduce(
      (sum, point) => sum + point.pageviews,
      0
    );
    const sourceVisitors = DEMO_SNAPSHOT.acquisition.sources.reduce(
      (sum, source) => sum + source.visitors,
      0
    );
    const aiVisitors = DEMO_SNAPSHOT.acquisition.aiSources.reduce(
      (sum, source) => sum + source.visitors,
      0
    );

    expect(trafficVisitors).toBe(12_847);
    expect(trafficPageviews).toBe(32_109);
    expect(sourceVisitors).toBe(DEMO_SNAPSHOT.acquisition.totalVisitors);
    expect(aiVisitors).toBe(
      DEMO_SNAPSHOT.acquisition.sources.find(
        (source) => source.label === 'AI assistants'
      )?.visitors
    );
    expect(
      DEMO_SNAPSHOT.acquisition.sources.reduce(
        (sum, source) => sum + source.percentage,
        0
      )
    ).toBeCloseTo(100, 1);
    expect(DEMO_SNAPSHOT.uptime.timeline).toHaveLength(14);
    expect(DEMO_SNAPSHOT.uptime.recentChecks).toHaveLength(5);
    expect(DEMO_SNAPSHOT.uptime.totalChecks).toBe(14 * 24 * 12);
  });

  it('contains no production identifiers, credentials, or mutable surfaces', () => {
    const serialized = JSON.stringify(DEMO_SNAPSHOT).toLowerCase();
    const forbidden = [
      'pulsewebanalytics.com',
      'git.cameronlow.com',
      'cameronlow',
      'demo@pulse.dev',
      'password123',
      'api_key',
      'tokenprefix',
      'settings',
    ];

    for (const identifier of forbidden) {
      expect(serialized).not.toContain(identifier);
    }

    expect(DEMO_SNAPSHOT.site.domain.endsWith('.example')).toBe(true);
  });
});
