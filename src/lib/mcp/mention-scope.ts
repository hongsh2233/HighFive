import type { Prisma } from '@prisma/client';
// Mirror existing session visibility: WORKER=assigned, LEADER=project member, ADMIN=organization.
export function mentionTargetWhere(workerId: number, projectId: number): Prisma.UserWhereInput {
  return { OR: [{ role: 'ADMIN' }, { role: 'LEADER', projectMembers: { some: { projectId } } }, { role: 'WORKER', id: workerId }] };
}
