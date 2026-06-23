import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

interface StatusPageProps {
  params: Promise<{ slug: string }>;
}

const statusConfig = {
  up: { label: 'Operational', color: '#22c55e' },
  down: { label: 'Down', color: '#ef4444' },
  unknown: { label: 'No data', color: '#94a3b8' },
};

type ComponentStatus = keyof typeof statusConfig;

export default async function PublicStatusPage({ params }: StatusPageProps) {
  const { slug } = await params;
  const page = await prisma.statusPage.findUnique({
    where: { slug },
    include: {
      components: {
        include: {
          site: {
            include: {
              uptimeChecks: { orderBy: { checkedAt: 'desc' }, take: 30 },
              incidents: { orderBy: { startedAt: 'desc' }, take: 10 },
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!page || !page.enabled) notFound();

  const components = page.components.map((component) => {
    const lastCheck = component.site.uptimeChecks[0] ?? null;
    const openIncident = component.site.incidents.find((incident) => incident.status === 'open') ?? null;
    const status: ComponentStatus = openIncident ? 'down' : lastCheck ? lastCheck.isUp ? 'up' : 'down' : 'unknown';
    const totalChecks = component.site.uptimeChecks.length;
    const upChecks = component.site.uptimeChecks.filter((check) => check.isUp).length;
    const uptime = totalChecks > 0 ? Math.round((upChecks / totalChecks) * 10000) / 100 : null;
    const avgResponse = totalChecks > 0
      ? Math.round(component.site.uptimeChecks.reduce((sum, check) => sum + check.responseTime, 0) / totalChecks)
      : null;

    return {
      id: component.id,
      name: component.name,
      status,
      lastCheck,
      uptime,
      avgResponse,
      incidents: component.site.incidents,
    };
  });

  const overallStatus = components.some((component) => component.status === 'down')
    ? 'down'
    : components.some((component) => component.status === 'unknown')
      ? 'unknown'
      : 'up';
  const overall = statusConfig[overallStatus];
  const activeIncidents = components.flatMap((component) =>
    component.incidents
      .filter((incident) => incident.status === 'open')
      .map((incident) => ({ ...incident, componentName: component.name }))
  );

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0f', color: '#f8fafc', padding: '4rem 1.5rem' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <header style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: overall.color, display: 'inline-block' }} />
            <span style={{ color: overall.color, fontWeight: 700 }}>{overall.label}</span>
          </div>
          <h1 style={{ fontSize: '2.25rem', lineHeight: 1.1, margin: 0 }}>{page.name}</h1>
          {page.description && (
            <p style={{ color: '#94a3b8', marginTop: '0.75rem', maxWidth: 640 }}>{page.description}</p>
          )}
        </header>

        {activeIncidents.length > 0 && (
          <section style={{ border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', margin: '0 0 0.75rem' }}>Active incidents</h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {activeIncidents.map((incident) => (
                <article key={incident.id}>
                  <strong>{incident.componentName}: {incident.title}</strong>
                  {incident.description && <p style={{ color: '#cbd5e1', margin: '0.25rem 0 0' }}>{incident.description}</p>}
                  <p style={{ color: '#94a3b8', fontSize: '0.8125rem', margin: '0.25rem 0 0' }}>
                    Started {incident.startedAt.toLocaleString()}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section style={{ display: 'grid', gap: '0.75rem' }}>
          {components.map((component) => {
            const config = statusConfig[component.status];
            return (
              <article
                key={component.id}
                style={{ border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(15,23,42,0.72)', borderRadius: 8, padding: '1rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: config.color, display: 'inline-block' }} />
                    <strong>{component.name}</strong>
                  </div>
                  <span style={{ color: config.color, fontSize: '0.875rem', fontWeight: 700 }}>{config.label}</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', color: '#94a3b8', fontSize: '0.8125rem', marginTop: '0.75rem' }}>
                  <span>30-check uptime: {component.uptime === null ? 'No data' : `${component.uptime.toFixed(2)}%`}</span>
                  <span>Avg response: {component.avgResponse === null ? 'No data' : `${component.avgResponse}ms`}</span>
                  <span>Last check: {component.lastCheck ? component.lastCheck.checkedAt.toLocaleString() : 'No data'}</span>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
