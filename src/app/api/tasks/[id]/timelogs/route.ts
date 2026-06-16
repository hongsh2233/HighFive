import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';


// GET /api/tasks/[id]/timelogs - 타임로그 목록 조회
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

    // 업무 존재 확인
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return errorResponse('업무를 찾을 수 없습니다.', 404, 'TASK_404');
    }

    const timeLogs = await prisma.timeLog.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });

    // 집계 데이터 계산
    const totalHours = timeLogs.reduce((sum, log) => sum + (log.finalHours || 0), 0);

    return successResponse(
      { logs: timeLogs, totalHours },
      '타임로그 조회 완료'
    );
  } catch (err) {
    console.error(err);
    return errorResponse('타임로그 조회 중 오류가 발생했습니다.', 500);
  }
}
