'use client';

import React, { useEffect, useRef } from 'react';
import { SessionProvider, useSession, signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';
import NotificationToastManager from './common/NotificationToast';
import StickyNotesPanel from './StickyNotesPanel';
import { DialogProvider, useDialog } from './common/DialogProvider';
import { NotificationsProvider } from './NotificationsProvider';
import { consumeManualLogout } from '@/lib/logout-flag';
import '@/lib/sentry-client';

function AuthSync() {
  const { data: session, status } = useSession();
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();
  const pathname = usePathname();
  const wasAuthenticated = useRef(false);
  const lastOrgSlug = useRef<string | null>(null);
  const { alertDialog } = useDialog();

  useEffect(() => {
    if (session?.user) {
      setUser({
        id: (session.user as any).id,
        email: session.user.email ?? '',
        name: session.user.name ?? '',
        role: (session.user as any).role as UserRole,
        organizationSlug: (session.user as any).organizationSlug || undefined,
      });
      wasAuthenticated.current = true;
      lastOrgSlug.current = (session.user as any).organizationSlug || null;
    } else {
      setUser(null);
    }
  }, [session, setUser]);

  // 세션(30분) 만료 감지: 로그인 상태였다가 세션이 사라지면 알리고 로그아웃 처리
  useEffect(() => {
    if (status === 'unauthenticated' && wasAuthenticated.current && pathname !== '/login') {
      wasAuthenticated.current = false;
      if (consumeManualLogout()) return; // 사용자가 직접 로그아웃한 경우는 만료 안내를 띄우지 않음
      const slug = lastOrgSlug.current;
      const loginUrl = slug ? `/${slug}/login` : '/login';
      alertDialog('보안을 위해 30분 동안 활동이 없어 세션이 만료되었습니다. 다시 로그인해주세요.').then(() => {
        signOut({ redirect: false }).finally(() => router.push(loginUrl));
      });
    }
  }, [status, pathname, router, alertDialog]);

  return null;
}

function StickyNotesGate() {
  const { status } = useSession();
  const pathname = usePathname();
  if (status !== 'authenticated') return null;
  if (pathname === '/login' || pathname === '/' || pathname.endsWith('/login')) return null;
  return <StickyNotesPanel />;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={60} refetchOnWindowFocus>
      <DialogProvider>
        <NotificationsProvider>
          <AuthSync />
          <NotificationToastManager />
          <StickyNotesGate />
          {children}
        </NotificationsProvider>
      </DialogProvider>
    </SessionProvider>
  );
}
