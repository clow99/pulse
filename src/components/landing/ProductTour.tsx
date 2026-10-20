'use client';

import { useId, useRef, useState } from 'react';
import Link from 'next/link';
import { DEMO_SNAPSHOT, DEMO_VIEWS, type DemoView } from '@/lib/demo-data';
import { DashboardIcon } from '@/components/dashboard/DashboardIcon';
import styles from './landing.module.css';
import { PulseLogo } from '@/components/brand/PulseLogo';

const views = {
  overview: {
    label: 'Overview',
    icon: 'overview',
    description: 'Your website, at a glance.',
  },
  acquisition: {
    label: 'Acquisition',
    icon: 'acquisition',
    description: 'See where your audience comes from.',
  },
  uptime: {
    label: 'Uptime',
    icon: 'uptime',
    description: 'Keep availability in the picture.',
  },
};

function Metric({
  label,
  value,
  detail,
  positive = false,
}: {
  label: string;
  value: string;
  detail: string;
  positive?: boolean;
}) {
  return (
    <div className={styles.previewMetric}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={positive ? styles.metricPositive : undefined}>
        {detail}
      </small>
    </div>
  );
}

export function ProductTour() {
  const id = useId();
  const [view, setView] = useState<DemoView>('overview');
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  return (
    <section
      className={styles.tourSection}
      aria-label="Interactive product preview"
    >
      <div
        className={styles.tourTabs}
        role="tablist"
        aria-label="Explore Pulse reports"
      >
        {DEMO_VIEWS.map((key, index) => (
          <button
            key={key}
            ref={(element) => {
              tabs.current[index] = element;
            }}
            id={`${id}-${key}-tab`}
            role="tab"
            type="button"
            className={styles.tourTab}
            aria-selected={view === key}
            aria-controls={`${id}-${key}-panel`}
            tabIndex={view === key ? 0 : -1}
            onClick={() => setView(key)}
            onKeyDown={(event) => {
              let next = index;
              if (event.key === 'ArrowRight')
                next = (index + 1) % DEMO_VIEWS.length;
              else if (event.key === 'ArrowLeft')
                next = (index - 1 + DEMO_VIEWS.length) % DEMO_VIEWS.length;
              else if (event.key === 'Home') next = 0;
              else if (event.key === 'End') next = DEMO_VIEWS.length - 1;
              else return;
              event.preventDefault();
              setView(DEMO_VIEWS[next]);
              tabs.current[next]?.focus();
            }}
          >
            <DashboardIcon name={views[key].icon} />
            {views[key].label}
          </button>
        ))}
      </div>
      <div className={styles.previewFrame}>
        <div className={styles.previewChrome}>
          <span className={styles.windowDots} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>demo.example / {view}</span>
          <span>
            <i />
            Illustrative product preview
          </span>
        </div>
        <div className={styles.previewApp}>
          <div className={styles.previewSidebar} aria-hidden="true">
            <div className={styles.previewBrand}>
              <PulseLogo width={88} decorative />
            </div>
            <div className={styles.previewSite}>
              <strong>Demo Site</strong>
              <small>demo.example</small>
            </div>
            <p className={styles.previewNavLabel}>Workspace</p>
            {DEMO_VIEWS.map((key) => (
              <span
                className={`${styles.previewNav} ${view === key ? styles.active : ''}`}
                key={key}
              >
                <DashboardIcon name={views[key].icon} width={15} height={15} />
                {views[key].label}
              </span>
            ))}
            <p className={styles.previewNavLabel}>Your perspective</p>
            <span className={styles.previewNav}>
              <DashboardIcon name="events" width={15} height={15} />
              Events
            </span>
            <span className={styles.previewNav}>
              <DashboardIcon name="funnels" width={15} height={15} />
              Funnels
            </span>
            <span className={styles.previewNav}>
              <DashboardIcon name="insights" width={15} height={15} />
              Insights
            </span>
          </div>
          {DEMO_VIEWS.map((key) => (
            <div
              key={key}
              id={`${id}-${key}-panel`}
              role="tabpanel"
              aria-labelledby={`${id}-${key}-tab`}
              hidden={view !== key}
              className={styles.previewContent}
              tabIndex={0}
            >
              <div className={styles.previewHeading}>
                <div>
                  <h2>
                    {views[key].label}
                    <span style={{ color: '#79c8f5' }}>.</span>
                  </h2>
                  <p>{views[key].description}</p>
                </div>
                <span className={styles.previewPeriod}>
                  {DEMO_SNAPSHOT.period}
                </span>
              </div>
              {key === 'overview' && <OverviewPreview />}
              {key === 'acquisition' && <AcquisitionPreview />}
              {key === 'uptime' && <UptimePreview />}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.previewCaption}>
        <span>
          Explore the reports above. All numbers are fixed, synthetic examples.
        </span>
        <Link href="/demo">
          Private-preview access details
          <DashboardIcon name="arrow" width={14} height={14} />
        </Link>
      </div>
    </section>
  );
}

function OverviewPreview() {
  return (
    <>
      <div className={styles.previewMetrics}>
        {DEMO_SNAPSHOT.overview.metrics.map((metric) => (
          <Metric
            key={metric.label}
            label={metric.label}
            value={metric.value}
            detail={
              'change' in metric
                ? `${metric.direction === 'down' ? '↓' : '↑'} ${metric.change} vs. prior period`
                : metric.detail
            }
            positive={'change' in metric}
          />
        ))}
      </div>
      <div className={styles.previewLower}>
        <TrafficPreview />
        <aside className={`${styles.previewPanel} ${styles.previewInsight}`}>
          <DashboardIcon name="insights" width={25} height={25} />
          <span>In this example</span>
          <h3>{DEMO_SNAPSHOT.overview.insight.title}</h3>
          <p>{DEMO_SNAPSHOT.overview.insight.body}</p>
        </aside>
      </div>
    </>
  );
}

function TrafficPreview() {
  const id = useId();
  const [visible, setVisible] = useState({ visitors: true, pageviews: true });
  const series = ['visitors', 'pageviews'] as const;
  const data = DEMO_SNAPSHOT.overview.traffic;
  const max =
    Math.ceil(
      Math.max(
        ...data.flatMap((point) =>
          series.filter((key) => visible[key]).map((key) => point[key]),
        ),
      ) / 1000,
    ) * 1000;
  const points = (key: (typeof series)[number]) =>
    data
      .map(
        (point, index) =>
          `${40 + index * (585 / (data.length - 1))},${155 - (point[key] / max) * 140}`,
      )
      .join(' ');

  return (
    <section className={styles.previewPanel} aria-label="Traffic example">
      <div className={styles.chartHeader}>
        <h3>Traffic over time</h3>
        <div
          className={styles.chartControls}
          role="group"
          aria-label="Chart series"
        >
          {series.map((key) => (
            <button
              key={key}
              type="button"
              aria-label={`Show ${key}`}
              aria-pressed={visible[key]}
              disabled={visible[key] && !visible[series.find((item) => item !== key)!]}
              title={visible[key] && !visible[series.find((item) => item !== key)!] ? 'Keep at least one series visible' : undefined}
              onClick={() =>
                setVisible((current) =>
                  current[key] && !current[series.find((item) => item !== key)!]
                    ? current
                    : { ...current, [key]: !current[key] },
                )
              }
            >
              <i />
              {key === 'visitors' ? 'Visitors' : 'Pageviews'}
            </button>
          ))}
        </div>
      </div>
      <svg
        className={styles.miniChart}
        viewBox="0 0 640 170"
        preserveAspectRatio="none"
        role="img"
        aria-labelledby={`${id}-title`}
      >
        <title id={`${id}-title`}>
          {`${series.filter((key) => visible[key]).join(' and ')} from July 1 to July 14, 2026. Synthetic data.`}
        </title>
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#51b8ef" stopOpacity=".22" />
            <stop offset="1" stopColor="#51b8ef" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((value) => (
          <g key={value}>
            <line
              x1="40"
              x2="625"
              y1={155 - value * 140}
              y2={155 - value * 140}
              stroke="#2a3b50"
              strokeDasharray="3 5"
            />
            <text x="0" y={159 - value * 140} fill="#829dbb" fontSize="11">
              {Math.round(value * max).toLocaleString('en-US')}
            </text>
          </g>
        ))}
        {visible.pageviews && (
          <polygon
            points={`40,155 ${points('pageviews')} 625,155`}
            fill={`url(#${id}-fill)`}
          />
        )}
        {series
          .filter((key) => visible[key])
          .map((key) => (
            <polyline
              key={key}
              points={points(key)}
              fill="none"
              stroke={key === 'visitors' ? '#61cba0' : '#61c1f5'}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          ))}
      </svg>
      <div className={styles.chartTicks} aria-hidden="true">
        <span>Jul 1</span>
        <span>Jul 4</span>
        <span>Jul 7</span>
        <span>Jul 10</span>
        <span>Jul 14</span>
      </div>
    </section>
  );
}

function AcquisitionPreview() {
  const aiSources = DEMO_SNAPSHOT.acquisition.aiSources;
  const aiVisitors = aiSources.reduce(
    (sum, source) => sum + source.visitors,
    0,
  );
  const conversions = aiSources.reduce(
    (sum, source) => sum + source.conversions,
    0,
  );
  const revenue = aiSources.reduce((sum, source) => sum + source.revenue, 0);
  return (
    <>
      <div className={styles.previewMetrics}>
        <Metric
          label="Visitors"
          value={DEMO_SNAPSHOT.acquisition.totalVisitors.toLocaleString(
            'en-US',
          )}
          detail="Across all channels"
        />
        <Metric
          label="AI referrals"
          value={aiVisitors.toLocaleString('en-US')}
          detail="From AI assistants"
        />
        <Metric
          label="AI conversions"
          value={String(conversions)}
          detail="Attributed goal completions"
        />
        <Metric
          label="AI revenue"
          value={`$${revenue.toLocaleString('en-US')}`}
          detail="USD · synthetic example"
        />
      </div>
      <div className={styles.previewLower}>
        <section
          className={styles.previewPanel}
          aria-label="Acquisition source example"
        >
          <h3>Where your audience comes from</h3>
          <div className={styles.sourceRows}>
            {DEMO_SNAPSHOT.acquisition.sources.map((source) => (
              <div className={styles.sourceRow} key={source.label}>
                <span>{source.label}</span>
                <div className={styles.sourceTrack} aria-hidden="true">
                  <i style={{ width: `${source.percentage}%` }} />
                </div>
                <b>{source.percentage.toFixed(1)}%</b>
              </div>
            ))}
          </div>
        </section>
        <aside className={`${styles.previewPanel} ${styles.previewInsight}`}>
          <span>AI assistants</span>
          <h3>A new kind of referral.</h3>
          {aiSources.map((source) => (
            <div
              className={styles.aiSource}
              key={source.label}
              style={{ width: '100%' }}
            >
              <span>{source.label}</span>
              <strong>{source.visitors}</strong>
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}

function UptimePreview() {
  const uptime = DEMO_SNAPSHOT.uptime;
  return (
    <>
      <div className={styles.previewMetrics}>
        <Metric
          label="Uptime"
          value={`${uptime.uptimePercentage}%`}
          detail="Across the example period"
        />
        <Metric
          label="Avg. response"
          value={`${uptime.averageResponseTime}ms`}
          detail="HTTP response time"
        />
        <Metric
          label="Checks"
          value={uptime.totalChecks.toLocaleString('en-US')}
          detail="Every five minutes"
        />
        <Metric
          label="Status"
          value="Up"
          detail="Operational at snapshot"
          positive
        />
      </div>
      <div className={styles.previewLower}>
        <section
          className={styles.previewPanel}
          aria-label="Availability example"
        >
          <div className={styles.chartHeader}>
            <h3>Availability history</h3>
            <span className={styles.uptimeStatus}>
              <i />
              {uptime.status} at snapshot
            </span>
          </div>
          <div
            className={styles.uptimeTimeline}
            aria-label="Daily availability for the synthetic fourteen-day period"
          >
            {uptime.timeline.map((day) => (
              <div
                key={day.label}
                data-incident={day.uptime < 100}
                title={`${day.label}: ${day.uptime}% uptime`}
                aria-label={`${day.label}: ${day.uptime}% uptime`}
                role="img"
              />
            ))}
          </div>
          <div className={styles.chartTicks}>
            <span>Jul 1</span>
            <span>Jul 7</span>
            <span>Jul 14</span>
          </div>
          <p>
            14 days of checks, with a short interruption on July 8. Example
            data, not a live service status.
          </p>
        </section>
        <aside className={`${styles.previewPanel} ${styles.previewInsight}`}>
          <span>At the snapshot</span>
          <h3>Recent checks</h3>
          {uptime.recentChecks.slice(0, 4).map((check) => (
            <div
              className={styles.checkRow}
              key={check.checkedAt}
              style={{ width: '100%' }}
            >
              <span>{check.checkedAt}</span>
              <span>
                {check.responseTime}ms · {check.statusCode}
              </span>
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
