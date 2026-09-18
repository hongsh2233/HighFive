import { prisma } from './db';
import { createUserNotification } from './notify';
import { getProjectStatuses } from './task-status';
import { computeNextRunAt } from './recurring-tasks';

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

        // 자동화 규칙: 업무가 이미 지연된 경우(마감 초과) 담당자의 매니저에게도 알림
        if (diffDays < 0) {
          const worker = await prisma.user.findUnique({ where: { id: task.workerId }, select: { managerId: true } });
          if (worker?.managerId) {
            const managerAlready = await prisma.userNotification.findFirst({
              where: { taskId: task.id, userId: worker.managerId, type: 'TASK_OVERDUE_MANAGER', createdAt: { gte: todayStart, lte: todayEnd } },
            });
            if (!managerAlready) {
              await createUserNotification(
                worker.managerId,
                'TASK_OVERDUE_MANAGER',
                `담당 팀원의 '${task.title}' 업무가 ${label} 지연되었습니다.`,
                task.id,
                org.id
              );
            }
          }
        }
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

      // 자동화 규칙: 매주 금요일, 이번 주 주간보고 미작성 프로젝트 멤버에게 리마인더(하루 1회)
      if (todayStart.getDay() === 5) {
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // 이번 주 월요일
        const projects = await prisma.project.findMany({
          where: { organizationId: org.id, status: 'ACTIVE' },
          select: { id: true, members: { select: { userId: true } } },
        });
        for (const project of projects) {
          const memberIds = project.members.map((m) => m.userId);
          if (memberIds.length === 0) continue;
          const reported = await prisma.weeklyReport.findMany({
            where: { projectId: project.id, periodStart: { gte: weekStart }, authorId: { in: memberIds } },
            select: { authorId: true },
          });
          const reportedIds = new Set(reported.map((r) => r.authorId));
          for (const uid of memberIds) {
            if (reportedIds.has(uid)) continue;
            const already = await prisma.userNotification.findFirst({
              where: { userId: uid, type: 'WEEKLY_REPORT_REMINDER', createdAt: { gte: todayStart, lte: todayEnd } },
            });
            if (already) continue;
            await createUserNotification(uid, 'WEEKLY_REPORT_REMINDER', '이번 주 주간보고 작성을 잊지 마세요.', undefined, org.id);
          }
        }
      }

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

async function runRecurringTaskGeneration() {
  try {
    const dueRules = await prisma.recurringTaskRule.findMany({
      where: { isActive: true, nextRunAt: { lte: new Date() } },
    });

    for (const rule of dueRules) {
      const [initialStatus] = await getProjectStatuses(rule.projectId);
      const targetDate = rule.targetDaysOffset
        ? new Date(rule.nextRunAt.getTime() + rule.targetDaysOffset * 86400000)
        : rule.nextRunAt;

      const task = await prisma.task.create({
        data: {
          title: rule.title,
          notes: rule.notes,
          workerId: rule.workerId,
          registrantId: rule.createdById,
          targetDate,
          status: initialStatus.code,
          projectId: rule.projectId,
          organizationId: rule.organizationId,
        },
      });

      await createUserNotification(
        rule.workerId,
        'WORKER_ASSIGNED',
        `반복 업무 '${task.title}'가 자동으로 등록되었습니다.`,
        task.id,
        rule.organizationId
      );

      await prisma.recurringTaskRule.update({
        where: { id: rule.id },
        data: {
          lastRunAt: new Date(),
          nextRunAt: computeNextRunAt(rule.nextRunAt, rule.frequency, rule.config as any),
        },
      });
    }
  } catch (e) {
    console.error('[scheduler] recurring task generation failed:', e);
  }
}

let started = false;

export function startScheduler() {
  if (started) return;
  started = true;
  runDeadlineCheck();
  runRecurringTaskGeneration();
  setInterval(runDeadlineCheck, INTERVAL_MS);
  setInterval(runRecurringTaskGeneration, INTERVAL_MS);
}
