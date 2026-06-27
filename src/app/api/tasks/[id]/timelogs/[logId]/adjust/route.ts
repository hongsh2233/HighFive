import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';

// PATCH /api/tasks/[id]/timelogs/[logId]/adjust - 공수 보정
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const userId = parseInt((session!.user as any).id || '0');
    const userRole = (session!.user as any).role;

    const { id, logId: rawLogId } = await params;
    const taskId = parseInt(id);
    const logId = parseInt(rawLogId);

    if (isNaN(taskId) || isNaN(logId)) {
      return errorResponse('유효하지 않은 ID입니다.', 400, 'VALID_400');
    }

    const body = await req.json();
    const { adjustedHours } = body;

    if (typeof adjustedHours !== 'number' || adjustedHours < -24 || adjustedHours > 24) {
      return errorResponse('조정 시간은 -24~24 사이 숫자여야 합니다.', 400, 'VALID_400');
    }

    // 타임로그 조회
    const timeLog = await prisma.timeLog.findUnique({
      where: { id: logId },
    });

    if (!timeLog) {
      return errorResponse('타임로그를 찾을 수 없습니다.', 404);
    }

    if (timeLog.taskId !== taskId) {
      return errorResponse('잘못된 업무 ID입니다.', 400, 'VALID_400');
    }

    if (timeLog.workerId !== userId && !['ADMIN', 'MANAGER'].includes(userRole)) {
      return errorResponse('권한이 없습니다.', 403);
    }

    // 최종 시간 계산
    const duration = timeLog.durationHours || 0;
    const finalHours = Math.round((duration + adjustedHours) * 100) / 100;

    const updatedLog = await prisma.timeLog.update({
      where: { id: logId },
      data: {
        adjustedHours,
        finalHours,
      },
    });

    return successResponse(updatedLog, '공수가 보정되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('공수 보정 중 오류가 발생했습니다.', 500);
  }
}
