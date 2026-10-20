'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import { useDashboard } from '@/components/dashboard/DashboardShell';
import { StatsCards, type StatItem } from '@/components/dashboard/StatsCards';
import { AreaChart } from '@/components/dashboard/AreaChart';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { DashboardIcon } from '@/components/dashboard/DashboardIcon';
import { UptimeSummaryCard } from '@/components/dashboard/UptimeSummaryCard';
import { useReportDateRange } from '@/components/dashboard/useReportDateRange';
import { reportDateRange } from '@/lib/report-date-range';
import type {
  StatsOverview,
  TimeseriesPoint,
  TopPage,
  TopReferrer,
  UptimeSummary,
} from '@/types';

interface OverviewData {
  stats: StatsOverview;
  timeseries: TimeseriesPoint[];
  topPages: TopPage[];
  topReferrers: TopReferrer[];
}
interface EventSummary {
  name: string;
  count: number;
  uniqueTriggers: number;
}
interface RevenueSummary {
  totalRevenue: number;
  currency: string;
}
interface InsightItem {
  id: string;
  severity: string;
  title: string;
  body: string;
}
interface ReportState {
  key: string;
  overview: OverviewData;
  events: EventSummary[] | null;
  revenue: RevenueSummary | null;
  insights: InsightItem[] | null;
  uptime: UptimeSummary | null;
  unavailable: string[];
}

export default function OverviewPage() {
  const { sites } = useDashboard();
  const params = useSearchParams();
  const site =
    sites.find((item) => item.id === params.get('siteId')) || sites[0];
  const siteId = site?.id || '';
  const { from, to, setRange } = useReportDateRange();
  const key = `${siteId}:${from}:${to}`;
  const [result, setResult] = useState<ReportState | null>(null);
  const [failure, setFailure] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [pending, setPending] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [updated, setUpdated] = useState('');
  const report = result?.key === key ? result : null;
  const error = failure?.key === key ? failure.message : '';
  const loading = !!siteId && (pending || (!report && !error));
  const range = reportDateRange(from, to);
  const reportParams = new URLSearchParams({ siteId, ...range });
  const href = (path: string) =>
    `/${path}?${new URLSearchParams({ siteId, from, to })}`;
  const period = `${format(parseISO(from), 'MMM d')} – ${format(parseISO(to), 'MMM d, yyyy')}`;

  useEffect(() => {
    if (!siteId) return;
    const controller = new AbortController();
    setPending(true);
    setFailure(null);
    setResult(null);
    const query = new URLSearchParams({ siteId, ...reportDateRange(from, to) });
    async function read<T>(url: string): Promise<T> {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? 'Your session has expired. Sign in again to view reports.'
            : 'We couldn’t load this report. Please try again.',
        );
      return response.json();
    }
    async function load() {
      const responses = await Promise.allSettled([
        read<OverviewData>(`/api/reports/overview?${query}`),
        read<EventSummary[]>(`/api/reports/events?${query}`),
        read<{ summary: RevenueSummary }>(`/api/reports/revenue?${query}`),
        read<InsightItem[]>(`/api/insights?${new URLSearchParams({ siteId })}`),
        read<UptimeSummary>(
          `/api/reports/uptime/summary?${new URLSearchParams({ siteId })}`,
        ),
      ]);
      if (controller.signal.aborted) return;
      const [overview, events, revenue, insights, uptime] = responses;
      if (overview.status === 'rejected') {
        setFailure({
          key,
          message:
            overview.reason instanceof Error
              ? overview.reason.message
              : 'We couldn’t load this report. Please try again.',
        });
      } else {
        const names = ['Traffic', 'Events', 'Revenue', 'Insights', 'Uptime'];
        setResult({
          key,
          overview: overview.value,
          events: events.status === 'fulfilled' ? events.value : null,
          revenue:
            revenue.status === 'fulfilled' ? revenue.value.summary : null,
          insights:
            insights.status === 'fulfilled' ? insights.value.slice(0, 3) : null,
          uptime: uptime.status === 'fulfilled' ? uptime.value : null,
          unavailable: responses.flatMap((response, index) =>
            response.status === 'rejected' ? [names[index]] : [],
          ),
        });
        setUpdated(
          new Date().toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          }),
        );
      }
      setPending(false);
    }
    void load();
    return () => controller.abort();
  }, [siteId, from, to, key, refresh]);

  async function exportReport() {
    setExporting(true);
    setExportError(null);
    try {
      const response = await fetch(
        `/api/reports/export?${reportParams}&reports=overview&format=csv`,
      );
      if (!response.ok) throw new Error('Export failed. Please try again.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `pulse-overview-${from}-${to}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError({ key, message: 'Export failed. Please try again.' });
    } finally {
      setExporting(false);
    }
  }

  const data = report?.overview;
  const stats: StatItem[] = data
    ? [
        {
          label: 'Visitors',
          value: data.stats.visitors,
          change: data.stats.visitorsChange,
          detail: 'vs. previous period',
        },
        {
          label: 'Pageviews',
          value: data.stats.pageviews,
          change: data.stats.pageviewsChange,
          detail: 'vs. previous period',
        },
        {
          label: 'Views per visit',
          value: data.stats.avgPagesPerVisit,
          change: 0,
          hideChange: true,
          formatFn: (n) => n.toFixed(1),
          detail: 'Pages explored per visit',
        },
        {
          label: 'Bounce rate',
          value: data.stats.bounceRate,
          change: 0,
          hideChange: true,
          formatFn: (n) => `${n.toFixed(1)}%`,
          detail: 'Single-page visits',
        },
      ]
    : [];

  return (
    <div className="pulse-page pulse-overview-page">
      <header className="pulse-overview-heading">
        <div>
          <p className="pulse-overview-eyebrow">Your website, at a glance</p>
          <h1>
            Overview<span className="pulse-heading-dot">.</span>
          </h1>
          <p className="pulse-overview-subtitle">
            {site ? (
              <>
                <strong>{site.name}</strong>
                <span className="pulse-subtitle-divider">/</span>
                {site.domain}
              </>
            ) : (
              'Connect your first website to start exploring your analytics.'
            )}
          </p>
        </div>
        <Link href="/settings/sites" className="pulse-action-button">
          Manage sites
          <DashboardIcon name="arrow" />
        </Link>
      </header>

      {!siteId ? (
        <section className="pulse-overview-state">
          <DashboardIcon name="overview" width={36} height={36} />
          <h2>Connect your first website.</h2>
          <p>
            Add your website and install the tracker to see traffic, events, and
            performance here.
          </p>
          <Link className="pulse-action-button primary" href="/settings/sites">
            Add a website
            <DashboardIcon name="arrow" />
          </Link>
        </section>
      ) : (
        <>
          <div className="pulse-overview-toolbar">
            <div>
              <p className="pulse-control-label">Reporting period</p>
              <DateRangePicker from={from} to={to} onChange={setRange} />
            </div>
            <div className="pulse-overview-actions">
              <button
                className="pulse-action-button"
                disabled={loading}
                onClick={() => setRefresh((n) => n + 1)}
              >
                <DashboardIcon
                  name="refresh"
                  className={loading ? 'pulse-is-spinning' : ''}
                />
                Refresh
              </button>
              <button
                className="pulse-action-button"
                disabled={!report || loading || exporting}
                onClick={exportReport}
              >
                <DashboardIcon name="download" />
                {exporting ? 'Exporting…' : 'Export CSV'}
              </button>
            </div>
          </div>
          <div className="pulse-overview-period">
            <span>{period}</span>
            <span role="status">
              {loading
                ? 'Updating report…'
                : error
                  ? 'Report unavailable'
                  : `Updated ${updated}`}
            </span>
          </div>
          {exportError?.key === key && (
            <div className="pulse-report-notice" role="alert">
              {exportError.message}
            </div>
          )}
          {error ? (
            <section className="pulse-overview-state" role="alert">
              <DashboardIcon name="overview" width={36} height={36} />
              <h2>Your report couldn’t be loaded.</h2>
              <p>{error}</p>
              <button
                className="pulse-action-button primary"
                onClick={() => setRefresh((n) => n + 1)}
              >
                Try again
              </button>
            </section>
          ) : loading ? (
            <div
              className="pulse-overview-skeleton"
              role="status"
              aria-label="Loading analytics"
            >
              <div className="pulse-metric-skeletons">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} />
                ))}
              </div>
              <div className="pulse-chart-skeleton" />
            </div>
          ) : (
            report &&
            data && (
              <>
                {report.unavailable.length > 0 && (
                  <div className="pulse-report-notice" role="status">
                    <span>
                      {report.unavailable.join(', ')} temporarily unavailable.
                      Traffic data is still shown below.
                    </span>
                    <button
                      type="button"
                      onClick={() => setRefresh((n) => n + 1)}
                    >
                      Retry
                    </button>
                  </div>
                )}
                <StatsCards
                  stats={stats}
                  className="pulse-overview-metrics"
                  staticValues
                />
                <div className="pulse-overview-primary-grid">
                  <section
                    className="pulse-chart-container pulse-traffic-card"
                    aria-labelledby="traffic-title"
                  >
                    <div className="pulse-panel-heading">
                      <div>
                        <p className="pulse-control-label">Audience</p>
                        <h2 id="traffic-title">Traffic over time</h2>
                      </div>
                      <div className="pulse-chart-legend">
                        <span>
                          <i />
                          Visitors
                        </span>
                        <span>
                          <i />
                          Pageviews
                        </span>
                      </div>
                    </div>
                    {data.timeseries.length && data.stats.pageviews > 0 ? (
                      <AreaChart
                        data={data.timeseries}
                        height={300}
                        staticRender
                      />
                    ) : (
                      <div className="pulse-inline-empty">
                        <DashboardIcon name="overview" width={30} height={30} />
                        <h3>No traffic in this period</h3>
                        <p>
                          Try a wider date range, or check that your tracking
                          script is installed.
                        </p>
                        <Link href="/settings/sites">
                          Check tracker setup
                          <DashboardIcon name="arrow" />
                        </Link>
                      </div>
                    )}
                    <div className="pulse-traffic-footer">
                      <span>Privacy-first. No cookies required.</span>
                      <Link href={href('acquisition')}>
                        Explore acquisition
                        <DashboardIcon name="arrow" />
                      </Link>
                    </div>
                  </section>
                  <aside className="pulse-overview-side">
                    <UptimeSummaryCard
                      data={report.uptime}
                      siteId={siteId}
                      staticValues
                    />
                    <section
                      className="pulse-overview-signals"
                      aria-labelledby="signals-title"
                    >
                      <div className="pulse-panel-heading">
                        <h2 id="signals-title">Engagement</h2>
                        <DashboardIcon name="events" />
                      </div>
                      <div className="pulse-signal-row">
                        <span>Tracked events</span>
                        <strong>
                          {report.events
                            ?.reduce((sum, event) => sum + event.count, 0)
                            .toLocaleString() ?? 'Unavailable'}
                        </strong>
                      </div>
                      <div className="pulse-signal-row">
                        <span>Avg. session</span>
                        <strong>
                          {Math.floor(data.stats.avgSessionDuration / 60)}m{' '}
                          {Math.floor(data.stats.avgSessionDuration % 60)}s
                        </strong>
                      </div>
                      {report.revenue && report.revenue.totalRevenue > 0 && (
                        <div className="pulse-signal-row">
                          <span>
                            Revenue
                            {report.revenue.currency === 'MIXED'
                              ? ' (mixed currencies)'
                              : ` (${report.revenue.currency})`}
                          </span>
                          <strong>
                            {report.revenue.totalRevenue.toLocaleString(
                              undefined,
                              { maximumFractionDigits: 2 },
                            )}
                          </strong>
                        </div>
                      )}
                      <Link href={href('events')}>
                        Explore events
                        <DashboardIcon name="arrow" />
                      </Link>
                    </section>
                  </aside>
                </div>
                <div className="pulse-overview-breakdowns">
                  <section className="pulse-chart-container">
                    <div className="pulse-panel-heading">
                      <div>
                        <p className="pulse-control-label">Content</p>
                        <h2>Top pages</h2>
                      </div>
                      <Link href={href('pages')}>
                        View all
                        <DashboardIcon name="arrow" />
                      </Link>
                    </div>
                    <div
                      className="pulse-overview-table-scroll"
                      role="region"
                      aria-label="Top pages"
                      tabIndex={0}
                    >
                      <table className="pulse-overview-table">
                        <thead>
                          <tr>
                            <th scope="col">Page</th>
                            <th scope="col">Visitors</th>
                            <th scope="col">Views</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.topPages.slice(0, 5).map((page) => (
                            <tr key={page.pathname}>
                              <th scope="row">
                                <code title={page.pathname}>
                                  {page.pathname}
                                </code>
                              </th>
                              <td>{page.visitors.toLocaleString()}</td>
                              <td>{page.views.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!data.topPages.length && (
                        <p className="pulse-breakdown-empty">
                          Pages will appear after your first visits.
                        </p>
                      )}
                    </div>
                  </section>
                  <section className="pulse-chart-container">
                    <div className="pulse-panel-heading">
                      <div>
                        <p className="pulse-control-label">Acquisition</p>
                        <h2>Top referrers</h2>
                      </div>
                      <Link href={href('acquisition')}>
                        View all
                        <DashboardIcon name="arrow" />
                      </Link>
                    </div>
                    <div
                      className="pulse-overview-table-scroll"
                      role="region"
                      aria-label="Top referrers"
                      tabIndex={0}
                    >
                      <table className="pulse-overview-table">
                        <thead>
                          <tr>
                            <th scope="col">Source</th>
                            <th scope="col">Visitors</th>
                            <th scope="col" title="Share of pageviews among the top ten referrers">View share</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.topReferrers.slice(0, 5).map((referrer) => (
                            <tr key={referrer.referrer}>
                              <th scope="row">
                                <span title={referrer.referrer}>
                                  {referrer.referrer || 'Direct / unknown'}
                                </span>
                              </th>
                              <td>{referrer.visitors.toLocaleString()}</td>
                              <td>{referrer.percentage.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!data.topReferrers.length && (
                        <p className="pulse-breakdown-empty">
                          Referrers will appear when visitors arrive from other
                          sites.
                        </p>
                      )}
                    </div>
                  </section>
                </div>
                {!!report.insights?.length && (
                  <section className="pulse-overview-insights">
                    <div className="pulse-panel-heading">
                      <div>
                        <p className="pulse-control-label">
                          Action center · current findings
                        </p>
                        <h2>Insights to explore</h2>
                      </div>
                      <Link href={href('insights')}>
                        All insights
                        <DashboardIcon name="arrow" />
                      </Link>
                    </div>
                    <div className="pulse-insight-grid">
                      {report.insights.map((insight) => (
                        <Link
                          className="pulse-insight-card"
                          href={href('insights')}
                          key={insight.id}
                        >
                          <span
                            className={`pulse-insight-severity ${insight.severity}`}
                          >
                            {insight.severity}
                          </span>
                          <h3>{insight.title}</h3>
                          <p>{insight.body}</p>
                          <span className="pulse-insight-action">
                            Review insight
                            <DashboardIcon name="arrow" />
                          </span>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )
          )}
        </>
      )}
    </div>
  );
}
