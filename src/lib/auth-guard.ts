import { redirect } from 'next/navigation';
import { auth } from './auth';

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  return session;
}

export async function requireOrgAccess(orgId: string) {
  const session = await requireAuth();
  const { prisma } = await import('./prisma');

  const membership = await prisma.orgMembership.findFirst({
    where: {
      userId: session.user!.id,
      orgId,
    },
  });

  if (!membership) {
    redirect('/overview');
  }

  return { session, membership };
}
