'use client';

import { useEffect, useRef, useState } from 'react';
import apiClient from '@/lib/api-client';
import { UserNotification } from '@/types';

const POLL_INTERVAL_MS = 30_000;

export function useNotifications(onNewNotification?: (notification: UserNotification) => void) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadCount = useRef<number | null>(null);
  const onNewNotificationRef = useRef(onNewNotification);
  onNewNotificationRef.current = onNewNotification;

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await apiClient.get<{ data: { notifications: UserNotification[]; unreadCount: number } }>(
          '/notifications'
        );
        if (cancelled) return;
        const { notifications: list, unreadCount: count } = res.data.data;
        setNotifications(list);
        setUnreadCount(count);

        if (prevUnreadCount.current !== null && count > prevUnreadCount.current) {
          const latest = list.find((n) => !n.isRead);
          if (latest) onNewNotificationRef.current?.(latest);
        }
        prevUnreadCount.current = count;
      } catch {
        // 세션 만료 등은 api-client 인터셉터가 처리 — 여기서는 조용히 무시
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const markAllRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      prevUnreadCount.current = 0;
    } catch {
      // 무시 — 다음 폴링에서 다시 시도됨
    }
  };

  return { notifications, unreadCount, markAllRead };
}
