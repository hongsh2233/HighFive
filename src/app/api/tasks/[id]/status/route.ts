import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';

const validStatuses = ['ASSIGNED', 'PROGRESS', 'REVIEW', 'QA', 'DONE'];

// PATCH /api/tasks/[id]/status - 업무 상태 변경
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error, session } = await requireAuth(req);
    if (error) return error;

    const taskId = parseInt(params.id);
    if (isNaN(taskId)) {
      return errorResponse('유효하지 않은 업무 ID입니다.', 400, 'VALID_400');
    }

    const body = await req.json();
    const { status } = body;

    if (!status || !validStatuses.includes(status)) {
      return errorResponse('유효하지 않은 상태입니다.', 400, 'VALID_400');
    }

    // 업무 존재 확인
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return errorResponse('업무를 찾을 수 없습니다.', 404, 'TASK_404');
    }

    // 상태 변경
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { status, updatedAt: new Date() },
      include: {
        planner: { select: { id: true, name: true, email: true } },
        worker: { select: { id: true, name: true, email: true } },
      },
    });

    // TODO: Webhook 발송 (Slack 알림 등)
    if (status === 'REVIEW') {
      // 기획자에게 검수 요청 알림 발송
      console.log(`[Webhook] 검수 요청: ${task.id} - ${task.title}`);
    }

    return successResponse(updatedTask, '업무 상태가 변경되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('업무 상태 변경 중 오류가 발생했습니다.', 500);
  }
}
