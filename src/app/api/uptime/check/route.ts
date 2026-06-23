import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleUptimeAlert } from '@/lib/uptime-alerts';

const TIMEOUT_MS = 10_000;

function verifySecret(request: Request): boolean {
  const secret = process.env.UPTIME_CHECK_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;

  const token = authHeader.replace(/^Bearer\s+/i, '');
  return token === secret;
}

async function checkSite(url: string): Promise<{ statusCode: number; responseTime: number; isUp: boolean; error: string | null }> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    });
    const responseTime = Date.now() - start;
    const isUp = res.status >= 200 && res.status < 400;
    return { statusCode: res.status, responseTime, isUp, error: null };
  } catch (err) {
    const responseTime = Date.now() - start;
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { statusCode: 0, responseTime, isUp: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  try {
    if (!verifySecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sites = await prisma.site.findMany({
      where: { active: true },
      select: { id: true, name: true, domain: true },
    });

    const results = await Promise.allSettled(
      sites.map(async (site) => {
        const url = site.domain.startsWith('http') ? site.domain : `https://${site.domain}`;
        const result = await checkSite(url);

        const record = await prisma.uptimeCheck.create({
          data: {
            siteId: site.id,
            statusCode: result.statusCode,
            responseTime: result.responseTime,
            isUp: result.isUp,
            error: result.error,
          },
        });

        await handleUptimeAlert(site, record);

        return { siteId: site.id, domain: site.domain, ...result, id: record.id };
      })
    );

    const summary = results.map((r) =>
      r.status === 'fulfilled' ? r.value : { error: 'Check failed' }
    );

    return NextResponse.json({ checked: sites.length, results: summary });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
