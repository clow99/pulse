'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Title } from '@velocityuikit/velocityui';
import { PageTransition } from '@/components/motion';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { ReportTable } from '@/components/dashboard/ReportTable';
import { UptimeTimeline } from '@/components/dashboard/UptimeTimeline';
import { UptimeResponseChart } from '@/components/dashboard/UptimeResponseChart';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import type { UptimeSummary, UptimeTimeseriesPoint, UptimeCheckResult } from '@/types';

interface UptimeData {
  summary: UptimeSummary;
  timeseries: UptimeTimeseriesPoint[];
  recentChecks: UptimeCheckResult[];
}

const STATUS_LABELS: Record<string, string> = {
  up: 'Operational',
  down: 'Down',
  unknown: 'No data',
};

const checksColumns = [
  {
    key: 'checkedAt',
    header: 'Time',
    sortable: false,
    render: (value: unknown) => {
      const d = new Date(value as string);
      return d.toLocaleString();
    },
  },
  {
    key: 'isUp',
    header: 'Status',
    sortable: false,
    render: (value: unknown) => {
      const isUp = value as boolean;
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: isUp ? 'var(--pulse-success)' : 'var(--pulse-danger)',
            flexShrink: 0,
          }} />
          {isUp ? 'Up' : 'Down'}
        </span>
      );
    },
  },
  {
    key: 'statusCode',
    header: 'Status Code',
    sortable: false,
    render: (value: unknown) => {
      const code = value as number;
      return code === 0 ? 'N/A' : String(code);
    },
  },
  {
    key: 'responseTime',
    header: 'Response Time',
    sortable: false,
    render: (value: unknown) => `${value}ms`,
  },
  {
    key: 'error',
    header: 'Error',
    sortable: false,
    render: (value: unknown) => {
      const err = value as string | null;
      if (!err) return <span style={{ color: 'var(--pulse-text-secondary)' }}>--</span>;
      return (
        <span style={{ color: 'var(--pulse-danger)', fontSize: '0.75rem' }}>
          {err.length > 60 ? `${err.slice(0, 60)}...` : err}
        </span>
      );
    },
  },
];

export default function UptimePage() {
  const searchParams = useSearchParams();
  const siteId = searchParams.get('siteId') || '';

  const [from, setFrom] = useState(() => startOfDay(subDays(new Date(), 30)).toISOString());
  const [to, setTo] = useState(() => endOfDay(new Date()).toISOString());
  const [data, setData] = useState<UptimeData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ siteId, from, to });
      const res = await fetch(`/api/reports/uptime?${params}`);
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

  const summary = data?.summary;
  const statusLabel = summary ? STATUS_LABELS[summary.currentStatus] : '--';

  const stats = summary
    ? [
        {
          label: 'Status',
          value: summary.currentStatus === 'up' ? 1 : 0,
          change: 0,
          formatFn: () => statusLabel,
        },
        {
          label: 'Uptime',
          value: summary.uptimePercentage,
          change: 0,
          formatFn: (n: number) => `${n.toFixed(2)}%`,
        },
        {
          label: 'Avg Response',
          value: summary.avgResponseTime,
          change: 0,
          formatFn: (n: number) => `${Math.round(n)}ms`,
        },
        {
          label: 'Total Checks',
          value: summary.totalChecks,
          change: 0,
        },
      ]
    : [];

  return (
    <PageTransition>
      <div className="pulse-page">
        <div className="pulse-page-header">
          <div>
            <Title level="h2" size="lg">Uptime Monitor</Title>
            <p style={{ fontSize: '0.875rem', color: 'var(--pulse-text-secondary)', marginTop: '0.25rem' }}>
              Track availability and response times for your sites
            </p>
          </div>
          <DateRangePicker from={from} to={to} onChange={handleDateChange} />
        </div>

        {summary && (
          <div className="pulse-section">
            <div className="pulse-uptime-status-banner" data-status={summary.currentStatus}>
              <span
                className="pulse-uptime-status-dot-lg"
                style={{
                  backgroundColor: summary.currentStatus === 'up'
                    ? 'var(--pulse-success)'
                    : summary.currentStatus === 'down'
                      ? 'var(--pulse-danger)'
                      : 'var(--pulse-text-secondary)',
                }}
              />
              <span className="pulse-uptime-status-text">
                {statusLabel}
              </span>
              {summary.lastCheck && (
                <span style={{ fontSize: '0.75rem', color: 'var(--pulse-text-secondary)' }}>
                  Last checked: {new Date(summary.lastCheck.checkedAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}

        {stats.length > 0 && (
          <div className="pulse-section">
            <StatsCards stats={stats} />
          </div>
        )}

        {data?.timeseries && data.timeseries.length > 0 && (
          <div className="pulse-section">
            <UptimeTimeline data={data.timeseries} />
          </div>
        )}

        {data?.timeseries && data.timeseries.length > 0 && (
          <div className="pulse-section">
            <div className="pulse-chart-container">
              <div className="pulse-section-header" style={{ marginBottom: '1rem' }}>
                <Title level="h3" size="sm">Response Time</Title>
              </div>
              <UptimeResponseChart data={data.timeseries} />
            </div>
          </div>
        )}

        <div className="pulse-section">
          <div className="pulse-section-header" style={{ marginBottom: '1rem' }}>
            <Title level="h3" size="sm">Recent Checks</Title>
          </div>
          <ReportTable
            columns={checksColumns}
            data={data?.recentChecks ?? []}
            loading={loading}
          />
        </div>
      </div>
    </PageTransition>
  );
}
