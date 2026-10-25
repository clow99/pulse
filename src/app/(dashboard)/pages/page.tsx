'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Title, Input, Button } from '@velocityuikit/velocityui';
import { PageTransition } from '@/components/motion';
import { useReportDateRange } from '@/components/dashboard/useReportDateRange';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { ReportTable } from '@/components/dashboard/ReportTable';
import { DashboardIcon } from '@/components/dashboard/DashboardIcon';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

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

  const { from, to, setRange } = useReportDateRange();
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pagination, setPagination] = useState({ scope: '', page: 1 });
  const [sortKey, setSortKey] = useState<string>('views');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const scope = `${siteId}:${from}:${to}:${appliedSearch}`;
  const page = pagination.scope === scope ? pagination.page : 1;
  const key = `${scope}:${page}`;
  const [result, setResult] = useState<{
    key: string;
    data: PagesResponse;
  } | null>(null);
  const [failure, setFailure] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const data = result?.key === key ? result.data : null;
  const error = failure?.key === key ? failure.message : '';
  const loading = !!siteId && (pendingKey === key || (!data && !error));

  useEffect(() => {
    if (!siteId) return;
    const controller = new AbortController();
    setPendingKey(key);
    setFailure(null);
    async function fetchData() {
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
        const res = await fetch(`/api/reports/pages?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok)
          throw new Error(
            res.status === 401
              ? 'Your session has expired. Sign in again to view reports.'
              : 'We couldn’t load your pages. Please try again.',
          );
        const json = (await res.json()) as PagesResponse;
        if (!controller.signal.aborted) setResult({ key, data: json });
      } catch (cause) {
        if (!controller.signal.aborted)
          setFailure({
            key,
            message:
              cause instanceof Error
                ? cause.message
                : 'We couldn’t load your pages. Please try again.',
          });
      } finally {
        if (!controller.signal.aborted) setPendingKey(null);
      }
    }
    fetchData();
    return () => controller.abort();
  }, [siteId, from, to, page, appliedSearch, key, retry]);

  const handleDateChange = (newFrom: string, newTo: string) => {
    setRange(newFrom, newTo);
  };

  const handleSearch = () => {
    setAppliedSearch(searchInput);
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

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  const columns = [
    { key: 'pathname', header: 'Path', sortable: true },
    { key: 'views', header: 'Views', sortable: true },
    { key: 'visitors', header: 'Est. Visitors', sortable: true },
  ];

  return (
    <PageTransition>
      <div className="pulse-page">
        <div className="pulse-page-header">
          <div className="pulse-page-title-group">
            <Title level="h1" size="lg">
              Pages
            </Title>
            <p className="pulse-page-subtitle">
              See which pages bring visitors in and keep them exploring.
            </p>
          </div>
          <DateRangePicker from={from} to={to} onChange={handleDateChange} />
        </div>
        <form
          className="pulse-toolbar pulse-page-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            handleSearch();
          }}
        >
          <label className="pulse-search-field">
            <span>Page path</span>
            <Input
              type="text"
              placeholder="Filter by pathname"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              size="sm"
            />
          </label>
          <Button
            variant="secondary"
            size="sm"
            type="submit"
            disabled={!siteId}
          >
            <DashboardIcon name="search" width={16} height={16} />
            Search
          </Button>
          {(searchInput || appliedSearch) && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => {
                setSearchInput('');
                setAppliedSearch('');
              }}
            >
              Clear search
            </Button>
          )}
          <span className="pulse-results-count" role="status">
            {data
              ? `${data.total.toLocaleString()} ${data.total === 1 ? 'page' : 'pages'} found`
              : loading
                ? 'Loading pages…'
                : ''}
          </span>
        </form>

        <div className="pulse-section">
          {!siteId ? (
            <section className="pulse-overview-state">
              <DashboardIcon name="pages" width={32} height={32} />
              <h2>Connect a website to explore its pages</h2>
              <p>
                Add a website and install the tracker to start collecting page
                visits.
              </p>
              <Link
                className="pulse-action-button primary"
                href="/settings/sites"
              >
                Add a website
              </Link>
            </section>
          ) : error ? (
            <div className="pulse-report-notice" role="alert">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
              >
                Try again
              </button>
            </div>
          ) : (
            <ReportTable
              columns={columns}
              data={sortedData}
              onSort={handleSort}
              sortKey={sortKey}
              sortDir={sortDir}
              page={page}
              totalPages={totalPages}
              onPageChange={(nextPage) =>
                setPagination({ scope, page: nextPage })
              }
              loading={loading}
              label="Page traffic results"
              emptyTitle={
                appliedSearch
                  ? 'No pages match your search'
                  : 'No page visits yet'
              }
              emptyDescription={
                appliedSearch
                  ? 'Try a different path or clear your search to see all pages.'
                  : 'Try a wider reporting period or check that your tracker is installed.'
              }
            />
          )}
        </div>
      </div>
    </PageTransition>
  );
}
