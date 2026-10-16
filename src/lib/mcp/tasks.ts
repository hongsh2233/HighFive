import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { notesText } from '@/lib/task-notes';
import { withTaskKey } from '@/lib/task-key';
import { resolveStatus } from '@/lib/task-status';
import type { McpPrincipal } from './auth';
import { mentionTargetWhere } from './mention-scope';
import { McpError } from './config';

export function mcpTaskScope(p: McpPrincipal): Prisma.TaskWhereInput {
  return { organizationId: p.organizationId, OR: [{ workerId: p.userId }, { registrantId: p.userId }], projectId: { in: p.projectIds } };
}
const taskSelect = {
  id: true, title: true, status: true, priority: true, targetDate: true, createdAt: true, updatedAt: true,
  projectId: true, worker: { select: { id: true, name: true } }, project: { select: { id: true, name: true } },
  registrant: { select: { id: true, name: true } },
} satisfies Prisma.TaskSelect;
async function presentTask<T extends { id: number; projectId: number | null; status: string }>(task: T) {
  const status = await resolveStatus(task.projectId, task.status);
  return { ...withTaskKey(task), statusInfo: status ? { label: status.label, isDone: status.isDone, isProgress: status.isProgress } : null };
}
export async function listMyTasks(p: McpPrincipal, input: { page: number; limit: number; status?: string }) {
  const where = { ...mcpTaskScope(p), ...(input.status ? { status: input.status } : {}) };
  const [tasks, total] = await prisma.$transaction([
    prisma.task.findMany({ where, select: taskSelect, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], skip: (input.page - 1) * input.limit, take: input.limit }),
    prisma.task.count({ where }),
  ]);
  return { tasks: await Promise.all(tasks.map(presentTask)), total, ...input };
}
export async function getMcpTask(p: McpPrincipal, taskId: number) {
  const task = await prisma.task.findFirst({ where: { ...mcpTaskScope(p), id: taskId }, select: { ...taskSelect, notes: true } });
  if (!task) throw new McpError(404, 'TASK_NOT_FOUND');
  return presentTask({ ...task, notes: notesText(task.notes) });
}
export async function listMcpComments(p: McpPrincipal, input: { taskId: number; page: number; limit: number }) {
  // Include the task scope in the comment query as well: a reassignment cannot bypass a prior check.
  await getMcpTask(p, input.taskId);
  const where = { taskId: input.taskId, task: mcpTaskScope(p) };
  const [comments, total] = await prisma.$transaction([
    prisma.taskComment.findMany({ where, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], skip: (input.page - 1) * input.limit, take: input.limit,
      select: { id: true, taskId: true, parentId: true, content: true, createdAt: true, updatedAt: true, source: true, externalAuthorLabel: true, author: { select: { id: true, name: true } } } }),
    prisma.taskComment.count({ where }),
  ]);
  return { comments: comments.map(c => ({ ...c, content: notesText(c.content) })), total, page: input.page, limit: input.limit };
}
export async function listMentionTargets(p: McpPrincipal, taskId: number) {
  const task = await getMcpTask(p, taskId);
  const users = await prisma.user.findMany({
    where: { organizationId: p.organizationId, isActive: true, ...mentionTargetWhere(task.worker.id, task.projectId!) },
    select: { id: true, name: true }, orderBy: { id: 'asc' }, take: 101,
  });
  return { users: users.slice(0, 100), truncated: users.length > 100 };
}
