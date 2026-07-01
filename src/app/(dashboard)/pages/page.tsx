'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Title, Input, Button } from '@velocityuikit/velocityui';
import { PageTransition } from '@/components/motion';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { ReportTable } from '@/components/dashboard/ReportTable';
import { subDays, startOfDay, endOfDay, parseISO, format } from 'date-fns';

interface PagesRow {
  pathname: string;
  views: number;
  visitors: number;
}

interface PagesResponse {
  data: PagesRow[];
  total: number;
  page: number;
  limit: number;
}

export default function PagesPage() {
  const searchParams = useSearchParams();
  const siteId = searchParams.get('siteId') || '';

  const [from, setFrom] = useState(() =>
    format(startOfDay(subDays(new Date(), 30)), 'yyyy-MM-dd')
  );
  const [to, setTo] = useState(() =>
    format(endOfDay(new Date()), 'yyyy-MM-dd')
  );
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>('views');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [data, setData] = useState<PagesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const fromISO = startOfDay(parseISO(from)).toISOString();
      const toISO = endOfDay(parseISO(to)).toISOString();
      const params = new URLSearchParams({
        siteId,
        from: fromISO,
        to: toISO,
        page: String(page),
        limit: '20',
      });
      if (appliedSearch.trim()) params.set('search', appliedSearch.trim());
      const res = await fetch(`/api/reports/pages?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [siteId, from, to, page, appliedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDateChange = (newFrom: string, newTo: string) => {
    setFrom(newFrom);
    setTo(newTo);
    setPage(1);
  };

  const handleSearch = () => {
    setAppliedSearch(searchInput);
    setPage(1);
  };

  const handleSort = (key: string, dir: 'asc' | 'desc') => {
    setSortKey(key);
    setSortDir(dir);
  };

  const sortedData = data?.data
    ? [...data.data].sort((a, b) => {
        const aVal =
          sortKey === 'pathname'
            ? a.pathname
            : sortKey === 'views'
              ? a.views
              : a.visitors;
        const bVal =
          sortKey === 'pathname'
            ? b.pathname
            : sortKey === 'views'
              ? b.views
              : b.visitors;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDir === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        const diff = (aVal as number) - (bVal as number);
        return sortDir === 'asc' ? diff : -diff;
      })
    : [];

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  const columns = [
    { key: 'pathname', header: 'Path', sortable: true },
    { key: 'views', header: 'Views', sortable: true },
    { key: 'visitors', header: 'Est. Visitors', sortable: true },
  ];

  return (
    <PageTransition>
      <div className="pulse-page">
        <div className="pulse-page-header">
          <Title level="h1" size="lg">
            Pages
          </Title>
          <DateRangePicker from={from} to={to} onChange={handleDateChange} />
        </div>
        <div className="pulse-toolbar">
          <Input
            type="text"
            placeholder="Filter by pathname"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            size="sm"
            style={{ width: 'min(100%, 320px)' }}
          />
          <Button variant="secondary" size="sm" onClick={handleSearch}>
            Search
          </Button>
        </div>

        <div className="pulse-section">
          <ReportTable
            columns={columns}
            data={sortedData}
            onSort={handleSort}
            sortKey={sortKey}
            sortDir={sortDir}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            loading={loading}
          />
        </div>
      </div>
    </PageTransition>
  );
}
