import Image from 'next/image';
import Link from 'next/link';
import { AreaChart } from '@/components/dashboard/AreaChart';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { UptimeResponseChart } from '@/components/dashboard/UptimeResponseChart';
import { UptimeTimeline } from '@/components/dashboard/UptimeTimeline';
import {
  DEMO_SNAPSHOT,
  DEMO_VIEWS,
  type DemoMetric,
  type DemoView,
} from '@/lib/demo-data';
import styles from './DemoDashboard.module.css';

interface DemoDashboardProps {
  activeView: DemoView;
}

const viewLabels: Record<DemoView, string> = {
  overview: 'Overview',
  acquisition: 'Acquisition',
  uptime: 'Uptime',
};

const viewDescriptions: Record<DemoView, string> = {
  overview: 'Traffic, engagement, and conversion signals in one place.',
  acquisition: 'See which channels and AI assistants send valuable visitors.',
  uptime: 'Availability and response-time monitoring beside your analytics.',
};

export function DemoDashboard({ activeView }: DemoDashboardProps) {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#demo-content">
        Skip to demo content
      </a>

      <header className={styles.topbar}>
        <Link className={styles.brand} href="/" aria-label="Pulse home">
          <Image
            className={styles.logo}
            src="/logo.png"
            alt="Pulse"
            width={108}
            height={42}
            priority
          />
        </Link>
        <div className={styles.topbarActions}>
          <span className={styles.readOnlyBadge}>
            <span className={styles.statusDot} aria-hidden="true" />
            Public read-only demo
          </span>
          <Link className={styles.topbarLink} href="/self-host">
            Self-hosting
          </Link>
          <Link className={styles.topbarButton} href="/">
            Back to Pulse
          </Link>
        </div>
      </header>

      <section className={styles.intro} aria-labelledby="demo-title">
        <div>
          <p className={styles.eyebrow}>Product sandbox</p>
          <h1 id="demo-title">Explore Pulse with a safe, synthetic dataset.</h1>
          <p className={styles.introCopy}>
            Switch between the reports below. Every number is fixed demo data;
            this page has no account access, settings, tokens, or write actions.
          </p>
        </div>
        <div className={styles.snapshotNote}>
          <span>Snapshot</span>
          <strong>{DEMO_SNAPSHOT.period}</strong>
          <small>No live or production data</small>
        </div>
      </section>

      <section className={styles.dashboardShell} aria-label="Pulse product demo">
        <aside className={styles.sidebar}>
          <div className={styles.siteCard}>
            <span className={styles.siteAvatar} aria-hidden="true">
              D
            </span>
            <span>
              <strong>{DEMO_SNAPSHOT.site.name}</strong>
              <small>{DEMO_SNAPSHOT.site.domain}</small>
            </span>
            <span className={styles.liveDot} role="img" aria-label="Site operational" />
          </div>

          <nav className={styles.demoNav} aria-label="Demo reports">
            {DEMO_VIEWS.map((view) => {
              const active = view === activeView;
              return (
                <Link
                  className={`${styles.demoNavLink} ${active ? styles.demoNavLinkActive : ''}`}
                  href={`/demo?view=${view}`}
                  key={view}
                  aria-current={active ? 'page' : undefined}
                >
                  <NavIcon view={view} />
                  {viewLabels[view]}
                </Link>
              );
            })}
          </nav>

          <div className={styles.sidebarMeta}>
            <span>Dataset</span>
            <strong>Synthetic · deterministic</strong>
            <span>Access</span>
            <strong>Reports only</strong>
          </div>
        </aside>

        <main
          className={styles.content}
          id="demo-content"
          aria-labelledby="demo-view-title"
          tabIndex={-1}
        >
          <div className={styles.contentHeader}>
            <div>
              <p className={styles.contentKicker}>{DEMO_SNAPSHOT.site.name}</p>
              <h2 id="demo-view-title">{viewLabels[activeView]}</h2>
              <p>{viewDescriptions[activeView]}</p>
            </div>
            <div className={styles.periodControl} aria-label="Selected reporting period">
              <CalendarIcon />
              {DEMO_SNAPSHOT.period}
            </div>
          </div>

          {activeView === 'overview' && <OverviewView />}
          {activeView === 'acquisition' && <AcquisitionView />}
          {activeView === 'uptime' && <UptimeView />}
        </main>
      </section>

      <footer className={styles.footer}>
        <p>
          This sandbox is intentionally isolated from authentication, APIs, and
          customer data.
        </p>
        <Link href="/self-host">Explore self-hosting</Link>
      </footer>
    </div>
  );
}

function OverviewView() {
  const { overview } = DEMO_SNAPSHOT;
  const overviewStats = overview.metrics.map((metric: DemoMetric) => ({
    label: metric.label,
    value: Number(metric.value.replace(/[^0-9.]/g, '')),
    change:
      metric.change && metric.direction !== 'down'
        ? Number(metric.change.replace('%', ''))
        : 0,
    hideChange: !metric.change || metric.direction === 'down',
    displayValue: metric.value,
    detail: metric.detail,
  }));

  return (
    <div className={styles.viewStack}>
      <StatsCards
        stats={overviewStats}
        className={styles.realMetricGrid}
        staticValues
      />

      <div className={styles.overviewGrid}>
        <section className={`${styles.panel} ${styles.trafficPanel}`} aria-labelledby="traffic-title">
          <PanelHeader
            id="traffic-title"
            title="Traffic"
            subtitle="Visitors and pageviews"
          >
            <div className={styles.chartLegend} aria-label="Chart legend">
              <span><i className={styles.legendGreen} />Visitors</span>
              <span><i className={styles.legendBlue} />Pageviews</span>
            </div>
          </PanelHeader>
          <AreaChart
            data={overview.traffic.map((point) => ({
              date: point.label,
              visitors: point.visitors,
              pageviews: point.pageviews,
            }))}
            height={260}
            ariaLabel="Visitors and pageviews across the fixed fourteen-day demo period"
            staticRender
          />
        </section>

        <aside className={`${styles.panel} ${styles.insightPanel}`} aria-labelledby="insight-title">
          <p className={styles.insightLabel}>Active insight</p>
          <span className={styles.insightIcon} aria-hidden="true">↗</span>
          <h3 id="insight-title">{overview.insight.title}</h3>
          <p>{overview.insight.body}</p>
          <strong>{overview.insight.evidence}</strong>
        </aside>
      </div>

      <div className={styles.twoColumnGrid}>
        <section className={styles.panel} aria-labelledby="top-pages-title">
          <PanelHeader id="top-pages-title" title="Top pages" subtitle="By visitors" />
          <div
            className={styles.tableScroll}
            role="region"
            aria-label="Top pages data"
            tabIndex={0}
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Page</th>
                  <th scope="col">Visitors</th>
                  <th scope="col">Pageviews</th>
                  <th scope="col">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {overview.topPages.map((page) => (
                  <tr key={page.path}>
                    <th scope="row"><code>{page.path}</code></th>
                    <td>{page.visitors.toLocaleString('en-US')}</td>
                    <td>{page.pageviews.toLocaleString('en-US')}</td>
                    <td>{page.conversionRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="events-title">
          <PanelHeader id="events-title" title="Tracked events" subtitle="Recent activity" />
          <div className={styles.eventList}>
            {overview.recentEvents.map((event) => (
              <div className={styles.eventRow} key={event.name}>
                <span className={styles.eventGlyph} aria-hidden="true">◆</span>
                <span>
                  <strong>{event.name}</strong>
                  <small>{event.uniqueVisitors.toLocaleString('en-US')} unique visitors</small>
                </span>
                <b>{event.count.toLocaleString('en-US')}</b>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function AcquisitionView() {
  const { acquisition } = DEMO_SNAPSHOT;
  const aiVisitors = acquisition.aiSources.reduce((sum, source) => sum + source.visitors, 0);
  const aiConversions = acquisition.aiSources.reduce((sum, source) => sum + source.conversions, 0);
  const aiRevenue = acquisition.aiSources.reduce((sum, source) => sum + source.revenue, 0);

  return (
    <div className={styles.viewStack}>
      <div className={styles.metricGrid}>
        <MetricCard metric={{ label: 'All visitors', value: acquisition.totalVisitors.toLocaleString('en-US'), change: '18.6%', direction: 'up', detail: 'Across every source' }} />
        <MetricCard metric={{ label: 'AI visitors', value: aiVisitors.toLocaleString('en-US'), change: '31.2%', direction: 'up', detail: '14.6% of total traffic' }} />
        <MetricCard metric={{ label: 'AI conversions', value: aiConversions.toLocaleString('en-US'), direction: 'neutral', detail: '9.9% conversion rate' }} />
        <MetricCard metric={{ label: 'AI revenue', value: `$${aiRevenue.toLocaleString('en-US')}`, direction: 'neutral', detail: 'Synthetic attribution' }} />
      </div>

      <div className={styles.acquisitionGrid}>
        <section className={styles.panel} aria-labelledby="source-groups-title">
          <PanelHeader id="source-groups-title" title="Source groups" subtitle="Share of visitors" />
          <div className={styles.sourceBars}>
            {acquisition.sources.map((source) => (
              <div className={styles.sourceRow} key={source.label}>
                <div className={styles.sourceLabel}>
                  <strong>{source.label}</strong>
                  <span>{source.visitors.toLocaleString('en-US')} · {source.percentage.toFixed(1)}%</span>
                </div>
                <div className={styles.sourceTrack} aria-hidden="true">
                  <span
                    className={`${styles.sourceFill} ${styles[`sourceFill${capitalize(source.accent)}`]}`}
                    style={{ width: `${source.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={`${styles.panel} ${styles.aiPanel}`} aria-labelledby="ai-discovery-title">
          <PanelHeader id="ai-discovery-title" title="AI discovery" subtitle="Attributed assistant traffic" />
          <div className={styles.aiSourceList}>
            {acquisition.aiSources.map((source, index) => (
              <div className={styles.aiSourceRow} key={source.label}>
                <span className={styles.rank}>{String(index + 1).padStart(2, '0')}</span>
                <span>
                  <strong>{source.label}</strong>
                  <small>{source.conversions} conversions</small>
                </span>
                <span className={styles.aiSourceValue}>
                  <strong>{source.visitors.toLocaleString('en-US')}</strong>
                  <small>${source.revenue.toLocaleString('en-US')}</small>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={styles.panel} aria-labelledby="referrers-title">
        <PanelHeader id="referrers-title" title="Top referrers" subtitle="External sources, normalized" />
        <div
          className={styles.tableScroll}
          role="region"
          aria-label="Top referrers data"
          tabIndex={0}
        >
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Referrer</th>
                <th scope="col">Visitors</th>
                <th scope="col">Share</th>
                <th scope="col"><span className={styles.srOnly}>Share visualization</span></th>
              </tr>
            </thead>
            <tbody>
              {acquisition.referrers.map((referrer) => (
                <tr key={referrer.label}>
                  <th scope="row">{referrer.label}</th>
                  <td>{referrer.visitors.toLocaleString('en-US')}</td>
                  <td>{referrer.percentage.toFixed(1)}%</td>
                  <td className={styles.miniBarCell}>
                    <span className={styles.miniBarTrack} aria-hidden="true">
                      <i style={{ width: `${referrer.percentage * 3}%` }} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function UptimeView() {
  const { uptime } = DEMO_SNAPSHOT;

  return (
    <div className={styles.viewStack}>
      <section className={styles.statusBanner} aria-label="Current service status">
        <span className={styles.statusBeacon} aria-hidden="true" />
        <span>
          <strong>All systems operational</strong>
          <small>Last checked July 14, 2026 at 14:32 UTC</small>
        </span>
        <b>{uptime.status}</b>
      </section>

      <div className={styles.metricGrid}>
        <MetricCard metric={{ label: 'Current status', value: uptime.status, direction: 'neutral', detail: 'HTTP monitor' }} />
        <MetricCard metric={{ label: 'Uptime', value: `${uptime.uptimePercentage.toFixed(2)}%`, direction: 'neutral', detail: 'Current reporting period' }} />
        <MetricCard metric={{ label: 'Avg. response', value: `${uptime.averageResponseTime}ms`, direction: 'neutral', detail: 'Across all checks' }} />
        <MetricCard metric={{ label: 'Total checks', value: uptime.totalChecks.toLocaleString('en-US'), direction: 'neutral', detail: 'Every 5 minutes' }} />
      </div>

      <UptimeTimeline
        data={uptime.timeline.map((point) => ({
          date: point.label,
          uptimePercentage: point.uptime,
          avgResponseTime: point.responseTime,
        }))}
      />

      <div className={styles.uptimeGrid}>
        <section className={styles.panel} aria-labelledby="response-time-title">
          <PanelHeader id="response-time-title" title="Response time" subtitle="Daily average in milliseconds" />
          <UptimeResponseChart
            data={uptime.timeline.map((point) => ({
              date: point.label,
              uptimePercentage: point.uptime,
              avgResponseTime: point.responseTime,
            }))}
            height={250}
            ariaLabel="Daily average response time across the fixed fourteen-day demo period"
            staticRender
          />
        </section>

        <section className={styles.panel} aria-labelledby="recent-checks-title">
          <PanelHeader id="recent-checks-title" title="Recent checks" subtitle="Latest monitor responses" />
          <div className={styles.checkList}>
            {uptime.recentChecks.map((check) => (
              <div className={styles.checkRow} key={check.checkedAt}>
                <span className={styles.checkStatus}><i />{check.status}</span>
                <time>{check.checkedAt}</time>
                <span>{check.statusCode}</span>
                <strong>{check.responseTime}ms</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ metric }: { metric: DemoMetric }) {
  return (
    <article className={styles.metricCard}>
      <div className={styles.metricHeading}>
        <span>{metric.label}</span>
        <i aria-hidden="true" />
      </div>
      <div className={styles.metricValueRow}>
        <strong>{metric.value}</strong>
        {metric.change && (
          <span className={metric.direction === 'neutral' ? styles.changeNeutral : styles.changeGood}>
            {metric.direction === 'down' ? '↓' : '↑'} {metric.change}
          </span>
        )}
      </div>
      <p>{metric.detail}</p>
    </article>
  );
}

function PanelHeader({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.panelHeader}>
      <div>
        <h3 id={id}>{title}</h3>
        <p>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function NavIcon({ view }: { view: DemoView }) {
  if (view === 'overview') {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <rect x="2.5" y="2.5" width="6" height="6" rx="1.2" />
        <rect x="11.5" y="2.5" width="6" height="6" rx="1.2" />
        <rect x="2.5" y="11.5" width="6" height="6" rx="1.2" />
        <rect x="11.5" y="11.5" width="6" height="6" rx="1.2" />
      </svg>
    );
  }

  if (view === 'acquisition') {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M3 15.5V11l4-3.5 3.5 2.5L17 3.5" />
        <path d="M12.5 3.5H17V8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M2.5 10h3l1.8-4 3.2 8 2.1-4H17.5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <rect x="2.5" y="4" width="15" height="13.5" rx="2" />
      <path d="M6 2.5v3M14 2.5v3M2.5 8h15" />
    </svg>
  );
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
