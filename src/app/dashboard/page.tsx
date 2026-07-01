'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import { Task, PaginatedResponse } from '@/types';
import styles from './dashboard.module.css';

const statusLabels: { [key: string]: string } = {
  ASSIGNED: '배정됨',
  PROGRESS: '진행중',
  REVIEW: '검수',
  QA: 'QA',
  DONE: '완료',
};

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [parentMap, setParentMap] = useState<Map<number, Task>>(new Map());
  const [loadingTasks, setLoadingTasks] = useState(true);

  useEffect(() => {
    if (isLoading || !user) return;

    const fetchDashboardData = async () => {
      setLoadingTasks(true);
      try {
        const allRes = await apiClient.get<{ data: PaginatedResponse<Task> }>('/tasks?limit=300');
        const allTasks = allRes.data.data.data;

        const parents = new Map<number, Task>();
        allTasks.forEach((t) => parents.set(t.id, t));
        setParentMap(parents);

        const groupIds = new Set<number>();
        allTasks.forEach((t) => {
          if (t.parentTaskId) groupIds.add(t.parentTaskId);
        });
        const isStandaloneGroup = (t: Task) => t.isGroup || groupIds.has(t.id);

        const mine = allTasks
          .filter((t) => !isStandaloneGroup(t) && t.workerId === Number(user.id) && t.status !== 'DONE')
          .sort((a, b) => {
            const aTime = a.targetDate ? new Date(a.targetDate).getTime() : Infinity;
            const bTime = b.targetDate ? new Date(b.targetDate).getTime() : Infinity;
            return aTime - bTime;
          })
          .slice(0, 5);
        setMyTasks(mine);

        const recent = allTasks
          .filter((t) => !isStandaloneGroup(t))
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 5);
        setRecentTasks(recent);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingTasks(false);
      }
    };

    fetchDashboardData();
  }, [isLoading, user]);

  const renderTaskGroup = (t: Task) => {
    const parent = t.parentTaskId ? parentMap.get(t.parentTaskId) : null;
    if (!parent) return null;
    return (
      <span className={styles.taskGroupInfo}>
        <span className={styles.taskParentLabel}>[{parent.title}]</span>
      </span>
    );
  };

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
          {user?.role === 'LEADER' && '리더'}
          {user?.role === 'WORKER' && '작업자'}
          {' '}계정입니다.
        </p>
      </div>

      {user?.role === 'ADMIN' && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>관리 기능</h2>
          <div>
            <Link href="/users" className={styles.actionLink}>
              👥 팀원관리
            </Link>
          </div>
        </div>
      )}

      {user?.role === 'LEADER' && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>리더 기능</h2>
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
        <div className={styles.mb4}>
          <Link href="/tasks/create" className={styles.actionLink}>
            ➕ 업무 등록
          </Link>
        </div>
        {loadingTasks ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyDesc}>불러오는 중...</p>
          </div>
        ) : myTasks.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <p className={styles.emptyTitle}>배정된 업무가 없습니다.</p>
            <p className={styles.emptyDesc}>
              관리자에게 업무 배정을 요청하거나 새 업무를 만들어보세요.
            </p>
          </div>
        ) : (
          <ul className={styles.taskList}>
            {myTasks.map((t) => (
              <li key={t.id} className={styles.taskItem}>
                {renderTaskGroup(t)}
                <Link href={`/tasks/${t.id}`} className={styles.taskTitle}>
                  {t.title}
                </Link>
                <span className={styles.taskStatus}>{statusLabels[t.status] ?? t.status}</span>
                {t.targetDate && (
                  <span className={styles.taskDate}>
                    {new Date(t.targetDate).toLocaleDateString('ko-KR')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className={styles.sectionTitle}>최근 활동</h2>
        {loadingTasks ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyDesc}>불러오는 중...</p>
          </div>
        ) : recentTasks.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyDesc}>최근 활동 기록이 없습니다.</p>
          </div>
        ) : (
          <ul className={styles.taskList}>
            {recentTasks.map((t) => (
              <li key={t.id} className={styles.taskItem}>
                {renderTaskGroup(t)}
                <Link href={`/tasks/${t.id}`} className={styles.taskTitle}>
                  {t.title}
                </Link>
                <span className={styles.taskStatus}>{statusLabels[t.status] ?? t.status}</span>
                <span className={styles.taskDate}>
                  {new Date(t.updatedAt).toLocaleDateString('ko-KR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
