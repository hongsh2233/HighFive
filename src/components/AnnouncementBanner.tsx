'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import styles from './AnnouncementBanner.module.css';

interface Announcement {
  id: number;
  content: string;
  createdAt: string;
  author: { id: number; name: string };
}

const DISMISSED_KEY = 'dismissedAnnouncementIds';

function loadDismissed(): number[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
  } catch {
    return [];
  }
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<number[]>([]);

  useEffect(() => {
    setDismissed(loadDismissed());
    apiClient
      .get<{ data: Announcement[] }>('/announcements')
      .then((res) => setAnnouncements(res.data.data))
      .catch(() => {});
  }, []);

  const dismiss = (id: number) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  };

  const visible = announcements.filter((a) => !dismissed.includes(a.id));

  if (visible.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      {visible.map((a) => (
        <div key={a.id} className={styles.bar}>
          <span className={styles.icon}>📢</span>
          <span className={styles.content}>{a.content}</span>
          <span className={styles.meta}>{a.author.name}</span>
          <button
            type="button"
            aria-label="공지 닫기"
            className={styles.closeBtn}
            onClick={() => dismiss(a.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
