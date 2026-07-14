'use client';

import React, { createContext, useContext, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { UserNotification } from '@/types';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationsContextValue {
  notifications: UserNotification[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
  latestToast: UserNotification | null;
  dismissToast: () => void;
}

const EMPTY_CONTEXT: NotificationsContextValue = {
  notifications: [],
  unreadCount: 0,
  markAllRead: async () => {},
  latestToast: null,
  dismissToast: () => {},
};

const NotificationsContext = createContext<NotificationsContextValue>(EMPTY_CONTEXT);

export function useNotificationsContext() {
  return useContext(NotificationsContext);
}

const isHiddenPath = (pathname: string) =>
  pathname === '/login' || pathname === '/' || pathname.endsWith('/login');

function ActiveNotificationsProvider({ children }: { children: React.ReactNode }) {
  const [latestToast, setLatestToast] = useState<UserNotification | null>(null);
  const { notifications, unreadCount, markAllRead } = useNotifications((n) => setLatestToast(n));

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markAllRead,
        latestToast,
        dismissToast: () => setLatestToast(null),
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const active = status === 'authenticated' && !isHiddenPath(pathname);

  if (!active) {
    return <NotificationsContext.Provider value={EMPTY_CONTEXT}>{children}</NotificationsContext.Provider>;
  }

  return <ActiveNotificationsProvider>{children}</ActiveNotificationsProvider>;
}
