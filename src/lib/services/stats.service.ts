import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth } from 'date-fns';

export async function getMonthlySummary(month: string) {
  const date = new Date(month);
  const from = startOfMonth(date);
  const to = endOfMonth(date);

  const [total, byStatus, completedTasks] = await Promise.all([
    prisma.task.count({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.task.groupBy({
      by: ['status'],
      where: { createdAt: { gte: from, lte: to } },
      _count: { status: true },
    }),
    prisma.task.count({ where: { status: 'DONE', updatedAt: { gte: from, lte: to } } }),
  ]);

  return {
    month,
    total,
    completed: completedTasks,
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.status })),
  };
}

export async function getWorkloadStats(from: string, to: string) {
  const logs = await prisma.timeLog.groupBy({
    by: ['workerId'],
    where: { startTime: { gte: new Date(from), lte: new Date(to) } },
    _sum: { finalHours: true, durationHours: true },
    _count: { taskId: true },
  });

  const workerIds = logs.map((l) => l.workerId);
  const workers = await prisma.user.findMany({
    where: { id: { in: workerIds } },
    select: { id: true, name: true },
  });

  return logs.map((log) => ({
    worker: workers.find((w) => w.id === log.workerId),
    totalHours: log._sum.finalHours ?? log._sum.durationHours ?? 0,
    taskCount: log._count.taskId,
  }));
}
