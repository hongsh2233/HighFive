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

export async function notifyStatusChanged(
  taskId: number,
  taskTitle: string,
  workerId: number,
  plannerId: number,
  newStatusLabel: string,
  changedByUserId: number
) {
  // 상태를 변경한 사람 본인에게는 알림을 만들지 않는다. 담당자==기획자인 업무는 중복 방지.
  const recipients = new Set<number>();
  if (workerId !== changedByUserId) recipients.add(workerId);
  if (plannerId !== changedByUserId) recipients.add(plannerId);

  await Promise.all(
    Array.from(recipients).map((userId) =>
      createUserNotification(userId, 'STATUS_CHANGED',
        `'${taskTitle}' 업무 상태가 '${newStatusLabel}'(으)로 변경되었습니다.`, taskId)
    )
  );
}
