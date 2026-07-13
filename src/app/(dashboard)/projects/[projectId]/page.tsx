import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyProjectAccess } from '@/lib/project-access';
import { ProjectMonitorManager } from '@/components/dashboard/ProjectMonitorManager';

interface Props { params: Promise<{ projectId: string }> }

export default async function ProjectPage({ params }: Props) {
  const session = await auth();
  const { projectId } = await params;
  if (!session?.user?.id || !await verifyProjectAccess(session.user.id, projectId)) notFound();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      environments: { orderBy: { createdAt: 'asc' }, include: { services: { orderBy: { createdAt: 'asc' }, include: { sites: true, monitors: { include: { checks: { orderBy: { checkedAt: 'desc' }, take: 1 }, incidents: { where: { status: 'open' } } } } } } } },
      deployments: { orderBy: { deployedAt: 'desc' }, take: 20 },
    },
  });
  if (!project) notFound();
  const services = project.environments.flatMap((environment) => environment.services.map((service) => ({ id: service.id, name: service.name, environment: environment.name })));

  return (
    <div className="pulse-page">
      <div className="pulse-page-header"><div><Link href="/portfolio">← Portfolio</Link><h1>{project.name}</h1><p style={{ color: 'var(--pulse-text-secondary)' }}>{project.description}</p></div></div>
      <div style={{ display: 'grid', gap: 18 }}>
        {project.environments.map((environment) => (
          <section key={environment.id} className="pulse-panel" style={{ padding: 22 }}>
            <h2 style={{ marginTop: 0 }}>{environment.name}</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {environment.services.map((service) => (
                <div key={service.id} style={{ border: '1px solid var(--pulse-border)', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{service.name}</strong><span>{service.kind}</span></div>
                  {service.sites.map((site) => <div key={site.id} style={{ marginTop: 8 }}><Link href={`/overview?siteId=${site.id}`}>{site.domain} analytics</Link></div>)}
                  <div style={{ display: 'grid', gap: 6, marginTop: 12 }}>
                    {service.monitors.map((monitor) => {
                      const latest = monitor.checks[0];
                      return <div key={monitor.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>{monitor.name} · {monitor.type}</span><span style={{ color: latest && !latest.isUp ? '#ef4444' : '#22c55e' }}>{latest ? (latest.isUp ? 'Healthy' : 'Failing') : 'Pending'}{monitor.incidents.length ? ` · ${monitor.incidents.length} incident` : ''}</span></div>;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
        <ProjectMonitorManager services={services} />
        <section className="pulse-panel" style={{ padding: 22 }}><h2 style={{ marginTop: 0 }}>Deployments</h2>{project.deployments.map((deployment) => <div key={deployment.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--pulse-border)' }}><span>{deployment.version || deployment.commitSha || deployment.source}</span><span>{deployment.status} · {deployment.deployedAt.toISOString()}</span></div>)}{!project.deployments.length && <p>No deployments recorded yet.</p>}</section>
      </div>
    </div>
  );
}
