import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildTrackingSnippet, domainMatches } from '@/lib/tracking';
import { verifySiteAccess } from '@/lib/site-access';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const access = await verifySiteAccess(session.user.id, id);
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { site } = access;
    const [lastPageview, lastEvent, lastWebVital] = await Promise.all([
      prisma.pageview.findFirst({
        where: { siteId: site.id },
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true, hostname: true, pathname: true },
      }),
      prisma.event.findFirst({
        where: { siteId: site.id },
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true, hostname: true, pathname: true, name: true },
      }),
      prisma.webVital.findFirst({
        where: { siteId: site.id },
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true, hostname: true, pathname: true, name: true },
      }),
    ]);

    const samples = [
      lastPageview ? { type: 'pageview', ...lastPageview } : null,
      lastEvent ? { type: 'event', ...lastEvent } : null,
      lastWebVital ? { type: 'web_vital', ...lastWebVital } : null,
    ].filter(Boolean) as {
      type: string;
      timestamp: Date;
      hostname: string;
      pathname: string;
      name?: string;
    }[];

    const latest = samples.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0] ?? null;
    const recentWindowMs = 24 * 60 * 60 * 1000;
    const recentData = latest ? Date.now() - latest.timestamp.getTime() <= recentWindowMs : false;
    const observedHostname = latest?.hostname ?? '';

    return NextResponse.json({
      site: {
        id: site.id,
        name: site.name,
        domain: site.domain,
        active: site.active,
        collectWebVitals: site.collectWebVitals,
      },
      tokenStatus: site.active ? 'active' : 'inactive',
      snippet: buildTrackingSnippet(site.token, site.collectWebVitals),
      hasData: samples.length > 0,
      recentData,
      lastSeen: latest
        ? {
            type: latest.type,
            at: latest.timestamp.toISOString(),
            hostname: latest.hostname,
            pathname: latest.pathname,
            name: latest.name ?? null,
          }
        : null,
      domainMatch: observedHostname ? domainMatches(site.domain, observedHostname) : null,
      troubleshooting: [
        'Confirm the snippet is loaded before the closing head tag.',
        'Confirm the data-token value matches this site.',
        'If Do Not Track is enabled in the browser, Pulse intentionally does not collect data.',
        'If your Pulse host differs from the script URL, set data-endpoint explicitly.',
      ],
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
