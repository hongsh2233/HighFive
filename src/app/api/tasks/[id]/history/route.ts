import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const taskId = parseInt(id);
    if (isNaN(taskId)) return errorResponse('유효하지 않은 업무 ID입니다.', 400);

    const histories = await prisma.taskHistory.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true } } },
    });

    return successResponse(histories);
  } catch (err) {
    console.error(err);
    return errorResponse('히스토리 조회 중 오류가 발생했습니다.', 500);
  }
}
