import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { compare } from 'bcryptjs';
import { prisma } from './prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            memberships: {
              include: { org: true },
              take: 1,
              orderBy: { org: { createdAt: 'desc' } },
            },
          },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          activeOrgId: user.memberships[0]?.orgId ?? null,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        if (!user.email) return false;

        let dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email: user.email,
              name: profile?.name ?? user.name ?? user.email.split('@')[0],
              image: (profile as { picture?: string })?.picture ?? user.image,
            },
          });
        }

        await prisma.account.upsert({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          update: {
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
          },
          create: {
            userId: dbUser.id,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            type: account.type,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
          },
        });
      }

      return true;
    },
    async jwt({ token, user, account }) {
      const isEdgeRuntime = process.env.NEXT_RUNTIME === 'edge';

      if (user && account?.provider === 'credentials') {
        token.id = user.id;
        token.activeOrgId = (user as any).activeOrgId ?? null;
      }

      if (account?.provider === 'google' && user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: {
            memberships: {
              take: 1,
              orderBy: { org: { createdAt: 'desc' } },
            },
          },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.activeOrgId = dbUser.memberships[0]?.orgId ?? null;
        }
      }

      if (!isEdgeRuntime && token.id && !token.activeOrgId) {
        const membership = await prisma.orgMembership.findFirst({
          where: { userId: token.id as string },
          orderBy: { org: { createdAt: 'desc' } },
        });
        if (membership) {
          token.activeOrgId = membership.orgId;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
         
        (session as any).user.activeOrgId = token.activeOrgId;
      }
      return session;
    },
  },
});
