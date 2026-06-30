import { prisma } from './db';

export type HistoryAction =
  | 'CREATED'
  | 'STATUS_CHANGED'
  | 'WORKER_CHANGED'
  | 'TIMER_START'
  | 'TIMER_STOP'
  | 'NOTE_UPDATED'
  | 'TRANSFERRED'
  | 'TITLE_CHANGED'
  | 'TARGET_DATE_CHANGED';

export async function addHistory(
  taskId: number,
  userId: number,
  action: HistoryAction,
  detail?: string
) {
  try {
    await prisma.taskHistory.create({ data: { taskId, userId, action, detail: detail ?? null } });
  } catch (e) {
    console.error('[task-history] failed to add history:', e);
  }
}

export const actionLabel: Record<HistoryAction, string> = {
  CREATED: '업무 생성',
  STATUS_CHANGED: '상태 변경',
  WORKER_CHANGED: '담당자 변경',
  TIMER_START: '작업 착수',
  TIMER_STOP: '작업 종료',
  NOTE_UPDATED: '비고 수정',
  TRANSFERRED: '업무 이관',
  TITLE_CHANGED: '제목 변경',
  TARGET_DATE_CHANGED: '목표일 변경',
};
