import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

// The calendar and AI reads must use the same visibility as the task list.
export async function sessionTaskScope(organizationId: number | undefined, userId: number, role: string | undefined): Promise<Prisma.TaskWhereInput> {
  if (!organizationId || !Number.isSafeInteger(userId) || userId <= 0) return { id: -1 };
  if (role === 'ADMIN') return { organizationId };
  if (role === 'WORKER') return { organizationId, workerId: userId };
  if (role === 'LEADER' || role === 'PARTNER') {
    const memberships = await prisma.projectMember.findMany({ where: { userId, project: { organizationId } }, select: { projectId: true } });
    const ids = memberships.map(m => m.projectId);
    return { organizationId, projectId: { in: ids.length ? ids : [-1] }, ...(role === 'PARTNER' ? { OR: [{ workerId: userId }, { partnerVisible: true }] } : {}) };
  }
  return { id: -1 };
}
