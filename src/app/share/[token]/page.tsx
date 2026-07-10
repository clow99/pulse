import { notFound } from 'next/navigation';
import { DEFAULT_SHARED_REPORTS, normalizeProductReport } from '@/lib/report-catalog';
import { prisma } from '@/lib/prisma';
import { defaultDateRange, getReportData, type ReportKind } from '@/lib/reports';

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedReportPage({ params }: SharePageProps) {
  const { token } = await params;
  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: { site: true, org: true },
  });

  if (!link || link.revokedAt || (link.expiresAt && link.expiresAt <= new Date())) {
    notFound();
  }

  const range = defaultDateRange();
  const reports = (link.reports.length > 0 ? link.reports : DEFAULT_SHARED_REPORTS)
    .map(normalizeProductReport)
    .filter((report): report is ReportKind => Boolean(report));
  const data = Object.fromEntries(
    await Promise.all(
      reports.map(async (report) => [report, await getReportData(report, link.siteId, range)] as const)
    )
  );

  return (
    <main className="pulse-public-page">
      <section className="pulse-public-hero">
        <p className="pulse-eyebrow">Shared Pulse report</p>
        <h1 className="pulse-public-title">{link.name}</h1>
        <p className="pulse-page-subtitle">
          {link.site.name || link.site.domain} · Last 30 days · {link.org.name}
        </p>
      </section>

      <section className="pulse-shared-grid">
        {reports.map((report) => (
          <article key={report} className="pulse-shared-card">
            <h2>{formatReportName(report)}</h2>
            <SharedReportSummary report={report} value={data[report]} />
          </article>
        ))}
      </section>
    </main>
  );
}

function SharedReportSummary({ report, value }: { report: ReportKind; value: unknown }) {
  if (report === 'overview' && isRecord(value)) {
    const stats = isRecord(value.stats) ? value.stats : {};
    return (
      <div className="pulse-public-metric-grid">
        <Metric label="Visitors" value={stats.visitors} />
        <Metric label="Pageviews" value={stats.pageviews} />
        <Metric label="Views / Visitor" value={stats.avgPagesPerVisit} />
      </div>
    );
  }

  if (report === 'ai_sources' && isRecord(value)) {
    const summary = isRecord(value.summary) ? value.summary : {};
    return (
      <div className="pulse-public-metric-grid">
        <Metric label="AI Visitors" value={summary.visitors} />
        <Metric label="AI Pageviews" value={summary.pageviews} />
        <Metric label="AI Revenue" value={summary.revenue} />
      </div>
    );
  }

  if (report === 'revenue' && isRecord(value)) {
    const summary = isRecord(value.summary) ? value.summary : {};
    return (
      <div className="pulse-public-metric-grid">
        <Metric label="Revenue" value={summary.totalRevenue} />
        <Metric label="Orders" value={summary.orders} />
        <Metric label="AOV" value={summary.averageOrderValue} />
      </div>
    );
  }

  if (report === 'uptime_summary' && isRecord(value)) {
    return (
      <div className="pulse-public-metric-grid">
        <Metric label="Status" value={value.currentStatus} />
        <Metric label="Uptime" value={`${Number(value.uptimePercentage ?? 0).toFixed(2)}%`} />
        <Metric label="Avg response" value={`${value.avgResponseTime ?? 0}ms`} />
      </div>
    );
  }

  return <pre className="pulse-public-json">{JSON.stringify(value, null, 2)}</pre>;
}

function Metric({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{String(value ?? 0)}</strong>
    </div>
  );
}

function formatReportName(report: string) {
  return report.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
