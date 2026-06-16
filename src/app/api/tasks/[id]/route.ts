import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse, parseRmsNo } from '@/lib/utils';

// GET /api/tasks/[id] - 업무 상세 조회
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return errorResponse('유효하지 않은 업무 ID입니다.', 400, 'VALID_400');
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        planner: { select: { id: true, name: true, email: true } },
        worker: { select: { id: true, name: true, email: true } },
        timeLogs: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!task) {
      return errorResponse('업무를 찾을 수 없습니다.', 404, 'TASK_404');
    }

    return successResponse(task, '업무 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('업무 조회 중 오류가 발생했습니다.', 500);
  }
}

// PATCH /api/tasks/[id] - 업무 수정
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    const userRole = (session?.user as any)?.role;
    if (!['ADMIN', 'PLANNER'].includes(userRole)) {
      return errorResponse('업무를 수정할 권한이 없습니다.', 403, 'AUTH_403');
    }

    const { id } = await params;
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return errorResponse('유효하지 않은 업무 ID입니다.', 400, 'VALID_400');
    }

    const body = await req.json();
    const { title, targetDate, notes, status } = body;

    // RMS 번호 파싱 (title이 있으면)
    let updateData: any = {};
    if (title) {
      const { cleanTitle, rmsNo } = parseRmsNo(title);
      updateData.title = cleanTitle;
      updateData.rmsNo = rmsNo;
    }
    if (targetDate !== undefined) updateData.targetDate = targetDate ? new Date(targetDate) : null;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;
    updateData.updatedAt = new Date();

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        planner: { select: { id: true, name: true, email: true } },
        worker: { select: { id: true, name: true, email: true } },
      },
    });

    return successResponse(task, '업무가 수정되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('업무 수정 중 오류가 발생했습니다.', 500);
  }
}

// DELETE /api/tasks/[id] - 업무 삭제
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    const userRole = (session?.user as any)?.role;
    if (userRole !== 'ADMIN') {
      return errorResponse('업무를 삭제할 권한이 없습니다.', 403, 'AUTH_403');
    }

    const { id } = await params;
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return errorResponse('유효하지 않은 업무 ID입니다.', 400, 'VALID_400');
    }

    // 관련 timelog 삭제
    await prisma.timeLog.deleteMany({
      where: { taskId },
    });

    // 업무 삭제
    await prisma.task.delete({
      where: { id: taskId },
    });

    return successResponse({ message: '업무가 삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    return errorResponse('업무 삭제 중 오류가 발생했습니다.', 500);
  }
}
