import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifySiteAccess } from '@/lib/site-access';
import { percentile } from '@/lib/tracking';
import { z } from 'zod';

const querySchema = z.object({
  siteId: z.string().uuid(),
  from: z.string().min(1),
  to: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    const fromDate = new Date(parsed.data.from);
    const toDate = new Date(parsed.data.to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()) || fromDate >= toDate) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    const access = await verifySiteAccess(session.user.id, parsed.data.siteId);
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const vitals = await prisma.webVital.findMany({
      where: { siteId: parsed.data.siteId, timestamp: { gte: fromDate, lte: toDate } },
      orderBy: { timestamp: 'asc' },
    });

    const metrics = Array.from(groupBy(vitals, (vital) => vital.name).entries()).map(([name, rows]) => {
      const values = rows.map((row) => row.value);
      return {
        name,
        count: rows.length,
        average: Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100,
        p75: Math.round(percentile(values, 75) * 100) / 100,
        ratings: {
          good: rows.filter((row) => row.rating === 'good').length,
          needsImprovement: rows.filter((row) => row.rating === 'needs-improvement').length,
          poor: rows.filter((row) => row.rating === 'poor').length,
        },
      };
    });

    const slowestPages = Array.from(groupBy(vitals, (vital) => vital.pathname || '/').entries())
      .map(([pathname, rows]) => ({
        pathname,
        samples: rows.length,
        poorSamples: rows.filter((row) => row.rating === 'poor').length,
        lcpP75: metricP75(rows, 'LCP'),
        inpP75: metricP75(rows, 'INP'),
        clsP75: metricP75(rows, 'CLS'),
      }))
      .sort((a, b) => b.poorSamples - a.poorSamples || b.samples - a.samples)
      .slice(0, 20);

    return NextResponse.json({
      metrics,
      slowestPages,
      devices: qualityBreakdown(vitals, (vital) => vital.device || 'unknown'),
      browsers: qualityBreakdown(vitals, (vital) => vital.browser || 'unknown'),
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

function metricP75(rows: { name: string; value: number }[], metric: string) {
  const values = rows.filter((row) => row.name === metric).map((row) => row.value);
  return values.length > 0 ? Math.round(percentile(values, 75) * 100) / 100 : null;
}

function qualityBreakdown<T extends { rating: string }>(items: T[], getKey: (item: T) => string) {
  return Array.from(groupBy(items, getKey).entries())
    .map(([name, rows]) => ({
      name,
      samples: rows.length,
      poorSamples: rows.filter((row) => row.rating === 'poor').length,
      poorRate: rows.length > 0
        ? Math.round((rows.filter((row) => row.rating === 'poor').length / rows.length) * 10000) / 100
        : 0,
    }))
    .sort((a, b) => b.poorRate - a.poorRate || b.samples - a.samples)
    .slice(0, 20);
}
