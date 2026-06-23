import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const protectedPaths = [
  '/overview',
  '/pages',
  '/events',
  '/acquisition',
  '/technology',
  '/settings',
  '/onboarding',
];

const authPaths = ['/login', '/register'];

const secureCookie =
  process.env.AUTH_URL?.startsWith('https://') ??
  process.env.NEXTAUTH_URL?.startsWith('https://') ??
  false;

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie,
  });
  const isAuthenticated = !!token;

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));
  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/overview', req.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|\\.well-known|_next/static|_next/image|favicon.ico|t.js).*)',
  ],
};
