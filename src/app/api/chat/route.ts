import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { AI_PROVIDERS, resolveAIProvider, streamChatCompletion } from '@/lib/ai-providers';
import { defaultDateRange, getEventsReport, getOverviewReport } from '@/lib/reports';
import { verifySiteAccess } from '@/lib/site-access';
import { z } from 'zod';

const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ),
  siteId: z.string().uuid(),
  provider: z.enum(AI_PROVIDERS).optional(),
});

async function getAnalyticsContext(siteId: string, userId: string) {
  const access = await verifySiteAccess(userId, siteId);
  if (!access) return null;

  const range = defaultDateRange();
  const [overview, events] = await Promise.all([
    getOverviewReport(siteId, range),
    getEventsReport(siteId, range),
  ]);

  const eventSummary = Array.isArray(events)
    ? events
        .slice(0, 8)
        .map((event) => `${event.name} (${event.count}x)`)
        .join(', ')
    : `${events.name} (${events.count}x)`;

  return {
    siteName: access.site.name,
    domain: access.site.domain,
    visitors: overview.stats.visitors,
    pageviews: overview.stats.pageviews,
    topPages: overview.topPages
      .map((page) => `${page.pathname} (${page.views} views)`)
      .join(', '),
    topReferrers: overview.topReferrers
      .map((referrer) => `${referrer.referrer} (${referrer.visitors} visitors)`)
      .join(', '),
    events: eventSummary,
  };
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { messages, siteId } = parsed.data;
    const context = await getAnalyticsContext(siteId, session.user.id);
    if (!context) {
      return NextResponse.json(
        { error: 'Site not found or access denied' },
        { status: 403 }
      );
    }

    const systemPrompt = `You are Pulse AI, an analytics assistant for the website "${context.siteName}" (${context.domain}).

Here is the current analytics data for the last 30 days:
- Visitors: ${context.visitors.toLocaleString()}
- Pageviews: ${context.pageviews.toLocaleString()}
- Top pages: ${context.topPages || 'No data'}
- Top referrers: ${context.topReferrers || 'No referrer data'}
- Custom events: ${context.events || 'No events tracked'}

Help the user understand their analytics data. Provide actionable insights. Be concise and specific. When referencing numbers, use the data above. If you don't have enough data to answer, say so honestly. Use light Markdown formatting when it improves readability, such as short headings, bullet lists, tables, and bold labels. Do not wrap the full response in a code block.`;

    const provider = resolveAIProvider(parsed.data.provider);
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const content of streamChatCompletion({
            provider,
            systemPrompt,
            messages,
          })) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
            );
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : 'AI provider request failed',
              })}\n\n`
            )
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
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
