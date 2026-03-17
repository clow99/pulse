import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { subDays } from 'date-fns';

const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ),
  siteId: z.string().uuid(),
});

async function getAnalyticsContext(siteId: string, userId: string) {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { id: true, name: true, domain: true, orgId: true },
  });
  if (!site) return null;

  const membership = await prisma.orgMembership.findUnique({
    where: { userId_orgId: { userId, orgId: site.orgId } },
  });
  if (!membership) return null;

  const fromDate = subDays(new Date(), 30);
  const toDate = new Date();

  const [pageviewsCount, visitorsResult, topPagesRaw, topReferrersRaw, recentEvents] =
    await Promise.all([
      prisma.pageview.count({
        where: { siteId, timestamp: { gte: fromDate, lte: toDate } },
      }),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT CONCAT(browser, '|', os, '|', device, '|', country, '|', language)) as count
        FROM "Pageview"
        WHERE "siteId" = ${siteId}
          AND "timestamp" >= ${fromDate}
          AND "timestamp" <= ${toDate}
      `,
      prisma.pageview.groupBy({
        by: ['pathname'],
        where: { siteId, timestamp: { gte: fromDate, lte: toDate } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      prisma.pageview.groupBy({
        by: ['referrer'],
        where: {
          siteId,
          timestamp: { gte: fromDate, lte: toDate },
          referrer: { not: '' },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      prisma.event.groupBy({
        by: ['name'],
        where: { siteId, timestamp: { gte: fromDate, lte: toDate } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ]);

  const visitors = Number(visitorsResult[0]?.count ?? 0);
  const topPages = topPagesRaw.map((p) => `${p.pathname} (${p._count.id} views)`).join(', ');
  const topReferrers = topReferrersRaw.map((r) => `${r.referrer} (${r._count.id})`).join(', ');
  const events = recentEvents.map((e) => `${e.name} (${e._count.id}x)`).join(', ');

  return {
    siteName: site.name,
    domain: site.domain,
    visitors,
    pageviews: pageviewsCount,
    topPages: topPages || 'No data',
    topReferrers: topReferrers || 'No referrer data',
    events: events || 'No events tracked',
  };
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { messages, siteId } = parsed.data;
    const context = await getAnalyticsContext(siteId, session.user.id);
    if (!context) {
      return NextResponse.json({ error: 'Site not found or access denied' }, { status: 403 });
    }

    const systemPrompt = `You are Pulse AI, an analytics assistant for the website "${context.siteName}" (${context.domain}).

Here is the current analytics data for the last 30 days:
- Visitors: ${context.visitors.toLocaleString()}
- Pageviews: ${context.pageviews.toLocaleString()}
- Top pages: ${context.topPages}
- Top referrers: ${context.topReferrers}
- Custom events: ${context.events}

Help the user understand their analytics data. Provide actionable insights. Be concise and specific. When referencing numbers, use the data above. If you don't have enough data to answer, say so honestly.`;

    const openai = new OpenAI({ apiKey });

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: true,
      max_tokens: 1024,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
