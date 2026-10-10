'use client';
import { useState } from 'react';
import Link from 'next/link';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';
import { useRouter } from 'next/navigation';
import type { Task } from '@/types';
import { parseTaskDate, type StatusResolver } from '@/lib/work-hub';
import { navigateTabs } from './tabs';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import TaskCards from './TaskCards';
import styles from './WorkHub.module.css';

export type BoardView = 'kanban' | 'list' | 'calendar' | 'assignee';
const VIEW_LABELS: Record<BoardView, string> = { kanban: 'Kanban', list: 'List', calendar: 'Calendar', assignee: 'Assignee' };
export default function TaskViews({ tasks, getStatuses, projectId, initialView = 'kanban', onChanged, projects }: {
  tasks: Task[]; getStatuses: StatusResolver; projectId?: number; initialView?: BoardView; onChanged?: () => void; projects?: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [view, setView] = useState<BoardView>(initialView);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selection, setSelection] = useState('');
  const scopedProjectId = projectId ?? (selection ? Number(selection) : undefined);
  const options = projects ?? Array.from(new Map(tasks.flatMap(t => t.project ? [[t.project.id, t.project] as const] : [])).values());
  const items = tasks.filter(t => !t.isGroup && (!scopedProjectId || t.projectId === scopedProjectId));
  const groups = new Map<number, { name: string; tasks: Task[] }>();
  items.forEach(t => {
    const key = t.workerId || 0;
    if (!groups.has(key)) groups.set(key, { name: t.worker?.name || '미배정', tasks: [] });
    groups.get(key)!.tasks.push(t);
  });
  const days = eachDayOfInterval({ start: startOfWeek(month, { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) });
  const byDate = new Map<string, Task[]>();
  items.forEach(task => { const date = parseTaskDate(task.targetDate); if (!date) return; const key = format(date, 'yyyy-MM-dd'); byDate.set(key, [...(byDate.get(key) || []), task]); });
  return <div>
    {!projectId && <label className={styles.muted}>프로젝트 <select aria-label="업무 보기 프로젝트" className={styles.button} value={selection} onChange={e => setSelection(e.target.value)}><option value="">전체 프로젝트</option>{options.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
    <div role="tablist" aria-label="업무 보기" className={styles.tabs}>{Object.entries(VIEW_LABELS).map(([key, label]) =>
      <button role="tab" aria-selected={view === key} tabIndex={view === key ? 0 : -1} onKeyDown={navigateTabs} key={key} onClick={() => setView(key as BoardView)} className={`${styles.tab} ${view === key ? styles.active : ''}`}>{label}</button>)}
      <Link href={scopedProjectId ? `/tasks?projectId=${scopedProjectId}` : '/tasks'} className={styles.button}>목록에서 업무 편집</Link>
    </div>
    {view === 'kanban' && <KanbanBoard key={scopedProjectId ?? 'all'} projectId={scopedProjectId} hideProjectSelect onChanged={onChanged} onTaskClick={task => router.push(`/tasks/${task.id}`)} />}
    {view === 'list' && <TaskCards tasks={items} getStatuses={getStatuses} />}
    {view === 'assignee' && (groups.size ? Array.from(groups).map(([id, group]) => <section key={id} className={styles.card}><h3>{group.name} · {group.tasks.length}건</h3><TaskCards tasks={group.tasks} getStatuses={getStatuses} /></section>) : <p className={styles.empty}>배정된 업무가 없습니다.</p>)}
    {view === 'calendar' && <section className={styles.card} aria-label="업무 마감 캘린더"><div className={styles.header}>
      <h2>{format(month, 'yyyy년 M월')}</h2><div className={styles.row}><button className={styles.button} aria-label="이전 달" onClick={() => setMonth(addMonths(month, -1))}>←</button>
        <button className={styles.button} onClick={() => setMonth(startOfMonth(new Date()))}>이번 달</button><button className={styles.button} aria-label="다음 달" onClick={() => setMonth(addMonths(month, 1))}>→</button></div></div>
      <div className={styles.calendar}>{['월', '화', '수', '목', '금', '토', '일'].map(day => <div key={day} className={styles.muted}>{day}</div>)}
        {days.map(day => { const key = format(day, 'yyyy-MM-dd'); return <div key={key} className={styles.day}><time dateTime={key} className={day.getMonth() !== month.getMonth() ? styles.muted : ''}>{format(day, 'M/d')}</time>
          {(byDate.get(key) || []).map(t => <Link href={`/tasks/${t.id}`} key={t.id}>{t.title}</Link>)}</div>; })}</div>
    </section>}
  </div>;
}
