import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// 보호가 필요한 라우트
const protectedRoutes = ['/dashboard', '/tasks', '/calendar', '/stats', '/users', '/announcements', '/requests', '/my-notes', '/superadmin', '/inquiries'];
const adminRoutes = ['/users'];
const leaderRoutes = ['/stats'];
const superadminRoutes = ['/superadmin'];
const publicRoutes = ['/login', '/register'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 공개 경로는 항상 접근 가능 (/login, /register, /{slug}/login)
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next();
  }
  if (pathname.endsWith('/login') || pathname.endsWith('/inquiry')) {
    return NextResponse.next();
  }

  // 토큰 가져오기
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userRole = (token?.role as string) || 'WORKER';

  // SUPERADMIN은 모든 보호 라우트 통과
  if (userRole === 'SUPERADMIN' && token) {
    const res = NextResponse.next();
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('X-XSS-Protection', '1; mode=block');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return res;
  }

  // 보호된 라우트 확인
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // SUPERADMIN 전용 라우트
    if (superadminRoutes.some((route) => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Admin 전용 라우트
    if (adminRoutes.some((route) => pathname.startsWith(route))) {
      if (userRole !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // Leader 이상 필요한 라우트
    if (leaderRoutes.some((route) => pathname.startsWith(route))) {
      if (!['ADMIN', 'LEADER'].includes(userRole)) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
  }

  const res = NextResponse.next();
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return res;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|register).*)',
  ],
};
