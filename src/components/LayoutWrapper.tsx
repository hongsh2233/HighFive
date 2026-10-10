'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AppShell from './AppShell';
import AnnouncementBanner from './AnnouncementBanner';
import WikiSearchButton from './WikiSearchButton';
import { organizationRoute } from '@/lib/route-config';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useSession();

  const isLoginPage = pathname === '/login' || pathname === '/' || pathname.endsWith('/login');
  const requiresAuth = !!organizationRoute(pathname) || pathname === '/superadmin' || pathname.startsWith('/superadmin/');

  // 인증 필요 페이지에서 세션 로딩 중이거나 미인증이면 렌더링 차단
  if (requiresAuth && (status === 'loading' || status === 'unauthenticated')) {
    return null;
  }

  if (isLoginPage) {
    return <div>{children}</div>;
  }

  return (
    <AppShell>
      <AnnouncementBanner />
      {children}
      <WikiSearchButton />
    </AppShell>
  );
}
