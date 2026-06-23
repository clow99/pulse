import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getEventsReport, parseDateRange } from '@/lib/reports';
import { verifySiteAccess } from '@/lib/site-access';
import { z } from 'zod';

const reportQuerySchema = z.object({
  siteId: z.string().uuid(),
  from: z.string().min(1),
  to: z.string().min(1),
  name: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const parsed = reportQuerySchema.safeParse(
      Object.fromEntries(url.searchParams)
    );
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    }

    const { siteId, from, to, name } = parsed.data;
    const range = parseDateRange(from, to);
    if (!range) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    const siteAccess = await verifySiteAccess(session.user.id, siteId);
    if (!siteAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(await getEventsReport(siteId, range, name));
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
