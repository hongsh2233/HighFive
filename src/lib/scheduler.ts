import { prisma } from './db';
import { createUserNotification } from './notify';
import { getProjectStatuses } from './task-status';

const INTERVAL_MS = 30 * 60 * 1000; // 30분마다 실행

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

async function runDeadlineCheck() {
  try {
    const orgs = await prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true, deadlineAlertDays: true },
    });

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    for (const org of orgs) {
      const horizon = new Date(todayStart);
      horizon.setDate(horizon.getDate() + org.deadlineAlertDays);

      const tasks = await prisma.task.findMany({
        where: { organizationId: org.id, targetDate: { lte: endOfDay(horizon) } },
        select: { id: true, title: true, targetDate: true, workerId: true, projectId: true, status: true },
      });

      const statusCache = new Map<string, boolean>();

      for (const task of tasks) {
        if (!task.targetDate) continue;

        const cacheKey = `${task.projectId ?? 'none'}|${task.status}`;
        let isDone = statusCache.get(cacheKey);
        if (isDone === undefined) {
          const statuses = await getProjectStatuses(task.projectId);
          isDone = statuses.find((s) => s.code === task.status)?.isDone ?? false;
          statusCache.set(cacheKey, isDone);
        }
        if (isDone) continue;

        const diffDays = Math.round((startOfDay(task.targetDate).getTime() - todayStart.getTime()) / 86400000);
        if (diffDays > org.deadlineAlertDays) continue;

        // 하루 1회만 알림 (같은 업무·담당자 조합으로 오늘 이미 발송했으면 스킵)
        const already = await prisma.userNotification.findFirst({
          where: {
            taskId: task.id,
            userId: task.workerId,
            type: 'DEADLINE_APPROACHING',
            createdAt: { gte: todayStart, lte: todayEnd },
          },
        });
        if (already) continue;

        const label = diffDays < 0 ? `D+${Math.abs(diffDays)} (마감 초과)` : diffDays === 0 ? 'D-Day' : `D-${diffDays}`;
        await createUserNotification(
          task.workerId,
          'DEADLINE_APPROACHING',
          `'${task.title}' 업무 마감이 ${label}입니다.`,
          task.id,
          org.id
        );
      }

      // 휴가 리마인더: 내일 시작하는 승인된 휴가
      const tomorrowStart = startOfDay(new Date(todayStart.getTime() + 86400000));
      const tomorrowEnd = endOfDay(tomorrowStart);

      const leaves = await prisma.request.findMany({
        where: {
          organizationId: org.id,
          type: 'LEAVE',
          status: 'APPROVED',
          startDate: { gte: tomorrowStart, lte: tomorrowEnd },
        },
        select: { id: true, requesterId: true, title: true },
      });

      for (const leave of leaves) {
        const already = await prisma.userNotification.findFirst({
          where: {
            userId: leave.requesterId,
            type: 'LEAVE_REMINDER',
            createdAt: { gte: todayStart, lte: todayEnd },
          },
        });
        if (already) continue;

        await createUserNotification(
          leave.requesterId,
          'LEAVE_REMINDER',
          `내일부터 '${leave.title}' 휴가가 시작됩니다.`,
          undefined,
          org.id
        );
      }
    }
  } catch (e) {
    console.error('[scheduler] deadline check failed:', e);
  }
}

let started = false;

export function startScheduler() {
  if (started) return;
  started = true;
  runDeadlineCheck();
  setInterval(runDeadlineCheck, INTERVAL_MS);
}
