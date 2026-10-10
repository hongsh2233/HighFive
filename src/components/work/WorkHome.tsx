'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWorkHub } from '@/hooks/useWorkHub';
import apiClient from '@/lib/api-client';
import { FOCUS_LABELS, focusTasks, isDone, taskRisk, dueDays, type TaskFocus } from '@/lib/work-hub';
import type { UserNotification } from '@/types';
import TaskCards from './TaskCards';
import Spinner from '@/components/common/Spinner';
import styles from './WorkHub.module.css';

export default function WorkHome({ personal = false }: { personal?: boolean }) {
  const { user, tasks, projects, loading, error, reload, getStatuses } = useWorkHub();
  const [focus, setFocus] = useState<TaskFocus>('today');
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notificationError, setNotificationError] = useState(false);
  const [briefingEnabled, setBriefingEnabled] = useState(false);
  const [briefing, setBriefing] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const userId = user?.id;
  useEffect(() => {
    if (!userId || personal) return;
    let active = true;
    apiClient.get<{ data: { notifications: UserNotification[] } }>('/notifications').then(res => { if (active) setNotifications(res.data.data.notifications); })
      .catch(() => { if (active) setNotificationError(true); });
    apiClient.get<{ data: { features: { dailyBriefing?: boolean } } }>('/settings/ai/status')
      .then(res => { if (active) setBriefingEnabled(!!res.data.data.features.dailyBriefing); }).catch(() => {});
    return () => { active = false; };
  }, [userId, personal]);
  if (loading) return <Spinner />;
  if (error) return <div role="alert" className={styles.error}>{error} <button className={styles.button} onClick={reload}>다시 시도</button></div>;
  const mine = tasks.filter(t => t.workerId === Number(userId));
  const overdue = focusTasks(mine, 'overdue', getStatuses);
  const today = focusTasks(mine, 'today', getStatuses);
  const waiting = focusTasks(mine, 'waiting', getStatuses);
  const requested = tasks.filter(t => !t.isGroup && t.registrantId === Number(userId) && t.workerId !== Number(userId) && !isDone(t, getStatuses));
  const dueSoon = mine.filter(t => !t.isGroup && !isDone(t, getStatuses) && dueDays(t) !== null && dueDays(t)! > 0 && dueDays(t)! <= 3);
  const unread = notifications.filter(n => !n.isRead && ['COMMENT_MENTION', 'NEW_COMMENT'].includes(n.type));
  const riskyProjects = projects.map(p => ({ ...p, risks: tasks.filter(t => t.projectId === p.id && !t.isGroup && taskRisk(t, getStatuses)) }))
    .filter(p => p.risks.length || ['RISK', 'CAUTION', 'ON_HOLD'].includes(p.healthStatus || ''));
  const generateBriefing = async () => {
    setAiLoading(true); setAiError('');
    try { const res = await apiClient.post<{ data: { briefing: string } }>('/ai/daily-briefing'); setBriefing(res.data.data.briefing); }
    catch { setAiError('브리핑을 생성하지 못했습니다. AI 설정과 연결 상태를 확인해 주세요.'); }
    finally { setAiLoading(false); }
  };
  return <section className={styles.page}>
    <header className={styles.header}><div><h1>{personal ? '내 업무' : `${user?.name || ''}님, 오늘의 업무 브리핑`}</h1>
      <p className={styles.muted}>{personal ? '내게 배정된 업무를 마감과 진행 상황별로 확인하세요.' : '지금 확인할 일과 다음 행동을 한곳에서 확인하세요.'}</p></div>
      <div className={styles.row}><Link className={styles.button} href="/tasks/kanban">업무 보드</Link><Link className={styles.button} href="/tasks">전체 업무 목록</Link></div></header>
    <div className={styles.metrics}>
      {([['today', '오늘 마감', today.length], ['overdue', '지연', overdue.length], ['waiting', '대기', waiting.length], ['week', '이번 주', focusTasks(mine, 'week', getStatuses).length]] as const).map(([key, label, count]) =>
        <button key={key} className={styles.metric} onClick={() => setFocus(key)}><span>{label}</span><strong>{count}</strong><span className={styles.muted}>내 업무 확인 →</span></button>)}
    </div>
    <div className={personal ? '' : styles.columns}>
      <div><div className={styles.tabs} role="tablist" aria-label="내 업무 필터">{Object.entries(FOCUS_LABELS).map(([key, label]) =>
        <button role="tab" aria-selected={focus === key} key={key} className={`${styles.tab} ${focus === key ? styles.active : ''}`} onClick={() => setFocus(key as TaskFocus)}>{label}</button>)}</div>
        <div className={styles.card}><h2>{FOCUS_LABELS[focus]} 업무</h2><TaskCards tasks={focusTasks(mine, focus, getStatuses)} getStatuses={getStatuses} /></div>
        {!personal && <div className={styles.card}><h2>마감 임박 · 3일 이내</h2><TaskCards tasks={dueSoon} getStatuses={getStatuses} /></div>}
        {!personal && <div className={styles.card}><h2>내가 기다리는 업무</h2><p className={styles.muted}>내가 요청하고 다른 담당자가 수행 중인 업무 · 조회 권한 범위 기준</p><TaskCards tasks={requested} getStatuses={getStatuses} /></div>}
      </div>
      {!personal && <aside>
        <div className={`${styles.card} ${styles.jia}`}><h2>JIA 업무 브리핑</h2>
          <p className={styles.muted}>업무 데이터 기준 현황 · AI 실행은 요청할 때만 진행됩니다.</p>
          <p className={styles.text}>오늘 마감 {today.length}건, 지연 {overdue.length}건, 대기 {waiting.length}건입니다.</p>
          {overdue.length > 0 ? <><p className={styles.text}>먼저 지연 업무의 담당자·일정을 확인하세요.</p><Link href={`/tasks/${overdue[0].id}`} className={styles.button}>우선 업무 보기</Link></> : <p className={styles.muted}>오늘 마감 업무부터 확인해 주세요.</p>}
          <div className={styles.tabs}><button className={styles.button} disabled={!briefingEnabled || aiLoading} onClick={generateBriefing}>{aiLoading ? '생성 중…' : 'AI 브리핑 생성'}</button></div>
          {!briefingEnabled && <p className={styles.muted}>AI 브리핑은 조직 AI 설정에서 활성화할 수 있습니다.</p>}
          {aiError && <p role="alert" className={styles.error}>{aiError}</p>}{briefing && <p className={styles.text}>{briefing}</p>}
        </div>
        <div className={styles.card}><h2>새 멘션·댓글</h2>{notificationError ? <p role="alert" className={styles.muted}>알림을 불러오지 못했습니다.</p> : unread.length ? unread.slice(0, 8).map(n => <p key={n.id} className={styles.text}>{n.taskId ? <Link href={`/tasks/${n.taskId}`}>{n.message}</Link> : n.message}</p>) : <p className={styles.empty}>새 멘션이나 댓글이 없습니다.</p>}</div>
        <div className={styles.card}><h2>프로젝트 위험 신호</h2><p className={styles.muted}>내 권한으로 조회 가능한 업무 기준입니다.</p>
          {riskyProjects.length ? riskyProjects.map(p => <p key={p.id} className={styles.text}><Link href={`/projects/${p.id}`}>{p.name}</Link> · 확인할 업무 {p.risks.length}건{p.healthStatus === 'RISK' ? ' · 위험' : ''}</p>) : <p className={styles.empty}>감지된 위험 신호가 없습니다.</p>}</div>
      </aside>}
    </div>
  </section>;
}
