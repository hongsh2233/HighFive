'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AppHeader from './AppHeader';

const AUTH_REQUIRED_PATHS = ['/dashboard', '/tasks', '/calendar', '/stats', '/users', '/profile', '/info', '/projects'];

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useSession();

  const isLoginPage = pathname === '/login' || pathname === '/';
  const requiresAuth = AUTH_REQUIRED_PATHS.some((p) => pathname.startsWith(p));

  // 인증 필요 페이지에서 세션 로딩 중이거나 미인증이면 렌더링 차단
  if (requiresAuth && (status === 'loading' || status === 'unauthenticated')) {
    return null;
  }

  return (
    <div>
      {!isLoginPage && <AppHeader />}
      {children}
    </div>
  );
}
