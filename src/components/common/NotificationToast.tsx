'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserNotification } from '@/types';
import { useNotifications } from '@/hooks/useNotifications';
import styles from './NotificationToast.module.css';

const AUTO_DISMISS_MS = 5000;

export default function NotificationToastManager() {
  const router = useRouter();
  const [toast, setToast] = useState<UserNotification | null>(null);

  useNotifications((notification) => setToast(notification));

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  const handleClick = () => {
    if (toast.taskId) router.push(`/tasks/${toast.taskId}`);
    setToast(null);
  };

  return (
    <div className={styles.toast} onClick={handleClick} role="status">
      <span className={styles.dot} />
      <span className={styles.message}>{toast.message}</span>
      <button
        type="button"
        className={styles.closeBtn}
        onClick={(e) => { e.stopPropagation(); setToast(null); }}
        aria-label="알림 닫기"
      >
        ✕
      </button>
    </div>
  );
}
