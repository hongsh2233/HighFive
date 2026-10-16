import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { parseRmsNo } from '@/lib/utils';
import { sanitize } from '@/lib/sanitize';
import { createTask } from '@/lib/services/task.service';
import { withTaskKey } from '@/lib/task-key';
import { handleServiceComment } from '@/lib/service-comments';
import { McpError, type McpConfig } from './config';
import type { McpPrincipal } from './auth';
import { getMcpTask, listMentionTargets } from './tasks';

export async function addMcpComment(p: McpPrincipal, config: McpConfig, input: { taskId: number; content: string; mentionUserIds: number[]; parentId?: number; requestId: string }) {
  if (!p.canComment) throw new McpError(403, 'MCP_COMMENT_FORBIDDEN');
  await getMcpTask(p, input.taskId);
  // Only structured, resolved IDs may create mentions; never trust names embedded in model text.
  if (input.content.includes('@[')) throw new McpError(400, 'USE_STRUCTURED_MENTIONS');
  const ids = [...new Set(input.mentionUserIds)];
  const { users } = await listMentionTargets(p, input.taskId);
  const targets = ids.map(id => users.find(u => u.id === id));
  if (targets.some(t => !t)) throw new McpError(403, 'MENTION_TARGET_FORBIDDEN');
  const content = [sanitize(input.content), ...targets.map(t => `@[${t!.name.replace(/[\[\]()]/g, '')}](${t!.id})`)].join('\n');
  if (!content.trim()) throw new McpError(400, 'EMPTY_COMMENT');
  const req = new NextRequest('https://highfive.internal/api/tasks/comments', {
    method: 'POST', headers: { authorization: `Bearer ${config.serviceKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ content, parentId: input.parentId, externalRequestId: `mcp-comment:${input.requestId}` }),
  });
  const response = await handleServiceComment(req, input.taskId, { userId: p.userId, projectIds: p.projectIds });
  if (!response.ok) throw new McpError(response.status, response.status === 409 ? 'IDEMPOTENCY_CONFLICT' : 'COMMENT_REJECTED');
  const { data } = await response.json();
  return { id: data.id, taskId: data.taskId, parentId: data.parentId, content: data.content, createdAt: data.createdAt,
    author: data.externalAuthorLabel, duplicate: response.status === 200, notification: 'HighFive notification processing requested; device delivery is not confirmed.' };
}

export async function listTaskTargets(p: McpPrincipal, projectId?: number) {
  if (projectId && !p.projectIds.includes(projectId)) throw new McpError(404, 'PROJECT_NOT_FOUND');
  return prisma.project.findMany({
    where: { organizationId: p.organizationId, id: projectId ? projectId : { in: p.projectIds } },
    select: { id: true, name: true, members: { where: { user: { organizationId: p.organizationId, isActive: true, role: { in: ['WORKER', 'LEADER', 'ADMIN'] } } },
      select: { user: { select: { id: true, name: true } } }, take: 100 } }, orderBy: { id: 'asc' }, take: 100,
  });
}
export type CreateMcpTaskInput = { projectId: number; workerId: number; title: string; notes?: string; targetDate?: string; requestId: string };
export async function createMcpTask(p: McpPrincipal, input: CreateMcpTaskInput) {
  if (!p.canCreate) throw new McpError(403, 'MCP_TASK_CREATE_FORBIDDEN');
  if (!p.projectIds.includes(input.projectId)) throw new McpError(404, 'PROJECT_NOT_FOUND');
  const requestId = `mcp-task:${input.requestId}`;
  const rawTitle = sanitize(input.title).trim();
  const { cleanTitle: title, rmsNo } = parseRmsNo(rawTitle);
  const notes = input.notes ? sanitize(input.notes) : null;
  if (!title) throw new McpError(400, 'EMPTY_TITLE');
  const execute = () => prisma.$transaction(async tx => {
    const project = await tx.project.findFirst({ where: { id: input.projectId, organizationId: p.organizationId }, select: { id: true } });
    const worker = await tx.projectMember.findFirst({ where: { projectId: input.projectId, userId: input.workerId,
      user: { organizationId: p.organizationId, isActive: true, role: { in: ['ADMIN', 'LEADER', 'WORKER'] } } }, select: { userId: true } });
    if (!project || !worker) throw new McpError(403, 'TASK_TARGET_FORBIDDEN');
    const old = await tx.serviceRequestLog.findUnique({ where: { serviceCredentialId_externalRequestId: { serviceCredentialId: p.credentialId, externalRequestId: requestId } } });
    if (old) {
      const task = old.taskId ? await tx.task.findFirst({ where: { id: old.taskId, organizationId: p.organizationId, registrantId: p.userId, projectId: input.projectId } }) : null;
      if (!task || old.action !== 'MCP_TASK_CREATE' || task.title !== title || (task.rmsNo ?? null) !== rmsNo || task.workerId !== input.workerId || task.notes !== notes || (task.targetDate?.toISOString() ?? null) !== (input.targetDate ? new Date(input.targetDate).toISOString() : null)) throw new McpError(409, 'IDEMPOTENCY_CONFLICT');
      return { id: task.id, taskKey: withTaskKey(task).taskKey, duplicate: true };
    }
    const statuses = await tx.projectStatus.findMany({ where: { projectId: input.projectId }, orderBy: { order: 'asc' } });
    const initial = statuses.length ? statuses.find(s => !s.isDone && !s.isProgress)?.code : 'ASSIGNED';
    if (!initial) throw new McpError(409, 'NO_INITIAL_STATUS');
    const task = await createTask({ title: rawTitle, notes, workerId: input.workerId, registrantId: p.userId, organizationId: p.organizationId,
      projectId: input.projectId, targetDate: input.targetDate, status: initial }, tx);
    await tx.serviceRequestLog.create({ data: { serviceCredentialId: p.credentialId, externalRequestId: requestId, action: 'MCP_TASK_CREATE', taskId: task.id, resultStatus: 'SUCCESS' } });
    await tx.taskHistory.create({ data: { taskId: task.id, userId: p.userId, action: 'CREATED', detail: 'ChatGPT JIA MCP' } });
    const muted = await tx.notificationMute.findFirst({ where: { userId: input.workerId, scope: 'PROJECT', targetId: input.projectId } });
    if (!muted) await tx.userNotification.create({ data: { organizationId: p.organizationId, userId: input.workerId, taskId: task.id,
      type: 'WORKER_ASSIGNED', message: `'${task.title}' 업무가 나에게 배정되었습니다.` } });
    await tx.auditLog.create({ data: { organizationId: p.organizationId, userId: p.userId, action: 'MCP_TASK_CREATED', targetType: 'TASK', targetId: task.id } });
    return { id: task.id, taskKey: withTaskKey(task).taskKey, duplicate: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  // Retry serializable/concurrent idempotency conflicts; the transaction rolls back all side effects.
  for (let attempt = 0; ; attempt++) {
    try { return await execute(); }
    catch (e) { if (attempt < 2 && e instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(e.code)) continue; throw e; }
  }
}
