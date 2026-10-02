import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse, canAccessTaskByRole } from '@/lib/utils';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, organizationId, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const taskId = parseInt(id);
    if (isNaN(taskId)) return errorResponse('유효하지 않은 업무 ID입니다.', 400);

    const task = await prisma.task.findFirst({ where: { id: taskId, organizationId } });
    if (!task) return errorResponse('업무를 찾을 수 없습니다.', 404);

    const role = (session!.user as any).role;
    const userId = parseInt((session!.user as any).id || '0');
    if (!(await canAccessTaskByRole(task, userId, role))) {
      return errorResponse('업무를 찾을 수 없습니다.', 404);
    }

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
