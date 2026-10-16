import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { parseRmsNo } from '@/lib/utils';
import { notifyStatusChange } from '@/lib/webhook';

export interface CreateTaskInput {
  title: string;
  workerId: number;
  registrantId: number;
  targetDate?: string | null;
  notes?: string | null;
  templateId?: number | null;
  organizationId?: number | null;
  projectId?: number;
  status?: string;
}

export interface UpdateTaskInput {
  title?: string;
  notes?: string | null;
  targetDate?: string | null;
  isFreeze?: boolean;
  templateId?: number | null;
}

export async function createTask(input: CreateTaskInput, db: Pick<Prisma.TransactionClient, 'task'> = prisma) {
  const { cleanTitle, rmsNo } = parseRmsNo(input.title);
  return db.task.create({
    data: {
      title: cleanTitle,
      rmsNo,
      workerId: input.workerId,
      registrantId: input.registrantId,
      targetDate: input.targetDate ? new Date(input.targetDate) : null,
      notes: input.notes,
      templateId: input.templateId,
      organizationId: input.organizationId,
      status: input.status ?? 'ASSIGNED',
      ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
    },
    include: {
      registrant: { select: { id: true, name: true, email: true } },
      worker: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function updateTaskStatus(taskId: number, status: string) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status },
    include: {
      registrant: { select: { id: true, name: true, email: true } },
      worker: { select: { id: true, name: true, email: true } },
    },
  });

  if (status === 'REVIEW') {
    notifyStatusChange({
      taskId,
      taskTitle: task.title,
      status,
      workerName: task.worker?.name ?? '',
      registrantName: task.registrant?.name ?? '',
      taskUrl: `${process.env.NEXTAUTH_URL ?? ''}/tasks/${taskId}`,
    });
  }

  return task;
}

export async function getTaskWithLogs(taskId: number) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: {
      registrant: { select: { id: true, name: true, email: true } },
      worker: { select: { id: true, name: true, email: true } },
      timeLogs: { orderBy: { startTime: 'desc' } },
    },
  });
}
