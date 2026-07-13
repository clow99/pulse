import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyOrgAccess } from '@/lib/site-access';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const orgId = new URL(request.url).searchParams.get('orgId');
  if (!orgId) return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
  if (!await verifyOrgAccess(session.user.id, orgId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await prisma.dailyBrief.findFirst({ where: { orgId }, orderBy: { localDate: 'desc' } }));
}
