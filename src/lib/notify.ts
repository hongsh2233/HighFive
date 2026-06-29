import { prisma } from './db';
import { notifyStatusChange } from './services/webhook.service';

export async function createUserNotification(
  userId: number,
  type: string,
  message: string,
  taskId?: number
) {
  try {
    await prisma.userNotification.create({ data: { userId, type, message, taskId } });
  } catch (e) {
    console.error('[notify] failed:', e);
  }
}

export async function notifyWorkerChange(
  taskId: number,
  taskTitle: string,
  newWorkerId: number,
  newWorkerName: string,
  plannerId: number,
  plannerName: string,
  taskUrl: string
) {
  // 새 담당자 + 기획자에게 인앱 알림
  await createUserNotification(newWorkerId, 'WORKER_ASSIGNED',
    `'${taskTitle}' 업무가 나에게 배정되었습니다.`, taskId);
  await createUserNotification(plannerId, 'WORKER_CHANGED',
    `'${taskTitle}' 담당자가 ${newWorkerName}으로 변경되었습니다.`, taskId);

  // 기존 채널 웹훅
  notifyStatusChange({ taskId, taskTitle, workerName: newWorkerName, plannerName, status: 'WORKER_CHANGED', taskUrl })
    .catch(() => {});
}

export async function notifyReviewRequest(
  taskId: number,
  taskTitle: string,
  _workerId: number,
  workerName: string,
  plannerId: number,
  plannerName: string,
  taskUrl: string
) {
  // 기획자에게 인앱 알림
  await createUserNotification(plannerId, 'REVIEW_REQUESTED',
    `'${taskTitle}' 검수를 요청했습니다. 담당자: ${workerName}`, taskId);

  // 기존 채널 웹훅
  notifyStatusChange({ taskId, taskTitle, workerName, plannerName, status: 'REVIEW', taskUrl })
    .catch(() => {});
}
