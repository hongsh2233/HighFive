import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// 조직 slug가 URL에 붙는 라우트 (예: /exwave/dashboard). 실제 페이지는 여전히 app/dashboard 등 slug 없는 경로에 있고,
// 아래에서 slug 유무에 따라 redirect(slug 없음 → 있음)/rewrite(있음 → 내부적으로 slug 제거)로 연결한다.
const orgScopedRoutes = ['dashboard', 'tasks', 'calendar', 'stats', 'users', 'announcements', 'requests', 'my-notes', 'info', 'wiki', 'meetings', 'projects', 'profile', 'settings', 'manual'];
const adminRoutes = ['users'];
const leaderRoutes = ['stats'];
const publicRoutes = ['/login', '/register'];

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function withSecurityHeaders(res: NextResponse) {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.headers.set('Content-Security-Policy', CSP);
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 공개 경로는 항상 접근 가능 (/login, /register, /{slug}/login)
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    return withSecurityHeaders(NextResponse.next());
  }
  if (pathname.endsWith('/login')) {
    return withSecurityHeaders(NextResponse.next());
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userRole = (token?.role as string) || 'WORKER';
  const tokenSlug = (token?.organizationSlug as string) || '';

  // SUPERADMIN은 슬러그 없이(/superadmin 등) 모든 보호 라우트 통과
  if (userRole === 'SUPERADMIN' && token) {
    return withSecurityHeaders(NextResponse.next());
  }

  const segments = pathname.split('/').filter(Boolean);

  // Case A: 슬러그 없이 바로 접근 (/dashboard) → 로그인된 조직 사용자면 /{slug}/dashboard로 리다이렉트
  if (segments.length >= 1 && orgScopedRoutes.includes(segments[0])) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (!tokenSlug) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    const url = req.nextUrl.clone();
    url.pathname = `/${tokenSlug}${pathname}`;
    return NextResponse.redirect(url);
  }

  // Case B: 슬러그 포함 접근 (/exwave/dashboard) → 인증/조직 검증 후 내부적으로 슬러그를 제거해 rewrite
  if (segments.length >= 2 && orgScopedRoutes.includes(segments[1])) {
    const slug = segments[0];
    const restPath = '/' + segments.slice(1).join('/');

    if (!token) {
      return NextResponse.redirect(new URL(`/${slug}/login`, req.url));
    }
    if (tokenSlug !== slug) {
      // 다른 조직 URL로 접근 → 본인 조직 URL로 교정
      if (tokenSlug) {
        const url = req.nextUrl.clone();
        url.pathname = `/${tokenSlug}${restPath}`;
        return NextResponse.redirect(url);
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }

    if (adminRoutes.includes(segments[1]) && userRole !== 'ADMIN') {
      const url = req.nextUrl.clone();
      url.pathname = `/${slug}/dashboard`;
      return NextResponse.redirect(url);
    }
    if (leaderRoutes.includes(segments[1]) && !['ADMIN', 'LEADER'].includes(userRole)) {
      const url = req.nextUrl.clone();
      url.pathname = `/${slug}/dashboard`;
      return NextResponse.redirect(url);
    }

    const url = req.nextUrl.clone();
    url.pathname = restPath;
    return withSecurityHeaders(NextResponse.rewrite(url));
  }

  // /superadmin (슬러그 없음) — SUPERADMIN이 아니면 접근 불가
  if (pathname.startsWith('/superadmin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|register).*)',
  ],
};
