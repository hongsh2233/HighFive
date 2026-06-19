import { prisma } from '@/lib/db';
import { parseRmsNo } from '@/lib/utils';
import { sendWebhook } from '@/lib/webhook';

export interface CreateTaskInput {
  title: string;
  workerId: number;
  plannerId: number;
  targetDate?: string | null;
  notes?: string | null;
  templateId?: number | null;
}

export interface UpdateTaskInput {
  title?: string;
  notes?: string | null;
  targetDate?: string | null;
  isFreeze?: boolean;
  templateId?: number | null;
}

export async function createTask(input: CreateTaskInput) {
  const { cleanTitle, rmsNo } = parseRmsNo(input.title);
  return prisma.task.create({
    data: {
      title: cleanTitle,
      rmsNo,
      workerId: input.workerId,
      plannerId: input.plannerId,
      targetDate: input.targetDate ? new Date(input.targetDate) : null,
      notes: input.notes,
      templateId: input.templateId,
      status: 'ASSIGNED',
    },
    include: {
      planner: { select: { id: true, name: true, email: true } },
      worker: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function updateTaskStatus(taskId: number, status: string) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status },
    include: {
      planner: { select: { id: true, name: true, email: true } },
      worker: { select: { id: true, name: true, email: true } },
    },
  });

  if (status === 'REVIEW') {
    const message = `📢 [검수요청] ${task.worker?.name}님이 '${task.title}' 건의 검수를 요청했습니다.`;
    await sendWebhook(message).catch(console.error);
  }

  return task;
}

export async function getTaskWithLogs(taskId: number) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: {
      planner: { select: { id: true, name: true, email: true } },
      worker: { select: { id: true, name: true, email: true } },
      timeLogs: { orderBy: { startTime: 'desc' } },
    },
  });
}
