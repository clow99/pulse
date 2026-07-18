export const DEMO_VIEWS = ['overview', 'acquisition', 'uptime'] as const;

export type DemoView = (typeof DEMO_VIEWS)[number];

export interface DemoTrafficPoint {
  readonly label: string;
  readonly visitors: number;
  readonly pageviews: number;
}

export interface DemoMetric {
  readonly label: string;
  readonly value: string;
  readonly change?: string;
  readonly direction?: 'up' | 'down' | 'neutral';
  readonly detail: string;
}

export interface DemoPageRow {
  readonly path: string;
  readonly visitors: number;
  readonly pageviews: number;
  readonly conversionRate: number;
}

export interface DemoEventRow {
  readonly name: string;
  readonly count: number;
  readonly uniqueVisitors: number;
}

export interface DemoAcquisitionSource {
  readonly label: string;
  readonly visitors: number;
  readonly percentage: number;
  readonly accent: 'cyan' | 'blue' | 'green' | 'amber' | 'violet';
}

export interface DemoAISource {
  readonly label: string;
  readonly visitors: number;
  readonly conversions: number;
  readonly revenue: number;
}

export interface DemoUptimePoint {
  readonly label: string;
  readonly uptime: number;
  readonly responseTime: number;
}

export interface DemoCheck {
  readonly checkedAt: string;
  readonly status: 'Operational';
  readonly statusCode: 200;
  readonly responseTime: number;
}

export interface DemoSnapshot {
  readonly generatedAt: string;
  readonly period: string;
  readonly site: {
    readonly id: 'demo-site';
    readonly name: 'Demo Site';
    readonly domain: 'demo.example';
  };
  readonly overview: {
    readonly metrics: readonly DemoMetric[];
    readonly traffic: readonly DemoTrafficPoint[];
    readonly topPages: readonly DemoPageRow[];
    readonly recentEvents: readonly DemoEventRow[];
    readonly insight: {
      readonly title: string;
      readonly body: string;
      readonly evidence: string;
    };
  };
  readonly acquisition: {
    readonly totalVisitors: number;
    readonly sources: readonly DemoAcquisitionSource[];
    readonly aiSources: readonly DemoAISource[];
    readonly referrers: readonly {
      readonly label: string;
      readonly visitors: number;
      readonly percentage: number;
    }[];
  };
  readonly uptime: {
    readonly status: 'Operational';
    readonly uptimePercentage: number;
    readonly averageResponseTime: number;
    readonly totalChecks: number;
    readonly lastCheckedAt: string;
    readonly timeline: readonly DemoUptimePoint[];
    readonly recentChecks: readonly DemoCheck[];
  };
}

export function parseDemoView(
  value: string | readonly string[] | null | undefined
): DemoView {
  if (typeof value !== 'string') return 'overview';
  return (DEMO_VIEWS as readonly string[]).includes(value)
    ? (value as DemoView)
    : 'overview';
}

function percentage(value: number, total: number) {
  return Math.round((value / total) * 10_000) / 100;
}

const totalVisitors = 12_847;

const acquisitionCounts = [
  ['Direct', 3_982, 'cyan'],
  ['Organic search', 3_375, 'blue'],
  ['Referrals', 2_120, 'green'],
  ['AI assistants', 1_870, 'violet'],
  ['Campaigns', 1_500, 'amber'],
] as const;

export const DEMO_SNAPSHOT = {
  generatedAt: '2026-07-14T14:32:00.000Z',
  period: 'July 1–14, 2026',
  site: {
    id: 'demo-site',
    name: 'Demo Site',
    domain: 'demo.example',
  },
  overview: {
    metrics: [
      {
        label: 'Visitors',
        value: '12,847',
        change: '18.6%',
        direction: 'up',
        detail: 'Unique visitors',
      },
      {
        label: 'Pageviews',
        value: '32,109',
        change: '23.4%',
        direction: 'up',
        detail: '2.5 views per visit',
      },
      {
        label: 'Tracked events',
        value: '4,382',
        direction: 'neutral',
        detail: 'Across 6 event types',
      },
      {
        label: 'Bounce rate',
        value: '36.8%',
        change: '4.1%',
        direction: 'down',
        detail: 'Lower than prior period',
      },
    ],
    traffic: [
      { label: 'Jul 1', visitors: 650, pageviews: 1_520 },
      { label: 'Jul 2', visitors: 710, pageviews: 1_680 },
      { label: 'Jul 3', visitors: 675, pageviews: 1_605 },
      { label: 'Jul 4', visitors: 620, pageviews: 1_420 },
      { label: 'Jul 5', visitors: 780, pageviews: 1_850 },
      { label: 'Jul 6', visitors: 850, pageviews: 2_080 },
      { label: 'Jul 7', visitors: 810, pageviews: 1_950 },
      { label: 'Jul 8', visitors: 930, pageviews: 2_230 },
      { label: 'Jul 9', visitors: 895, pageviews: 2_115 },
      { label: 'Jul 10', visitors: 1_015, pageviews: 2_480 },
      { label: 'Jul 11', visitors: 1_100, pageviews: 2_760 },
      { label: 'Jul 12', visitors: 1_085, pageviews: 2_635 },
      { label: 'Jul 13', visitors: 1_220, pageviews: 3_020 },
      { label: 'Jul 14', visitors: 1_507, pageviews: 4_764 },
    ],
    topPages: [
      { path: '/', visitors: 4_912, pageviews: 8_164, conversionRate: 8.4 },
      { path: '/product', visitors: 2_386, pageviews: 5_202, conversionRate: 12.7 },
      { path: '/docs/getting-started', visitors: 1_744, pageviews: 3_918, conversionRate: 5.9 },
      { path: '/pricing', visitors: 1_258, pageviews: 2_840, conversionRate: 18.2 },
      { path: '/changelog', visitors: 936, pageviews: 1_604, conversionRate: 3.1 },
    ],
    recentEvents: [
      { name: 'Signup completed', count: 824, uniqueVisitors: 791 },
      { name: 'Report exported', count: 706, uniqueVisitors: 512 },
      { name: 'Docs searched', count: 652, uniqueVisitors: 436 },
      { name: 'Plan selected', count: 418, uniqueVisitors: 397 },
    ],
    insight: {
      title: 'AI referrals are converting above average',
      body: 'Visitors arriving from AI assistants converted 1.8× more often than the site average during this fixed demo period.',
      evidence: '1,870 visitors · 186 conversions · 9.9% conversion rate',
    },
  },
  acquisition: {
    totalVisitors,
    sources: acquisitionCounts.map(([label, visitors, accent]) => ({
      label,
      visitors,
      percentage: percentage(visitors, totalVisitors),
      accent,
    })),
    aiSources: [
      { label: 'ChatGPT', visitors: 742, conversions: 78, revenue: 6_240 },
      { label: 'Perplexity', visitors: 508, conversions: 52, revenue: 4_160 },
      { label: 'Claude', visitors: 391, conversions: 39, revenue: 3_120 },
      { label: 'Gemini', visitors: 229, conversions: 17, revenue: 1_360 },
    ],
    referrers: [
      { label: 'google.com', visitors: 2_418, percentage: percentage(2_418, totalVisitors) },
      { label: 'community.example', visitors: 1_125, percentage: percentage(1_125, totalVisitors) },
      { label: 'docs.example', visitors: 940, percentage: percentage(940, totalVisitors) },
      { label: 'newsletter.example', visitors: 720, percentage: percentage(720, totalVisitors) },
      { label: 'github.com', visitors: 510, percentage: percentage(510, totalVisitors) },
    ],
  },
  uptime: {
    status: 'Operational',
    uptimePercentage: 99.98,
    averageResponseTime: 184,
    totalChecks: 4_032,
    lastCheckedAt: '2026-07-14T14:32:00.000Z',
    timeline: [
      { label: 'Jul 1', uptime: 100, responseTime: 172 },
      { label: 'Jul 2', uptime: 100, responseTime: 178 },
      { label: 'Jul 3', uptime: 100, responseTime: 181 },
      { label: 'Jul 4', uptime: 100, responseTime: 176 },
      { label: 'Jul 5', uptime: 100, responseTime: 188 },
      { label: 'Jul 6', uptime: 100, responseTime: 191 },
      { label: 'Jul 7', uptime: 100, responseTime: 179 },
      { label: 'Jul 8', uptime: 99.72, responseTime: 246 },
      { label: 'Jul 9', uptime: 100, responseTime: 198 },
      { label: 'Jul 10', uptime: 100, responseTime: 186 },
      { label: 'Jul 11', uptime: 100, responseTime: 177 },
      { label: 'Jul 12', uptime: 100, responseTime: 182 },
      { label: 'Jul 13', uptime: 100, responseTime: 169 },
      { label: 'Jul 14', uptime: 100, responseTime: 173 },
    ],
    recentChecks: [
      { checkedAt: '14:32 UTC', status: 'Operational', statusCode: 200, responseTime: 173 },
      { checkedAt: '14:27 UTC', status: 'Operational', statusCode: 200, responseTime: 181 },
      { checkedAt: '14:22 UTC', status: 'Operational', statusCode: 200, responseTime: 169 },
      { checkedAt: '14:17 UTC', status: 'Operational', statusCode: 200, responseTime: 176 },
      { checkedAt: '14:12 UTC', status: 'Operational', statusCode: 200, responseTime: 171 },
    ],
  },
} as const satisfies DemoSnapshot;
