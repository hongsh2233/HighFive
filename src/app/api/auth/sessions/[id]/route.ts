import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = parseInt((session!.user as any).id);
  const { id } = await params;

  const existing = await prisma.userSession.findUnique({ where: { id }, select: { userId: true } });
  if (!existing || existing.userId !== userId) return errorResponse('세션을 찾을 수 없습니다.', 404);

  await prisma.userSession.delete({ where: { id } });
  return successResponse(null, '세션이 종료되었습니다.');
}
