import { auth } from '@/lib/auth';
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

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth?.user;

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
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|t.js).*)',
  ],
};
