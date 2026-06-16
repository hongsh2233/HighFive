import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequestWithAuth } from 'next-auth/middleware';

// 보호가 필요한 라우트
const protectedRoutes = ['/dashboard', '/tasks', '/calendar', '/stats'];
const adminRoutes = ['/stats', '/admin'];
const plannerRoutes = ['/stats'];

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl;
    const userRole = (req.nextauth.token?.role as string) || 'WORKER';

    // Admin 전용 라우트
    if (adminRoutes.some((route) => pathname.startsWith(route))) {
      if (userRole !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // Planner 이상 필요한 라우트
    if (plannerRoutes.some((route) => pathname.startsWith(route))) {
      if (!['ADMIN', 'PLANNER'].includes(userRole)) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // 로그인 페이지는 항상 접근 가능
        if (req.nextUrl.pathname === '/login') {
          return true;
        }

        // 보호된 라우트는 토큰 필요
        if (protectedRoutes.some((route) => req.nextUrl.pathname.startsWith(route))) {
          return !!token;
        }

        return true;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
