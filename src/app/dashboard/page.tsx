'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import { Task, PaginatedResponse } from '@/types';
import styles from './dashboard.module.css';
import Spinner from '@/components/common/Spinner';

interface PlatformStats {
  totalOrgs: number;
  activeOrgs: number;
  inactiveOrgs: number;
  newOrgsThisMonth: number;
  totalUsers: number;
  newUsersThisMonth: number;
  planDistribution: Record<string, number>;
  recentOrgs: {
    id: number;
    name: string;
    slug: string;
    plan: string;
    isActive: boolean;
    createdAt: string;
    _count: { users: number };
  }[];
}

function SuperAdminDashboard({ userName }: { userName: string }) {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/superadmin/stats')
      .then((r) => r.json())
      .then((d) => { if (d.success) setStats(d.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.loading}><Spinner /></div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>안녕하세요, {userName}님</h1>
        <p className={styles.subtitle}>시스템관리자 계정입니다.</p>
      </div>

      {stats && (
        <>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{stats.totalOrgs}</div>
              <div className={styles.kpiLabel}>전체 조직</div>
              <div className={styles.kpiSub}>이번 달 +{stats.newOrgsThisMonth}개</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{stats.activeOrgs}</div>
              <div className={styles.kpiLabel}>활성 조직</div>
              <div className={styles.kpiSub}>비활성 {stats.inactiveOrgs}개</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{stats.totalUsers}</div>
              <div className={styles.kpiLabel}>전체 사용자</div>
              <div className={styles.kpiSub}>이번 달 +{stats.newUsersThisMonth}명</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel} style={{ marginBottom: 12 }}>플랜 분포</div>
              <div className={styles.planRow}>
                <span className={styles.planBadgeFree}>FREE {stats.planDistribution.FREE ?? 0}</span>
                <span className={styles.planBadgePro}>PRO {stats.planDistribution.PRO ?? 0}</span>
                <span className={styles.planBadgeEnt}>ENT {stats.planDistribution.ENTERPRISE ?? 0}</span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>최근 가입 조직</h2>
            <div className={styles.taskList}>
              <table className={styles.statsTable}>
                <thead>
                  <tr>
                    <th>조직명</th>
                    <th>슬러그</th>
                    <th>플랜</th>
                    <th>사용자</th>
                    <th>상태</th>
                    <th>가입일</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrgs.map((org) => (
                    <tr key={org.id}>
                      <td>
                        <Link href={`/superadmin/${org.id}`} className={styles.orgLink}>
                          {org.name}
                        </Link>
                      </td>
                      <td><code className={styles.slug}>{org.slug}</code></td>
                      <td><span className={styles[`planBadge${org.plan.charAt(0) + org.plan.slice(1).toLowerCase().replace('rprise','')}`] || ''}>{org.plan}</span></td>
                      <td>{org._count.users}명</td>
                      <td>
                        <span className={org.isActive ? styles.statusActive : styles.statusInactive}>
                          {org.isActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td>{new Date(org.createdAt).toLocaleDateString('ko-KR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.section}>
            <Link href="/superadmin" className={styles.actionLink}>전체 조직 보기</Link>
          </div>
        </>
      )}
    </div>
  );
}

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
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [isOnLeaveToday, setIsOnLeaveToday] = useState(false);
  const [parentMap, setParentMap] = useState<Map<number, Task>>(new Map());
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [weatherGreeting, setWeatherGreeting] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !user) return;
    apiClient.get<{ data: { features: { weatherGreeting: boolean } } }>('/settings/ai/status')
      .then((res) => {
        if (!res.data.data.features.weatherGreeting) return;
        return apiClient.get<{ data: { greeting: string } }>('/ai/weather-greeting');
      })
      .then((res) => { if (res) setWeatherGreeting(res.data.data.greeting); })
      .catch(() => {});
  }, [isLoading, user]);

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

        const now = new Date();
        const todayKey = now.toISOString().split('T')[0];
        const calRes = await apiClient.get<{
          data: {
            tasksByDate: Record<string, Task[]>;
            leavesByDate: Record<string, string[]>;
          };
        }>(`/tasks/calendar?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
        const todayList = (calRes.data.data.tasksByDate[todayKey] || [])
          .filter((t) => !isStandaloneGroup(t) && t.workerId === Number(user.id));
        setTodayTasks(todayList);
        setIsOnLeaveToday((calRes.data.data.leavesByDate[todayKey] || []).includes(user.name ?? ''));
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
    return <div className={styles.loading}><Spinner /></div>;
  }

  if ((user as any)?.role === 'SUPERADMIN') {
    return <SuperAdminDashboard userName={user?.name ?? ''} />;
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
        {weatherGreeting && <p className={styles.weatherGreeting}>{weatherGreeting}</p>}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          오늘의 일정
          {isOnLeaveToday && <span className={styles.leaveBadge}>오늘 휴가</span>}
        </h2>
        {loadingTasks ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyDesc}>불러오는 중...</p>
          </div>
        ) : todayTasks.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyDesc}>오늘 예정된 업무가 없습니다.</p>
          </div>
        ) : (
          <ul className={styles.taskList}>
            {todayTasks.map((t) => (
              <li key={t.id} className={styles.taskItem}>
                {renderTaskGroup(t)}
                <Link href={`/tasks/${t.id}`} className={styles.taskTitle}>
                  {t.title}
                </Link>
                <span className={styles.taskStatus}>{statusLabels[t.status] ?? t.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {user?.role === 'ADMIN' && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>관리 기능</h2>
          <div>
            <Link href="/users" className={styles.actionLink}>
              팀원관리
            </Link>
          </div>
        </div>
      )}

      {user?.role === 'LEADER' && (
        <div className={styles.section}>
          <div className={styles.linkRow}>
            <Link href="/tasks" className={styles.actionLink}>
              업무 배정
            </Link>
            <Link href="/stats" className={styles.actionLink}>
              통계 조회
            </Link>
            <Link href="/calendar" className={styles.actionLink}>
              캘린더
            </Link>
            <Link href="/requests" className={styles.actionLink}>
              신규 신청
            </Link>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>나의 업무</h2>
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
