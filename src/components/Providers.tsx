'use client';

import React, { useEffect, useRef } from 'react';
import { SessionProvider, useSession, signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';
import NotificationToastManager from './common/NotificationToast';

function AuthSync() {
  const { data: session, status } = useSession();
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();
  const pathname = usePathname();
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    if (session?.user) {
      setUser({
        id: (session.user as any).id,
        email: session.user.email ?? '',
        name: session.user.name ?? '',
        role: (session.user as any).role as UserRole,
      });
      wasAuthenticated.current = true;
    } else {
      setUser(null);
    }
  }, [session, setUser]);

  // 세션(30분) 만료 감지: 로그인 상태였다가 세션이 사라지면 알리고 로그아웃 처리
  useEffect(() => {
    if (status === 'unauthenticated' && wasAuthenticated.current && pathname !== '/login') {
      wasAuthenticated.current = false;
      alert('보안을 위해 30분 동안 활동이 없어 세션이 만료되었습니다. 다시 로그인해주세요.');
      signOut({ redirect: false }).finally(() => router.push('/login'));
    }
  }, [status, pathname, router]);

  return null;
}

function NotificationToastGate() {
  const { status } = useSession();
  if (status !== 'authenticated') return null;
  return <NotificationToastManager />;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={60} refetchOnWindowFocus>
      <AuthSync />
      <NotificationToastGate />
      {children}
    </SessionProvider>
  );
}
