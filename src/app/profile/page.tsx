'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import styles from './profile.module.css';
import Spinner from '@/components/common/Spinner';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: '관리자',
  LEADER: '리더',
  WORKER: '작업자',
};

interface Me {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    apiClient.get<{ data: Me }>('/users/me')
      .then((res) => setMe(res.data.data))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || loading) {
    return <div className={styles.loading}><Spinner /></div>;
  }

  if (!user || !me) {
    return <div className={styles.loading}>로그인이 필요합니다.</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>내 프로필</h1>

        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.label}>이름</span>
            <span className={styles.value}>{me.name}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>이메일</span>
            <span className={styles.value}>{me.email}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>역할</span>
            <span className={styles.value}>{ROLE_LABEL[me.role] || me.role}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>가입일</span>
            <span className={styles.value}>{new Date(me.createdAt).toLocaleDateString('ko-KR')}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>최근 로그인</span>
            <span className={styles.value}>
              {me.lastLoginAt ? new Date(me.lastLoginAt).toLocaleString('ko-KR') : '기록 없음'}
            </span>
          </div>
        </div>

        <div className={styles.links}>
          <Link href="/profile/password" className={styles.linkBtn}>비밀번호 변경</Link>
          <Link href="/settings/calendar-sync" className={styles.linkBtn}>캘린더 연동</Link>
          <Link href="/settings/security" className={styles.linkBtn}>보안 설정</Link>
          <Link href="/my-notes" className={styles.linkBtn}>내 자료</Link>
        </div>
      </div>
    </div>
  );
}
