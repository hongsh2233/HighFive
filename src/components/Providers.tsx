'use client';

import React, { useEffect } from 'react';
import { SessionProvider, useSession } from 'next-auth/react';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';

function AuthSync() {
  const { data: session } = useSession();
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (session?.user) {
      setUser({
        id: (session.user as any).id,
        email: session.user.email ?? '',
        name: session.user.name ?? '',
        role: (session.user as any).role as UserRole,
      });
    } else {
      setUser(null);
    }
  }, [session, setUser]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthSync />
      {children}
    </SessionProvider>
  );
}
