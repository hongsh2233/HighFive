'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className={styles.loading}>로딩 중...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          안녕하세요, {user?.name}님
        </h1>
        <p className={styles.subtitle}>
          {user?.role === 'ADMIN' && '관리자'}
          {user?.role === 'PLANNER' && '기획자'}
          {user?.role === 'WORKER' && '작업자'}
          {' '}계정입니다.
        </p>
      </div>

      {user?.role === 'ADMIN' && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>관리 기능</h2>
          <div>
            <Link href="/users" className={styles.actionLink}>
              👥 팀 사용자 관리
            </Link>
          </div>
        </div>
      )}

      {user?.role === 'PLANNER' && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>기획자 기능</h2>
          <div className={styles.linkRow}>
            <Link href="/tasks" className={styles.actionLink}>
              📋 업무 배정
            </Link>
            <Link href="/stats" className={styles.actionLink}>
              📊 통계 조회
            </Link>
            <Link href="/tasks/kanban" className={styles.actionLink}>
              📈 칸반 보드
            </Link>
            <Link href="/calendar" className={styles.actionLink}>
              📅 캘린더
            </Link>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>나의 업무</h2>
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Link href="/tasks/create" className={styles.actionLink}>
            ➕ 업무 등록
          </Link>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <p className={styles.emptyTitle}>배정된 업무가 없습니다.</p>
          <p className={styles.emptyDesc}>
            기획자에게 업무 배정을 요청하거나 새 업무를 만들어보세요.
          </p>
        </div>
      </div>

      <div>
        <h2 className={styles.sectionTitle}>최근 활동</h2>
        <div className={styles.emptyState}>
          <p className={styles.emptyDesc}>최근 활동 기록이 없습니다.</p>
        </div>
      </div>
    </div>
  );
}
