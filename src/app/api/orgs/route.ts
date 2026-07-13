import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createOrgSchema } from '@/lib/validation';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberships = await prisma.orgMembership.findMany({
      where: { userId: session.user.id },
      orderBy: { org: { createdAt: 'desc' } },
      select: {
        role: true,
        org: {
          select: {
            id: true,
            name: true,
            slug: true,
            timezone: true,
            dailyBriefEnabled: true,
            dailyBriefHour: true,
          },
        },
      },
    });

    return NextResponse.json(memberships.map(({ role, org }) => ({ ...org, role })));
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createOrgSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    const { name, slug } = parsed.data;

    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: 'An organization with this slug already exists' },
        { status: 409 }
      );
    }

    const org = await prisma.organization.create({
      data: {
        name,
        slug,
        members: {
          create: {
            userId: session.user.id,
            role: 'owner',
          },
        },
      },
      include: { members: true },
    });

    return NextResponse.json(org, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
