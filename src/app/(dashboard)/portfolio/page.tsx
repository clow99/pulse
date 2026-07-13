import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/types';

export default async function PortfolioPage() {
  const session = await auth();
  const user = session?.user as SessionUser;
  const membership = await prisma.orgMembership.findFirst({
    where: { userId: user.id, ...(user.activeOrgId ? { orgId: user.activeOrgId } : {}) },
    include: { org: true },
  });
  if (!membership) return null;
  const [projects, brief] = await Promise.all([
    prisma.project.findMany({
      where: { orgId: membership.orgId, active: true },
      include: {
        environments: { include: { services: { include: { sites: { select: { id: true } }, monitors: { include: { checks: { orderBy: { checkedAt: 'desc' }, take: 1 }, incidents: { where: { status: 'open' } } } } } } } },
        deployments: { orderBy: { deployedAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.dailyBrief.findFirst({ where: { orgId: membership.orgId }, orderBy: { localDate: 'desc' } }),
  ]);

  return (
    <div className="pulse-page">
      <div className="pulse-page-header">
        <div>
          <h1 style={{ margin: 0 }}>Portfolio</h1>
          <p style={{ color: 'var(--pulse-text-secondary)', marginTop: 6 }}>{membership.org.name} project health, analytics, and releases.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        {projects.map((project) => {
          const services = project.environments.flatMap((environment) => environment.services);
          const monitors = services.flatMap((service) => service.monitors);
          const failing = monitors.filter((monitor) => monitor.checks[0] && !monitor.checks[0].isUp).length;
          const incidents = monitors.reduce((sum, monitor) => sum + monitor.incidents.length, 0);
          return (
            <Link key={project.id} href={`/projects/${project.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
              <div className="pulse-panel" style={{ padding: 20, height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 18 }}>{project.name}</h2>
                    <div style={{ color: 'var(--pulse-text-secondary)', fontSize: 13, marginTop: 4 }}>{project.environments.length} environments · {services.length} services</div>
                  </div>
                  <span style={{ color: failing || incidents ? '#ef4444' : '#22c55e', fontWeight: 700 }}>{failing || incidents ? 'Attention' : 'Healthy'}</span>
                </div>
                <div style={{ display: 'flex', gap: 18, marginTop: 20, fontSize: 14 }}>
                  <span>{monitors.length} monitors</span><span>{incidents} incidents</span><span>{services.reduce((sum, service) => sum + service.sites.length, 0)} sites</span>
                </div>
                {project.deployments[0] && <div style={{ marginTop: 14, color: 'var(--pulse-text-secondary)', fontSize: 12 }}>Last release: {project.deployments[0].version || project.deployments[0].commitSha || project.deployments[0].source}</div>}
              </div>
            </Link>
          );
        })}
        {!projects.length && <div className="pulse-panel" style={{ padding: 20 }}>No projects yet. Add a site through onboarding to create the first project.</div>}
      </div>

      <div className="pulse-panel" style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Latest daily brief</h2>
        {brief ? <ReactMarkdown>{brief.summary}</ReactMarkdown> : <p style={{ color: 'var(--pulse-text-secondary)' }}>The scheduled job will create the first brief after the configured local day ends.</p>}
      </div>
    </div>
  );
}
