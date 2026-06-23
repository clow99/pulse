import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifySiteAccess } from '@/lib/site-access';
import { z } from 'zod';

const querySchema = z.object({
  siteId: z.string().uuid(),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });

    const access = await verifySiteAccess(session.user.id, parsed.data.siteId);
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const insights = await prisma.insight.findMany({
      where: { siteId: parsed.data.siteId, dismissedAt: null },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    });
    return NextResponse.json(insights);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
