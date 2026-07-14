'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserNotification } from '@/types';
import { useNotificationsContext } from './NotificationsProvider';
import styles from './NotificationBell.module.css';

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAllRead } = useNotificationsContext();

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleToggle = () => {
    setOpen((v) => {
      const next = !v;
      if (next && unreadCount > 0) markAllRead();
      return next;
    });
  };

  const handleSelect = (n: UserNotification) => {
    setOpen(false);
    if (n.taskId) router.push(`/tasks/${n.taskId}`);
  };

  return (
    <div className={styles.wrap} ref={panelRef}>
      <button
        type="button"
        className={styles.fab}
        onClick={handleToggle}
        aria-label="알림"
        title="알림"
      >
        🔔
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>알림</div>
          <div className={styles.list}>
            {notifications.length === 0 ? (
              <div className={styles.empty}>알림이 없습니다.</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={styles.item}
                  data-unread={!n.isRead}
                  onClick={() => handleSelect(n)}
                >
                  <div className={styles.itemMessage}>{n.message}</div>
                  <div className={styles.itemTime}>{new Date(n.createdAt).toLocaleString('ko-KR')}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
