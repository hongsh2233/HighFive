import { differenceInCalendarDays, startOfWeek, endOfWeek } from 'date-fns';
import type { Task, ProjectStatusDef } from '@/types';

export type TaskFocus = 'today' | 'week' | 'overdue' | 'waiting' | 'done';
export const FOCUS_LABELS: Record<TaskFocus, string> = { today: '오늘', week: '이번 주', overdue: '지연', waiting: '대기', done: '완료' };
export type StatusResolver = (projectId?: number | null) => ProjectStatusDef[];

export function taskState(task: Task, getStatuses: StatusResolver) {
  return getStatuses(task.projectId).find(s => s.code === task.status);
}
export function isDone(task: Task, getStatuses: StatusResolver) {
  return taskState(task, getStatuses)?.isDone ?? task.status === 'DONE';
}
export function dueDays(task: Task, now = new Date()): number | null {
  if (!task.targetDate) return null;
  const date = new Date(task.targetDate);
  return Number.isNaN(date.getTime()) ? null : differenceInCalendarDays(date, now);
}
export function isWaiting(task: Task, getStatuses: StatusResolver) {
  const state = taskState(task, getStatuses);
  return !isDone(task, getStatuses) && (task.hasIncompleteBlockers || (state ? !state.isProgress : ['ASSIGNED', 'REVIEW', 'QA'].includes(task.status)));
}
export function focusTasks(tasks: Task[], focus: TaskFocus, getStatuses: StatusResolver, now = new Date()) {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  return tasks.filter(task => {
    if (task.isGroup) return false;
    const done = isDone(task, getStatuses);
    if (focus === 'done') return done;
    if (done) return false;
    const days = dueDays(task, now);
    if (focus === 'today') return days === 0;
    if (focus === 'overdue') return days !== null && days < 0;
    if (focus === 'waiting') return isWaiting(task, getStatuses);
    return !!task.targetDate && new Date(task.targetDate) >= weekStart && new Date(task.targetDate) <= weekEnd;
  }).sort((a, b) => (a.targetDate ? Date.parse(a.targetDate) : Infinity) - (b.targetDate ? Date.parse(b.targetDate) : Infinity) || a.id - b.id);
}
export function taskRisk(task: Task, getStatuses: StatusResolver, now = new Date()) {
  if (isDone(task, getStatuses)) return null;
  if (task.hasIncompleteBlockers) return '선행 업무 대기';
  const days = dueDays(task, now);
  if (days !== null && days < 0) return `${-days}일 지연`;
  if (days === 0) return '오늘 마감';
  if (days !== null && days <= 3) return `D-${days}`;
  return null;
}
