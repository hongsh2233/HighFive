import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse } from '@/lib/utils';

export async function GET(_req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = parseInt((session!.user as any).id);

  const sessions = await prisma.userSession.findMany({
    where: { userId },
    orderBy: { lastActiveAt: 'desc' },
    select: { id: true, deviceName: true, ipAddress: true, lastActiveAt: true, createdAt: true },
  });

  return successResponse(sessions);
}
