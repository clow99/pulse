'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, Title, Badge } from '@velocityuikit/velocityui';
import { subDays, startOfDay, endOfDay, format, parseISO } from 'date-fns';
import { PageTransition } from '@/components/motion';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { ReportTable } from '@/components/dashboard/ReportTable';

interface MetricSummary {
  name: string;
  count: number;
  average: number;
  p75: number;
  ratings: { good: number; needsImprovement: number; poor: number };
}

interface PerformanceData {
  metrics: MetricSummary[];
  slowestPages: {
    pathname: string;
    samples: number;
    poorSamples: number;
    lcpP75: number | null;
    inpP75: number | null;
    clsP75: number | null;
  }[];
  devices: { name: string; samples: number; poorSamples: number; poorRate: number }[];
  browsers: { name: string; samples: number; poorSamples: number; poorRate: number }[];
}

export default function PerformancePage() {
  const siteId = useSearchParams().get('siteId') || '';
  const [from, setFrom] = useState(() => format(startOfDay(subDays(new Date(), 30)), 'yyyy-MM-dd'));
  const [to, setTo] = useState(() => format(endOfDay(new Date()), 'yyyy-MM-dd'));
  const [data, setData] = useState<PerformanceData | null>(null);

  const loadData = useCallback(async () => {
    if (!siteId) return;
    const params = new URLSearchParams({
      siteId,
      from: startOfDay(parseISO(from)).toISOString(),
      to: endOfDay(parseISO(to)).toISOString(),
    });
    const res = await fetch(`/api/reports/performance?${params}`);
    if (res.ok) setData(await res.json());
  }, [from, siteId, to]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  return (
    <PageTransition>
      <div className="pulse-page">
        <div className="pulse-page-header">
          <div>
            <Title level="h1" size="lg">Performance</Title>
            <p style={{ color: 'var(--pulse-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Core Web Vitals are collected only for sites with web-vitals tracking enabled.
            </p>
          </div>
          <DateRangePicker from={from} to={to} onChange={(nextFrom, nextTo) => { setFrom(nextFrom); setTo(nextTo); }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {(data?.metrics ?? []).map((metric) => (
            <Card key={metric.name} variant="shadow">
              <Card.Body>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{metric.name}</strong>
                  <Badge size="sm" variant={metric.ratings.poor > 0 ? 'warning' : 'success'}>
                    {metric.count} samples
                  </Badge>
                </div>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.75rem 0 0' }}>{metric.p75}</p>
                <p style={{ color: 'var(--pulse-text-secondary)', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>
                  p75; avg {metric.average}
                </p>
              </Card.Body>
            </Card>
          ))}
        </div>

        <div className="pulse-section">
          <Title level="h3" size="sm">Slowest Pages</Title>
          <div style={{ marginTop: '1rem' }}>
            <ReportTable
              columns={[
                { key: 'pathname', header: 'Page' },
                { key: 'samples', header: 'Samples' },
                { key: 'poorSamples', header: 'Poor' },
                { key: 'lcpP75', header: 'LCP p75', render: (value) => value === null ? '--' : String(value) },
                { key: 'inpP75', header: 'INP p75', render: (value) => value === null ? '--' : String(value) },
                { key: 'clsP75', header: 'CLS p75', render: (value) => value === null ? '--' : String(value) },
              ]}
              data={data?.slowestPages ?? []}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          <div className="pulse-section">
            <Title level="h3" size="sm">Devices</Title>
            <ReportTable columns={qualityColumns} data={data?.devices ?? []} />
          </div>
          <div className="pulse-section">
            <Title level="h3" size="sm">Browsers</Title>
            <ReportTable columns={qualityColumns} data={data?.browsers ?? []} />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

const qualityColumns = [
  { key: 'name', header: 'Name' },
  { key: 'samples', header: 'Samples' },
  { key: 'poorSamples', header: 'Poor' },
  { key: 'poorRate', header: 'Poor %', render: (value: unknown) => `${(value as number).toFixed(1)}%` },
];
