'use client';

import { useEffect, useRef, useState } from 'react';
import apiClient from '@/lib/api-client';
import { UserNotification } from '@/types';

const POLL_INTERVAL_MS = 30_000;

export function useNotifications(onNewNotification?: (notification: UserNotification) => void) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pendingReads = useRef(new Set<number>());
  const prevUnreadCount = useRef<number | null>(null);
  const onNewNotificationRef = useRef(onNewNotification);
  onNewNotificationRef.current = onNewNotification;

  useEffect(() => {
    let cancelled = false;
    let running = false;
    const controller = new AbortController();

    const poll = async () => {
      if (running) return;
      running = true;
      try {
        const res = await apiClient.get<{ data: { notifications: UserNotification[]; unreadCount: number } }>(
          '/notifications', { signal: controller.signal }
        );
        if (cancelled) return;
        setError(null);
        const { notifications: list, unreadCount: count } = res.data.data;
        setNotifications(list);
        setUnreadCount(count);

        if (prevUnreadCount.current !== null && count > prevUnreadCount.current) {
          const latest = list.find((n) => !n.isRead);
          if (latest) onNewNotificationRef.current?.(latest);
        }
        prevUnreadCount.current = count;
      } catch {
        if (!cancelled) setError('알림을 불러오지 못했습니다.');
      } finally {
        running = false;
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      controller.abort();
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

  const markOneRead = async (id: number) => {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.isRead || pendingReads.current.has(id)) return;
    pendingReads.current.add(id);
    try {
      await apiClient.patch(`/notifications/${id}`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => {
        const next = Math.max(0, prev - 1);
        prevUnreadCount.current = next;
        return next;
      });
    } catch {
      setError('알림 읽음 처리에 실패했습니다.');
    } finally {
      pendingReads.current.delete(id);
    }
  };

  return { notifications, unreadCount, markAllRead, markOneRead, error };
}
