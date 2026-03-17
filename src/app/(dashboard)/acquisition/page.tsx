'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Title, Tabs } from '@velocityuikit/velocityui';
import { motion } from 'framer-motion';
import { PageTransition } from '@/components/motion';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { BarChart } from '@/components/dashboard/BarChart';
import { ReportTable } from '@/components/dashboard/ReportTable';
import { subDays, startOfDay, endOfDay, parseISO, format } from 'date-fns';

interface AcquisitionItem {
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  count: number;
  percentage: number;
}

interface AcquisitionData {
  referrers: AcquisitionItem[];
  utmSources: AcquisitionItem[];
  utmMediums: AcquisitionItem[];
  utmCampaigns: AcquisitionItem[];
}

const ACQUISITION_TABS = [
  { value: 'referrers', label: 'Referrers', key: 'referrer' as const },
  { value: 'utm_sources', label: 'UTM Sources', key: 'utmSource' as const },
  { value: 'utm_mediums', label: 'UTM Mediums', key: 'utmMedium' as const },
  { value: 'utm_campaigns', label: 'UTM Campaigns', key: 'utmCampaign' as const },
] as const;

function toChartData(
  items: AcquisitionItem[],
  nameKey: 'referrer' | 'utmSource' | 'utmMedium' | 'utmCampaign'
) {
  return items.map((item) => ({
    name: String(item[nameKey] ?? ''),
    value: item.count,
    percentage: item.percentage,
  }));
}

function toTableData(
  items: AcquisitionItem[],
  nameKey: 'referrer' | 'utmSource' | 'utmMedium' | 'utmCampaign'
) {
  return items.map((item) => ({
    name: String(item[nameKey] ?? ''),
    count: item.count,
    percentage: item.percentage,
  }));
}

export default function AcquisitionPage() {
  const searchParams = useSearchParams();
  const siteId = searchParams.get('siteId') || '';

  const [from, setFrom] = useState(() =>
    format(startOfDay(subDays(new Date(), 30)), 'yyyy-MM-dd')
  );
  const [to, setTo] = useState(() =>
    format(endOfDay(new Date()), 'yyyy-MM-dd')
  );
  const [activeTab, setActiveTab] = useState('referrers');
  const [data, setData] = useState<AcquisitionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const fromISO = startOfDay(parseISO(from)).toISOString();
      const toISO = endOfDay(parseISO(to)).toISOString();
      const params = new URLSearchParams({ siteId, from: fromISO, to: toISO });
      const res = await fetch(`/api/reports/acquisition?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
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

  const tabItems = ACQUISITION_TABS.map((tab) => {
    const cfg = ACQUISITION_TABS.find((t) => t.value === tab.value);
    const tabItems =
      cfg && data
        ? (data[tab.value === 'referrers'
            ? 'referrers'
            : tab.value === 'utm_sources'
              ? 'utmSources'
              : tab.value === 'utm_mediums'
                ? 'utmMediums'
                : 'utmCampaigns'] as AcquisitionItem[])
        : [];
    const chart = toChartData(tabItems, cfg!.key);
    const table = toTableData(tabItems, cfg!.key);

    return {
      value: tab.value,
      label: tab.label,
      children: (
        <motion.div
          key={tab.value}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="pulse-section">
            <div className="pulse-chart-container">
              <BarChart data={chart} />
            </div>
            <ReportTable
              columns={[
                { key: 'name', header: tab.label },
                { key: 'count', header: 'Count' },
                {
                  key: 'percentage',
                  header: '%',
                  render: (val: unknown) =>
                    `${(val as number).toFixed(1)}%`,
                },
              ]}
              data={table}
              loading={loading}
            />
          </div>
        </motion.div>
      ),
    };
  });

  return (
    <PageTransition>
      <div className="pulse-page">
        <div className="pulse-page-header">
          <Title level="h1" size="lg">
            Acquisition
          </Title>
          <DateRangePicker from={from} to={to} onChange={handleDateChange} />
        </div>

        <div className="pulse-section">
          <Tabs value={activeTab} onChange={setActiveTab} items={tabItems} />
        </div>
      </div>
    </PageTransition>
  );
}
