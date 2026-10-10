'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useWorkHub } from '@/hooks/useWorkHub';
import apiClient from '@/lib/api-client';
import { focusTasks, isDone, taskRisk } from '@/lib/work-hub';
import TaskViews from '@/components/work/TaskViews';
import TaskCards from '@/components/work/TaskCards';
import Spinner from '@/components/common/Spinner';
import styles from '@/components/work/WorkHub.module.css';

interface Milestone { id: number; title: string; dueDate: string | null; isDone: boolean }
const TABS = ['개요', '업무', '문서', '일정', '활동', '리포트'];
export default function ProjectOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const projectId = Number(id);
  const hub = useWorkHub(projectId);
  const [tab, setTab] = useState('개요');
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestoneError, setMilestoneError] = useState('');
  const project = hub.projects.find(p => p.id === projectId);
  const allowed = !!project;
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    setMilestones([]); setMilestoneError('');
    apiClient.get<{ data: Milestone[] }>(`/projects/${projectId}/milestones`, { signal: controller.signal })
      .then(res => { if (!controller.signal.aborted) setMilestones(res.data.data); })
      .catch(() => { if (!controller.signal.aborted) setMilestoneError('마일스톤을 조회할 수 없습니다. 권한 또는 연결 상태를 확인하세요.'); });
    return () => controller.abort();
  }, [projectId, allowed]);
  if (hub.loading) return <Spinner />;
  if (hub.error) return <div role="alert" className={styles.error}>{hub.error}<button className={styles.button} onClick={hub.reload}>다시 시도</button></div>;
  if (!project) return <div role="alert" className={styles.error}>프로젝트를 찾을 수 없거나 접근 권한이 없습니다. <Link href="/projects">프로젝트 목록</Link></div>;
  const items = hub.tasks.filter(t => !t.isGroup);
  const done = items.filter(t => isDone(t, hub.getStatuses));
  const overdue = focusTasks(items, 'overdue', hub.getStatuses);
  const rate = items.length ? Math.round(done.length / items.length * 100) : 0;
  const pending = items.filter(t => !isDone(t, hub.getStatuses));
  const dateRange = items.flatMap(t => t.targetDate ? [t.targetDate] : []).sort();
  const workloads = new Map<string, number>();
  pending.forEach(t => { const name = t.worker?.name || '미배정'; workloads.set(name, (workloads.get(name) || 0) + 1); });
  const recent = [...items].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 8);
  return <section className={styles.page}><Link href="/projects" className={styles.muted}>← 프로젝트 목록</Link>
    <header className={styles.header}><div><h1>{project.name}</h1><p className={styles.muted}>{project.description || '프로젝트 개요'} · {project.status === 'ACTIVE' ? '진행 중' : '종료'}</p></div>
      {['ADMIN', 'LEADER'].includes(hub.user?.role || '') && <Link href={`/tasks/create?projectId=${project.id}`} className={styles.button}>새 업무</Link>}</header>
    <nav className={styles.tabs} aria-label="프로젝트 화면">{TABS.map(label => <button key={label} className={`${styles.tab} ${tab === label ? styles.active : ''}`} aria-pressed={tab === label} onClick={() => setTab(label)}>{label}</button>)}</nav>
    {tab === '개요' && <><div className={styles.metrics}>{[['조회 가능 업무', items.length], ['완료', done.length], ['미완료', pending.length], ['지연', overdue.length]].map(([label, value]) => <div key={label} className={styles.metric}>{label}<strong>{value}</strong></div>)}</div>
      <div className={styles.columns}><div>
        <div className={styles.card}><h2>프로젝트 정보</h2><p className={styles.muted}>집계는 내 권한으로 조회 가능한 업무 기준입니다.</p><p className={styles.text}>PM: {project.projectManagerName || '미지정'}<br />등록일: {new Date(project.createdAt).toLocaleDateString('ko-KR')}<br />업무 마감 범위: {dateRange.length ? `${new Date(dateRange[0]).toLocaleDateString('ko-KR')} ~ ${new Date(dateRange[dateRange.length - 1]).toLocaleDateString('ko-KR')}` : '미정'}</p>
          <label className={styles.muted}>진행률 {rate}%<progress className={styles.progress} value={rate} max={100} /></label>
          <h3>팀원</h3><p className={styles.text}>{project.members.map(m => m.user.name).join(', ') || '등록된 팀원이 없습니다.'}</p>
          {project.roles?.map((role, index) => <p key={index} className={styles.muted}>{role.label}: {role.user?.name || role.userName || '미지정'}</p>)}
        </div>
        <div className={styles.card}><h2>마일스톤</h2>{milestoneError ? <p className={styles.muted}>{milestoneError}</p> : milestones.length ? milestones.map(m => <p key={m.id} className={styles.text}>{m.isDone ? '✓' : '○'} {m.title} · {m.dueDate ? new Date(m.dueDate).toLocaleDateString('ko-KR') : '일정 미정'}</p>) : <p className={styles.empty}>등록된 마일스톤이 없습니다.</p>}</div>
        <div className={styles.card}><h2>최근 업무 변경</h2><TaskCards tasks={recent} getStatuses={hub.getStatuses} /></div>
      </div><aside className={`${styles.card} ${styles.jia}`}><h2>JIA 프로젝트 점검</h2><p className={styles.muted}>조회 데이터 기준 점검 · AI 분석 확장 예정</p>
        <p className={styles.text}>지연 업무 {overdue.length}건 · 선행 업무 대기 {pending.filter(t => t.hasIncompleteBlockers).length}건</p>
        <h3>담당자별 미완료 업무</h3>{Array.from(workloads).map(([name, count]) => <p key={name} className={styles.muted}>{name}: {count}건</p>)}
        <h3>다음 권장 행동</h3><p className={styles.text}>{overdue.length ? '지연 업무의 담당자와 완료 예상일을 확인하세요.' : '다가오는 마일스톤과 검토 대기 업무를 확인하세요.'}</p>
        <TaskCards tasks={pending.filter(t => taskRisk(t, hub.getStatuses)).slice(0, 4)} getStatuses={hub.getStatuses} /></aside></div></>}
    {tab === '업무' && <TaskViews key={`tasks-${projectId}`} projectId={projectId} tasks={items} getStatuses={hub.getStatuses} onChanged={hub.reload} />}
    {tab === '일정' && <TaskViews key={`calendar-${projectId}`} initialView="calendar" projectId={projectId} tasks={items} getStatuses={hub.getStatuses} onChanged={hub.reload} />}
    {tab === '활동' && <div className={styles.card}><h2>최근 업무 변경</h2><p className={styles.muted}>전체 변경 이력과 댓글은 각 업무 상세에서 확인하세요. 통합 활동·AI 감사 로그는 후속 단계입니다.</p><TaskCards tasks={recent} getStatuses={hub.getStatuses} /></div>}
    {tab === '문서' && <div className={styles.card}><h2>Work Docs</h2><p className={styles.muted}>업무 연결·수정 이력·Action Item 추출을 다음 단계에서 확장합니다.</p>{project.wikiEnabled && <Link href={`/projects/${projectId}/wiki`} className={styles.button}>기존 프로젝트 위키</Link>}<Link href={`/projects/${projectId}/meetings`} className={styles.button}>회의록</Link></div>}
    {tab === '리포트' && <div className={styles.card}><h2>프로젝트 리포트 · 준비 중</h2><p className={styles.muted}>완료율·지연율·주간 변화와 JIA 해석은 다음 단계에서 연결합니다.</p></div>}
  </section>;
}
