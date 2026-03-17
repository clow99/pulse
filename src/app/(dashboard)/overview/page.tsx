'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Title } from '@velocityuikit/velocityui';
import dynamic from 'next/dynamic';
import { PageTransition } from '@/components/motion';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { AreaChart } from '@/components/dashboard/AreaChart';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { ReportTable } from '@/components/dashboard/ReportTable';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import type { StatsOverview, TimeseriesPoint, TopPage, TopReferrer } from '@/types';

const TrafficParticles = dynamic(
  () => import('@/components/three/TrafficParticles'),
  { ssr: false }
);

interface OverviewData {
  stats: StatsOverview;
  timeseries: TimeseriesPoint[];
  topPages: TopPage[];
  topReferrers: TopReferrer[];
}

export default function OverviewPage() {
  const searchParams = useSearchParams();
  const siteId = searchParams.get('siteId') || '';

  const [from, setFrom] = useState(() => startOfDay(subDays(new Date(), 30)).toISOString());
  const [to, setTo] = useState(() => endOfDay(new Date()).toISOString());
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ siteId, from, to });
      const res = await fetch(`/api/reports/overview?${params}`);
      if (res.ok) {
        setData(await res.json());
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
      ]
    : [];

  const pageColumns = [
    { key: 'pathname', header: 'Page' },
    { key: 'views', header: 'Views', sortable: true },
    { key: 'visitors', header: 'Visitors', sortable: true },
  ];

  const referrerColumns = [
    { key: 'referrer', header: 'Source' },
    { key: 'visitors', header: 'Visitors', sortable: true },
    {
      key: 'percentage',
      header: '%',
      render: (val: unknown) => `${(val as number).toFixed(1)}%`,
    },
  ];

  return (
    <PageTransition>
      <div className="pulse-page">
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400, opacity: 0.15, pointerEvents: 'none', overflow: 'hidden' }}>
          <TrafficParticles />
        </div>

        <div className="pulse-page-header">
          <Title level="h1" size="lg">Overview</Title>
          <DateRangePicker from={from} to={to} onChange={handleDateChange} />
        </div>

        {stats.length > 0 && (
          <div className="pulse-section">
            <StatsCards stats={stats} />
          </div>
        )}

        {data?.timeseries && data.timeseries.length > 0 && (
          <div className="pulse-section">
            <div className="pulse-chart-container">
              <Title level="h3" size="sm" style={{ marginBottom: '1rem' }}>
                Traffic Over Time
              </Title>
              <AreaChart data={data.timeseries} />
            </div>
          </div>
        )}

        <div className="pulse-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="pulse-chart-container">
            <Title level="h3" size="sm" style={{ marginBottom: '1rem' }}>
              Top Pages
            </Title>
            <ReportTable
              columns={pageColumns}
              data={data?.topPages || []}
              loading={loading}
            />
          </div>
          <div className="pulse-chart-container">
            <Title level="h3" size="sm" style={{ marginBottom: '1rem' }}>
              Top Sources
            </Title>
            <ReportTable
              columns={referrerColumns}
              data={data?.topReferrers || []}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
