import { addDays, format } from 'date-fns';
import type { Task, ProjectStatusDef } from '../src/types';
export const statuses: ProjectStatusDef[] = [
  { code: 'QUEUED', label: '예정', isDone: false, isProgress: false, order: 0, color: null },
  { code: 'ACTIVE', label: '진행', isDone: false, isProgress: true, order: 1, color: null },
  { code: 'FINISHED', label: '완료', isDone: true, isProgress: false, order: 2, color: null },
];
export const getStatuses = () => statuses;
export function task(overrides: Partial<Task> = {}): Task {
  return { id: 1, title: '디자인 검수', rmsNo: null, registrantId: 1, workerId: 7, status: 'ACTIVE', targetDate: format(new Date(), 'yyyy-MM-dd') + 'T12:00:00', isFreeze: false, templateId: null, notes: null, externalLink: null, labels: null, priority: 'NORMAL', isGroup: false, timeCounterEnabled: false, githubEnabled: false, quickRegister: false, parentTaskId: null, projectId: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), worker: { id: 7, name: '지아', email: 'test@example.com' }, project: { id: 3, name: 'HighFive' }, _count: { subTasks: 0, comments: 2 }, ...overrides };
}
export const tasks = [task(), task({ id: 2, title: 'API 점검', targetDate: addDays(new Date(), -2).toISOString() }), task({ id: 3, title: '완료된 검토', status: 'FINISHED', targetDate: addDays(new Date(), -1).toISOString() }), task({ id: 4, title: '다른 사람 업무', workerId: 8, worker: { id: 8, name: '민수', email: 'other@example.com' } }), task({ id: 5, title: '선행 업무 대기', status: 'QUEUED', hasIncompleteBlockers: true })];
export const project = { id: 3, name: 'HighFive', description: '기존 시스템 고도화', status: 'ACTIVE', wikiEnabled: true, createdAt: new Date().toISOString(), projectManagerName: '한지아', members: [{ user: { id: 7, name: '지아' } }], roles: [] };
