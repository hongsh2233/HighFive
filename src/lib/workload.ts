import { prisma } from './db';

export interface WorkloadEntry {
  id: number;
  name: string;
  email: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  totalHours: number;
  averageHoursPerTask: number;
}

export async function computeWorkloadStats(organizationId: number | undefined, from?: Date, to?: Date): Promise<WorkloadEntry[]> {
  const workers = await prisma.user.findMany({
    where: { role: 'WORKER', isActive: true, organizationId },
    include: {
      workerTasks: {
        where: from && to ? { createdAt: { gte: from, lte: to } } : {},
      },
      timeLogs: {
        where: from && to ? { createdAt: { gte: from, lte: to } } : {},
      },
    },
  });

  return workers.map((worker) => {
    const totalTasks = worker.workerTasks.length;
    const completedTasks = worker.workerTasks.filter((t) => t.status === 'DONE').length;
    const totalHours = worker.timeLogs.reduce((sum, log) => sum + (log.finalHours || 0), 0);

    return {
      id: worker.id,
      name: worker.name,
      email: worker.email,
      totalTasks,
      completedTasks,
      inProgressTasks: totalTasks - completedTasks,
      totalHours: Math.round(totalHours * 100) / 100,
      averageHoursPerTask: totalTasks > 0 ? Math.round((totalHours / totalTasks) * 100) / 100 : 0,
    };
  });
}
