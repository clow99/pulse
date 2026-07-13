import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyOrgAccess } from '@/lib/site-access';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const orgId = url.searchParams.get('orgId');
  if (!orgId) return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
  if (!await verifyOrgAccess(session.user.id, orgId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const date = url.searchParams.get('date');
  const briefs = await prisma.dailyBrief.findMany({
    where: { orgId, ...(date ? { localDate: new Date(`${date}T00:00:00.000Z`) } : {}) },
    orderBy: { localDate: 'desc' },
    take: date ? 1 : 30,
  });
  return NextResponse.json(briefs);
}
