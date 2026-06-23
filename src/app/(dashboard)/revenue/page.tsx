'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, Title } from '@velocityuikit/velocityui';
import { subDays, startOfDay, endOfDay, format, parseISO } from 'date-fns';
import { PageTransition } from '@/components/motion';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { ReportTable } from '@/components/dashboard/ReportTable';

interface RevenueRow {
  name: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

interface RevenueData {
  summary: {
    totalRevenue: number;
    orders: number;
    averageOrderValue: number;
    currency: string;
  };
  breakdowns: Record<string, RevenueRow[]>;
}

const breakdownLabels: Record<string, string> = {
  sources: 'Sources',
  campaigns: 'Campaigns',
  referrers: 'Referrers',
  landingPages: 'Landing Pages',
  devices: 'Devices',
  countries: 'Countries',
};

export default function RevenuePage() {
  const siteId = useSearchParams().get('siteId') || '';
  const [from, setFrom] = useState(() => format(startOfDay(subDays(new Date(), 30)), 'yyyy-MM-dd'));
  const [to, setTo] = useState(() => format(endOfDay(new Date()), 'yyyy-MM-dd'));
  const [data, setData] = useState<RevenueData | null>(null);
  const [activeBreakdown, setActiveBreakdown] = useState('sources');

  const loadData = useCallback(async () => {
    if (!siteId) return;
    const params = new URLSearchParams({
      siteId,
      from: startOfDay(parseISO(from)).toISOString(),
      to: endOfDay(parseISO(to)).toISOString(),
    });
    const res = await fetch(`/api/reports/revenue?${params}`);
    if (res.ok) setData(await res.json());
  }, [from, siteId, to]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const currency = data?.summary.currency === 'MIXED' ? '' : data?.summary.currency || '';

  return (
    <PageTransition>
      <div className="pulse-page">
        <div className="pulse-page-header">
          <Title level="h1" size="lg">Revenue</Title>
          <DateRangePicker from={from} to={to} onChange={(nextFrom, nextTo) => { setFrom(nextFrom); setTo(nextTo); }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            ['Total Revenue', `${currency} ${(data?.summary.totalRevenue ?? 0).toLocaleString()}`],
            ['Orders', (data?.summary.orders ?? 0).toLocaleString()],
            ['Average Order', `${currency} ${(data?.summary.averageOrderValue ?? 0).toLocaleString()}`],
          ].map(([label, value]) => (
            <Card key={label} variant="shadow">
              <Card.Body>
                <p style={{ color: 'var(--pulse-text-secondary)', fontSize: '0.75rem', margin: 0 }}>{label}</p>
                <strong style={{ display: 'block', fontSize: '1.5rem', marginTop: '0.25rem' }}>{value}</strong>
              </Card.Body>
            </Card>
          ))}
        </div>

        <div className="pulse-section">
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {Object.entries(breakdownLabels).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveBreakdown(key)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 6,
                  border: '1px solid var(--pulse-border)',
                  background: activeBreakdown === key ? 'var(--pulse-accent)' : 'var(--pulse-bg-card)',
                  color: activeBreakdown === key ? '#fff' : 'var(--pulse-text-primary)',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <ReportTable
            columns={[
              { key: 'name', header: breakdownLabels[activeBreakdown] || 'Name' },
              { key: 'revenue', header: 'Revenue', render: (value) => `${currency} ${(value as number).toLocaleString()}` },
              { key: 'orders', header: 'Orders' },
              { key: 'averageOrderValue', header: 'AOV', render: (value) => `${currency} ${(value as number).toLocaleString()}` },
            ]}
            data={data?.breakdowns[activeBreakdown] ?? []}
          />
        </div>
      </div>
    </PageTransition>
  );
}
