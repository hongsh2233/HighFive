'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotificationsContext } from '../NotificationsProvider';
import styles from './NotificationToast.module.css';

const AUTO_DISMISS_MS = 5000;

export default function NotificationToastManager() {
  const router = useRouter();
  const { latestToast, dismissToast } = useNotificationsContext();

  useEffect(() => {
    if (!latestToast) return;
    const timer = setTimeout(dismissToast, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [latestToast, dismissToast]);

  if (!latestToast) return null;

  const handleClick = () => {
    if (latestToast.taskId) router.push(`/tasks/${latestToast.taskId}`);
    dismissToast();
  };

  return (
    <div className={styles.toast} onClick={handleClick} role="status">
      <span className={styles.dot} />
      <span className={styles.message}>{latestToast.message}</span>
      <button
        type="button"
        className={styles.closeBtn}
        onClick={(e) => { e.stopPropagation(); dismissToast(); }}
        aria-label="알림 닫기"
      >
        ✕
      </button>
    </div>
  );
}
