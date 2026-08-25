import { prisma } from './db';
import { notifyStatusChange } from './services/webhook.service';

async function isMuted(userId: number, taskId?: number): Promise<boolean> {
  if (!taskId) return false;
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
    const targets: { scope: string; targetId: number }[] = [{ scope: 'TASK', targetId: taskId }];
    if (task?.projectId) targets.push({ scope: 'PROJECT', targetId: task.projectId });

    const mute = await prisma.notificationMute.findFirst({
      where: { userId, OR: targets.map((t) => ({ scope: t.scope, targetId: t.targetId })) },
    });
    return !!mute;
  } catch {
    return false;
  }
}

export async function createUserNotification(
  userId: number,
  type: string,
  message: string,
  taskId?: number,
  organizationId?: number
) {
  try {
    if (await isMuted(userId, taskId)) return;
    await prisma.userNotification.create({ data: { userId, type, message, taskId, organizationId } });
  } catch (e) {
    console.error('[notify] failed:', e);
  }
}

export async function notifyWorkerChange(
  taskId: number,
  taskTitle: string,
  newWorkerId: number,
  newWorkerName: string,
  registrantId: number,
  registrantName: string,
  taskUrl: string,
  organizationId?: number
) {
  // 새 담당자 + 등록자에게 인앱 알림
  await createUserNotification(newWorkerId, 'WORKER_ASSIGNED',
    `'${taskTitle}' 업무가 나에게 배정되었습니다.`, taskId, organizationId);
  await createUserNotification(registrantId, 'WORKER_CHANGED',
    `'${taskTitle}' 담당자가 ${newWorkerName}으로 변경되었습니다.`, taskId, organizationId);

  // 기존 채널 웹훅
  notifyStatusChange({ taskId, taskTitle, workerName: newWorkerName, registrantName, status: 'WORKER_CHANGED', taskUrl })
    .catch(() => {});
}

export async function notifyStatusChanged(
  taskId: number,
  taskTitle: string,
  workerId: number,
  registrantId: number,
  newStatusLabel: string,
  changedByUserId: number,
  organizationId?: number
) {
  // 상태를 변경한 사람 본인에게는 알림을 만들지 않는다. 담당자==등록자인 업무는 중복 방지.
  const recipients = new Set<number>();
  if (workerId !== changedByUserId) recipients.add(workerId);
  if (registrantId !== changedByUserId) recipients.add(registrantId);

  await Promise.all(
    Array.from(recipients).map((userId) =>
      createUserNotification(userId, 'STATUS_CHANGED',
        `'${taskTitle}' 업무 상태가 '${newStatusLabel}'(으)로 변경되었습니다.`, taskId, organizationId)
    )
  );
}

export async function notifyInquiryReceived(organizationId: number, name: string) {
  const admins = await prisma.user.findMany({
    where: { organizationId, role: { in: ['ADMIN', 'LEADER'] }, isActive: true },
    select: { id: true },
  });

  await Promise.all(
    admins.map((admin) =>
      createUserNotification(admin.id, 'INQUIRY_RECEIVED',
        `${name}님으로부터 새 문의가 접수되었습니다.`, undefined, organizationId)
    )
  );
}
