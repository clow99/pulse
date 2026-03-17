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

interface TechnologyItem {
  browser?: string;
  os?: string;
  device?: string;
  language?: string;
  count: number;
  percentage: number;
}

interface TechnologyData {
  browsers: TechnologyItem[];
  operatingSystems: TechnologyItem[];
  devices: TechnologyItem[];
  languages: TechnologyItem[];
}

const TECHNOLOGY_TABS = [
  { value: 'browsers', label: 'Browsers', dataKey: 'browsers' as const, nameKey: 'browser' as const },
  { value: 'os', label: 'Operating Systems', dataKey: 'operatingSystems' as const, nameKey: 'os' as const },
  { value: 'devices', label: 'Devices', dataKey: 'devices' as const, nameKey: 'device' as const },
  { value: 'languages', label: 'Languages', dataKey: 'languages' as const, nameKey: 'language' as const },
] as const;

function toChartData(
  items: TechnologyItem[],
  nameKey: 'browser' | 'os' | 'device' | 'language'
) {
  return items.map((item) => ({
    name: String(item[nameKey] ?? ''),
    value: item.count,
    percentage: item.percentage,
  }));
}

function toTableData(
  items: TechnologyItem[],
  nameKey: 'browser' | 'os' | 'device' | 'language'
) {
  return items.map((item) => ({
    name: String(item[nameKey] ?? ''),
    count: item.count,
    percentage: item.percentage,
  }));
}

export default function TechnologyPage() {
  const searchParams = useSearchParams();
  const siteId = searchParams.get('siteId') || '';

  const [from, setFrom] = useState(() =>
    format(startOfDay(subDays(new Date(), 30)), 'yyyy-MM-dd')
  );
  const [to, setTo] = useState(() =>
    format(endOfDay(new Date()), 'yyyy-MM-dd')
  );
  const [activeTab, setActiveTab] = useState('browsers');
  const [data, setData] = useState<TechnologyData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const fromISO = startOfDay(parseISO(from)).toISOString();
      const toISO = endOfDay(parseISO(to)).toISOString();
      const params = new URLSearchParams({ siteId, from: fromISO, to: toISO });
      const res = await fetch(`/api/reports/technology?${params}`);
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

  const tabItems = TECHNOLOGY_TABS.map((tab) => {
    const items = (data?.[tab.dataKey] ?? []) as TechnologyItem[];
    const chart = toChartData(items, tab.nameKey);
    const table = toTableData(items, tab.nameKey);

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
            Technology
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
