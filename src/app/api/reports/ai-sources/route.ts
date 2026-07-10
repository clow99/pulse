import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAiSourcesReport, parseDateRange } from '@/lib/reports';
import { verifySiteAccess } from '@/lib/site-access';
import { z } from 'zod';

const reportQuerySchema = z.object({
  siteId: z.string().uuid(),
  from: z.string().min(1),
  to: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = reportQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams)
    );
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    }

    const { siteId, from, to } = parsed.data;
    const range = parseDateRange(from, to);
    if (!range) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    const access = await verifySiteAccess(session.user.id, siteId);
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(await getAiSourcesReport(siteId, range));
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
