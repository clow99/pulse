'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Title } from '@velocityuikit/velocityui';
import { PageTransition } from '@/components/motion';
import { WelcomeHeader } from '@/components/dashboard/WelcomeHeader';
import { ActiveSites } from '@/components/dashboard/ActiveSites';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { AreaChart } from '@/components/dashboard/AreaChart';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { TasksList } from '@/components/dashboard/TasksList';
import { SitesTable } from '@/components/dashboard/SitesTable';
import { UptimeSummaryCard } from '@/components/dashboard/UptimeSummaryCard';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import type { StatsOverview, TimeseriesPoint, TopPage, TopReferrer, UptimeSummary } from '@/types';

interface OverviewData {
  stats: StatsOverview;
  timeseries: TimeseriesPoint[];
  topPages: TopPage[];
  topReferrers: TopReferrer[];
}

interface SiteInfo {
  id: string;
  name: string;
  domain: string;
  active: boolean;
  createdAt: string;
  pageviewCount: number;
}

interface EventSummary {
  name: string;
  count: number;
  uniqueTriggers: number;
}

interface RevenueSummary {
  totalRevenue: number;
  orders: number;
  averageOrderValue: number;
  currency: string;
}

interface InsightItem {
  id: string;
  severity: string;
  title: string;
  body: string;
}

export default function OverviewPage() {
  const searchParams = useSearchParams();
  const siteId = searchParams.get('siteId') || '';

  const [from, setFrom] = useState(() => startOfDay(subDays(new Date(), 30)).toISOString());
  const [to, setTo] = useState(() => endOfDay(new Date()).toISOString());
  const [data, setData] = useState<OverviewData | null>(null);
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [uptimeSummary, setUptimeSummary] = useState<UptimeSummary | null>(null);
  const [uptimeLoading, setUptimeLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ siteId, from, to });
      const [overviewRes, eventsRes, revenueRes, insightsRes] = await Promise.all([
        fetch(`/api/reports/overview?${params}`),
        fetch(`/api/reports/events?${params}`),
        fetch(`/api/reports/revenue?${params}`),
        fetch(`/api/insights?siteId=${siteId}`),
      ]);

      if (overviewRes.ok) {
        setData(await overviewRes.json());
      }
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        if (Array.isArray(eventsData)) {
          setEvents(eventsData);
        }
      }
      if (revenueRes.ok) {
        const revenueData = await revenueRes.json();
        setRevenue(revenueData.summary ?? null);
      }
      if (insightsRes.ok) {
        const insightData = await insightsRes.json();
        if (Array.isArray(insightData)) setInsights(insightData.slice(0, 3));
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [siteId, from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    async function fetchSites() {
      try {
        const res = await fetch('/api/sites');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setSites(data);
          }
        }
      } catch {
        // silently fail
      }
    }

    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const session = await res.json();
          setUserName(session?.user?.name || '');
        }
      } catch {
        // silently fail
      }
    }

    fetchSites();
    fetchUser();
  }, []);

  useEffect(() => {
    if (!siteId) return;
    setUptimeLoading(true);
    fetch(`/api/reports/uptime/summary?siteId=${siteId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setUptimeSummary(data); })
      .catch(() => {})
      .finally(() => setUptimeLoading(false));
  }, [siteId]);

  const handleDateChange = (newFrom: string, newTo: string) => {
    setFrom(newFrom);
    setTo(newTo);
  };

  const stats = data?.stats
    ? [
        { label: 'Visitors', value: data.stats.visitors, change: data.stats.visitorsChange },
        { label: 'Pageviews', value: data.stats.pageviews, change: data.stats.pageviewsChange },
        {
          label: 'Bounce Rate',
          value: data.stats.bounceRate,
          change: 0,
          formatFn: (n: number) => `${n.toFixed(1)}%`,
        },
        {
          label: 'Pages / Visit',
          value: data.stats.avgPagesPerVisit,
          change: 0,
          formatFn: (n: number) => n.toFixed(1),
        },
        ...(revenue && revenue.totalRevenue > 0 ? [{
          label: 'Revenue',
          value: revenue.totalRevenue,
          change: 0,
          formatFn: (n: number) => `${revenue.currency === 'MIXED' ? '' : `${revenue.currency} `}${n.toLocaleString()}`,
        }] : []),
      ]
    : [];

  const activeSitesData = sites.slice(0, 2).map((site) => ({
    id: site.id,
    name: site.name,
    domain: site.domain,
    visitors: site.id === siteId ? (data?.stats?.visitors ?? 0) : 0,
    pageviews: site.pageviewCount ?? 0,
    pageviewTarget: 10000,
  }));

  const recentItems = (data?.topPages || []).slice(0, 5).map((page, i) => ({
    id: `page-${i}`,
    icon: '\u25A4',
    title: page.pathname,
    detail: `${page.views.toLocaleString()} views, ${page.visitors.toLocaleString()} visitors`,
    time: 'Last 30d',
    type: 'page' as const,
  }));

  const eventItems = events.slice(0, 5).map((evt, i) => ({
    id: `event-${i}`,
    icon: '\u25C6',
    title: evt.name,
    detail: `${evt.count.toLocaleString()} triggers, ${evt.uniqueTriggers.toLocaleString()} unique`,
    time: 'Last 30d',
    type: 'event' as const,
  }));

  const sitesTableData = sites.map((site) => ({
    id: site.id,
    name: site.name,
    domain: site.domain,
    visitors: site.id === siteId ? (data?.stats?.visitors ?? 0) : 0,
    pageviews: site.pageviewCount ?? 0,
    active: site.active,
    createdAt: site.createdAt,
  }));

  return (
    <PageTransition>
      <div className="pulse-page">
        <WelcomeHeader
          userName={userName || 'there'}
          siteCount={sites.length}
        />

        <ActiveSites sites={activeSitesData} siteId={siteId} />

        {stats.length > 0 && (
          <div className="pulse-section">
            <StatsCards stats={stats} />
          </div>
        )}

        <div className="pulse-section">
          <UptimeSummaryCard data={uptimeSummary} siteId={siteId} loading={uptimeLoading} />
        </div>

        {insights.length > 0 && (
          <div className="pulse-section">
            <div className="pulse-section-header" style={{ marginBottom: '1rem' }}>
              <Title level="h3" size="sm">Active Insights</Title>
            </div>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {insights.map((insight) => (
                <div key={insight.id} style={{ padding: '1rem', border: '1px solid var(--pulse-border)', borderRadius: 8, background: 'var(--pulse-bg-card)' }}>
                  <strong>{insight.title}</strong>
                  <p style={{ color: 'var(--pulse-text-secondary)', fontSize: '0.875rem', margin: '0.375rem 0 0' }}>{insight.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pulse-overview-grid">
          <div className="pulse-overview-chart">
            <div className="pulse-chart-container">
              <div className="pulse-section-header" style={{ marginBottom: '1rem' }}>
                <Title level="h3" size="sm">Site Statistics</Title>
                <DateRangePicker from={from} to={to} onChange={handleDateChange} />
              </div>
              {data?.timeseries && data.timeseries.length > 0 ? (
                <AreaChart data={data.timeseries} />
              ) : (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pulse-text-secondary)' }}>
                  {loading ? 'Loading...' : 'No data available'}
                </div>
              )}
            </div>
          </div>

          <div className="pulse-overview-tasks">
            <TasksList recentItems={recentItems} eventItems={eventItems} />
          </div>
        </div>

        <div className="pulse-section">
          <SitesTable sites={sitesTableData} loading={loading && sites.length === 0} />
        </div>
      </div>
    </PageTransition>
  );
}
