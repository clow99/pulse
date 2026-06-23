import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUptimeReport, parseDateRange } from '@/lib/reports';
import { verifySiteAccess } from '@/lib/site-access';
import { z } from 'zod';

const querySchema = z.object({
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

    const url = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    }

    const { siteId, from, to } = parsed.data;
    const range = parseDateRange(from, to);
    if (!range) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    const siteAccess = await verifySiteAccess(session.user.id, siteId);
    if (!siteAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(await getUptimeReport(siteId, range));
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
