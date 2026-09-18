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

interface AuditLogEntry {
  id: number;
  action: string;
  userEmail: string | null;
  createdAt: string;
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  USER_LOGIN: '로그인',
  USER_CREATED: '사용자 생성',
  USER_DELETED: '사용자 삭제',
  USER_ROLE_CHANGED: '역할 변경',
  '2FA_ENABLED': '2FA 활성화',
  '2FA_DISABLED': '2FA 비활성화',
  ORG_DELETED: '조직 삭제',
  SETTING_CHANGED: '설정 변경',
};

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
        <p className={styles.subtitle}>최고관리자 계정입니다.</p>
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

interface SummaryTask {
  id: number;
  title: string;
  status: string;
  targetDate: string | null;
  worker: { id: number; name: string } | null;
}

interface WorkerSummary {
  role: 'WORKER';
  dueToday: SummaryTask[];
  dueSoon: SummaryTask[];
  overdue: SummaryTask[];
  requestedOfMe: SummaryTask[];
  unreadAnnouncements: { id: number; content: string; createdAt: string }[];
  recentDecisions: { id: number; type: string; title: string; status: string; rejectReason: string | null; decidedAt: string }[];
  todaySchedule: SummaryTask[];
}

interface ManagerSummary {
  role: 'LEADER' | 'ADMIN';
  projectProgress: { projectId: number; name: string; total: number; done: number; rate: number }[];
  overdueTasks: SummaryTask[];
  unassignedTasks: SummaryTask[];
  byWorker: { userId: number; name: string; activeTasks: number; overdueTasks: number }[];
  missingWeeklyReport: { id: number; name: string }[];
  pendingApprovals: { id: number; type: string; title: string; requester: { id: number; name: string }; createdAt: string }[];
}

const REQUEST_TYPE_LABEL: Record<string, string> = { LEAVE: '휴가', SUPPLY: '비품' };

function readDismissedAnnouncementIds(): number[] {
  try {
    const raw = localStorage.getItem('dismissedAnnouncementIds');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
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
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [summary, setSummary] = useState<WorkerSummary | ManagerSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);

  useEffect(() => {
    setDismissedIds(readDismissedAnnouncementIds());
  }, []);

  useEffect(() => {
    if (isLoading || !user || user.role === 'SUPERADMIN') { setLoadingSummary(false); return; }
    apiClient.get<{ data: WorkerSummary | ManagerSummary }>('/dashboard/summary')
      .then((res) => setSummary(res.data.data))
      .catch(() => {})
      .finally(() => setLoadingSummary(false));
  }, [isLoading, user]);

  useEffect(() => {
    if (isLoading || !user || user.role !== 'ADMIN') { setLoadingAudit(false); return; }
    apiClient.get<{ data: { logs: AuditLogEntry[] } }>('/settings/audit?limit=5')
      .then((res) => setAuditLogs(res.data.data.logs))
      .catch(() => {})
      .finally(() => setLoadingAudit(false));
  }, [isLoading, user]);

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
        {weatherGreeting && <p className={styles.weatherGreeting}>{weatherGreeting}</p>}
      </div>

      {!loadingSummary && summary?.role === 'WORKER' && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>지금 해야 할 일</h2>
          <div className={styles.widgetGrid}>
            <div className={styles.widget}>
              <div className={styles.widgetTitle}>
                마감 임박(3일 이내)
                {summary.dueSoon.length > 0 && <span className={styles.widgetCount}>{summary.dueSoon.length}</span>}
              </div>
              {summary.dueSoon.length === 0 ? (
                <p className={styles.widgetEmpty}>없음</p>
              ) : (
                <div className={styles.widgetList}>
                  {summary.dueSoon.map((t) => (
                    <div key={t.id} className={styles.widgetRow}>
                      <Link href={`/tasks/${t.id}`} className={styles.widgetRowTitle}>{t.title}</Link>
                      <span className={styles.widgetRowMeta}>{t.targetDate ? new Date(t.targetDate).toLocaleDateString('ko-KR') : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.widget}>
              <div className={styles.widgetTitle}>
                지연 업무
                {summary.overdue.length > 0 && <span className={`${styles.widgetCount} ${styles.widgetCountDanger}`}>{summary.overdue.length}</span>}
              </div>
              {summary.overdue.length === 0 ? (
                <p className={styles.widgetEmpty}>없음</p>
              ) : (
                <div className={styles.widgetList}>
                  {summary.overdue.map((t) => (
                    <div key={t.id} className={styles.widgetRow}>
                      <Link href={`/tasks/${t.id}`} className={styles.widgetRowTitle}>{t.title}</Link>
                      <span className={styles.widgetRowMeta}>{t.targetDate ? new Date(t.targetDate).toLocaleDateString('ko-KR') : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.widget}>
              <div className={styles.widgetTitle}>
                나에게 요청된 업무(검토)
                {summary.requestedOfMe.length > 0 && <span className={styles.widgetCount}>{summary.requestedOfMe.length}</span>}
              </div>
              {summary.requestedOfMe.length === 0 ? (
                <p className={styles.widgetEmpty}>없음</p>
              ) : (
                <div className={styles.widgetList}>
                  {summary.requestedOfMe.map((t) => (
                    <div key={t.id} className={styles.widgetRow}>
                      <Link href={`/tasks/${t.id}`} className={styles.widgetRowTitle}>{t.title}</Link>
                      <span className={styles.widgetRowMeta}>{t.worker?.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.widget}>
              <div className={styles.widgetTitle}>
                읽지 않은 공지
                {summary.unreadAnnouncements.filter((a) => !dismissedIds.includes(a.id)).length > 0 && (
                  <span className={styles.widgetCount}>{summary.unreadAnnouncements.filter((a) => !dismissedIds.includes(a.id)).length}</span>
                )}
              </div>
              {summary.unreadAnnouncements.filter((a) => !dismissedIds.includes(a.id)).length === 0 ? (
                <p className={styles.widgetEmpty}>없음</p>
              ) : (
                <div className={styles.widgetList}>
                  {summary.unreadAnnouncements.filter((a) => !dismissedIds.includes(a.id)).slice(0, 5).map((a) => (
                    <div key={a.id} className={styles.widgetRow}>
                      <span className={styles.widgetRowTitle}>{a.content.slice(0, 40)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.widget}>
              <div className={styles.widgetTitle}>승인 결과</div>
              {summary.recentDecisions.length === 0 ? (
                <p className={styles.widgetEmpty}>최근 결정된 신청이 없습니다.</p>
              ) : (
                <div className={styles.widgetList}>
                  {summary.recentDecisions.map((r) => (
                    <div key={r.id} className={styles.widgetRow}>
                      <span className={styles.widgetRowTitle}>{REQUEST_TYPE_LABEL[r.type] || r.type} · {r.title}</span>
                      <span className={styles.widgetRowMeta}>{r.status === 'APPROVED' ? '승인' : '반려'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!loadingSummary && (summary?.role === 'LEADER' || summary?.role === 'ADMIN') && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>팀 현황</h2>
          <div className={styles.widgetGrid}>
            <div className={styles.widget}>
              <div className={styles.widgetTitle}>프로젝트 진행 현황</div>
              {summary.projectProgress.length === 0 ? (
                <p className={styles.widgetEmpty}>소속된 프로젝트가 없습니다.</p>
              ) : (
                <div className={styles.widgetList}>
                  {summary.projectProgress.map((p) => (
                    <div key={p.projectId} className={styles.widgetList} style={{ gap: 4 }}>
                      <div className={styles.widgetRow}>
                        <span className={styles.widgetRowTitle}>{p.name}</span>
                        <span className={styles.widgetRowMeta}>{p.done}/{p.total} ({p.rate}%)</span>
                      </div>
                      <div className={styles.progressBarTrack}>
                        <div className={styles.progressBarFill} style={{ width: `${p.rate}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.widget}>
              <div className={styles.widgetTitle}>
                지연 업무
                {summary.overdueTasks.length > 0 && <span className={`${styles.widgetCount} ${styles.widgetCountDanger}`}>{summary.overdueTasks.length}</span>}
              </div>
              {summary.overdueTasks.length === 0 ? (
                <p className={styles.widgetEmpty}>없음</p>
              ) : (
                <div className={styles.widgetList}>
                  {summary.overdueTasks.map((t) => (
                    <div key={t.id} className={styles.widgetRow}>
                      <Link href={`/tasks/${t.id}`} className={styles.widgetRowTitle}>{t.title}</Link>
                      <span className={styles.widgetRowMeta}>{t.worker?.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.widget}>
              <div className={styles.widgetTitle}>담당자 없는 업무</div>
              {summary.unassignedTasks.length === 0 ? (
                <p className={styles.widgetEmpty}>없음</p>
              ) : (
                <div className={styles.widgetList}>
                  {summary.unassignedTasks.map((t) => (
                    <div key={t.id} className={styles.widgetRow}>
                      <Link href={`/tasks/${t.id}`} className={styles.widgetRowTitle}>{t.title}</Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.widget}>
              <div className={styles.widgetTitle}>팀원별 업무 현황</div>
              {summary.byWorker.length === 0 ? (
                <p className={styles.widgetEmpty}>팀원이 없습니다.</p>
              ) : (
                <div className={styles.widgetList}>
                  {summary.byWorker.map((w) => (
                    <div key={w.userId} className={styles.widgetRow}>
                      <span className={styles.widgetRowTitle}>{w.name}</span>
                      <span className={styles.widgetRowMeta}>진행 {w.activeTasks}건{w.overdueTasks > 0 ? ` · 지연 ${w.overdueTasks}건` : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.widget}>
              <div className={styles.widgetTitle}>
                미작성 주간보고
                {summary.missingWeeklyReport.length > 0 && <span className={styles.widgetCount}>{summary.missingWeeklyReport.length}</span>}
              </div>
              {summary.missingWeeklyReport.length === 0 ? (
                <p className={styles.widgetEmpty}>모두 작성했습니다.</p>
              ) : (
                <div className={styles.widgetList}>
                  {summary.missingWeeklyReport.map((u) => (
                    <div key={u.id} className={styles.widgetRow}>
                      <span className={styles.widgetRowTitle}>{u.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.widget}>
              <div className={styles.widgetTitle}>
                승인 대기
                {summary.pendingApprovals.length > 0 && <span className={styles.widgetCount}>{summary.pendingApprovals.length}</span>}
              </div>
              {summary.pendingApprovals.length === 0 ? (
                <p className={styles.widgetEmpty}>없음</p>
              ) : (
                <div className={styles.widgetList}>
                  {summary.pendingApprovals.map((r) => (
                    <div key={r.id} className={styles.widgetRow}>
                      <Link href="/requests" className={styles.widgetRowTitle}>{REQUEST_TYPE_LABEL[r.type] || r.type} · {r.requester.name}</Link>
                      <span className={styles.widgetRowMeta}>{r.title.slice(0, 20)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {user?.role !== 'ADMIN' && loadingTasks && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>오늘의 일정</h2>
          <div className={styles.emptyState}>
            <p className={styles.emptyDesc}>불러오는 중...</p>
          </div>
        </div>
      )}

      {user?.role !== 'ADMIN' && !loadingTasks && todayTasks.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            오늘의 일정
            {isOnLeaveToday && <span className={styles.leaveBadge}>오늘 휴가</span>}
          </h2>
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
        </div>
      )}

      {user?.role === 'ADMIN' && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>최근 감사 로그</h2>
          {loadingAudit ? (
            <Spinner />
          ) : auditLogs.length === 0 ? (
            <p className={styles.emptyDesc}>최근 활동이 없습니다.</p>
          ) : (
            <>
              <ul className={styles.taskList}>
                {auditLogs.map((log) => (
                  <li key={log.id} className={styles.auditRow}>
                    <span className={styles.auditAction}>{AUDIT_ACTION_LABELS[log.action] || log.action}</span>
                    <span className={styles.auditMeta}>{log.userEmail || '-'}</span>
                    <span className={styles.auditMeta}>{new Date(log.createdAt).toLocaleString('ko-KR')}</span>
                  </li>
                ))}
              </ul>
              <Link href="/settings/audit" className={styles.actionLink}>
                전체 보기 →
              </Link>
            </>
          )}
        </div>
      )}

      {['LEADER', 'WORKER'].includes(user?.role || '') && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>바로가기</h2>
          <div className={styles.quickLinkGrid}>
            <Link href="/tasks" className={styles.quickLinkCard}>
              <span className={styles.quickLinkIcon}>📋</span>
              업무 배정
            </Link>
            <Link href="/stats" className={styles.quickLinkCard}>
              <span className={styles.quickLinkIcon}>📊</span>
              통계 조회
            </Link>
            <Link href="/calendar" className={styles.quickLinkCard}>
              <span className={styles.quickLinkIcon}>📅</span>
              캘린더
            </Link>
            <Link href="/requests" className={styles.quickLinkCard}>
              <span className={styles.quickLinkIcon}>📝</span>
              신규 신청
            </Link>
          </div>
        </div>
      )}

      {user?.role !== 'ADMIN' && (
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
      )}

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
