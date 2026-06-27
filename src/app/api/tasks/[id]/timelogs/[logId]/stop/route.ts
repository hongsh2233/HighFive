import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';

// PATCH /api/tasks/[id]/timelogs/[logId]/stop - 타이머 종료
export async function PATCH(
  _req: NextRequest,
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

    if (timeLog.endTime) {
      return errorResponse('이미 종료된 타이머입니다.', 409);
    }

    // 타이머 종료
    const endTime = new Date();
    const durationMs = endTime.getTime() - timeLog.startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    const updatedLog = await prisma.timeLog.update({
      where: { id: logId },
      data: {
        endTime,
        durationHours: Math.round(durationHours * 100) / 100, // 소수점 2자리
        finalHours: Math.round(durationHours * 100) / 100 + (timeLog.adjustedHours || 0),
      },
    });

    return successResponse(updatedLog, '타이머가 종료되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('타이머 종료 중 오류가 발생했습니다.', 500);
  }
}
