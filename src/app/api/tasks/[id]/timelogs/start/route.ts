import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/utils';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return errorResponse('인증이 필요합니다.', 401, 'AUTH_401');
    }

    const { id } = await params;
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return errorResponse('유효하지 않은 업무 ID입니다.', 400, 'VALID_400');
    }

    const userId = parseInt((session.user as any).id || '0');

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return errorResponse('업무를 찾을 수 없습니다.', 404, 'TASK_404');
    }

    const activeLog = await prisma.timeLog.findFirst({
      where: { taskId, workerId: userId, endTime: null },
    });

    if (activeLog) {
      return errorResponse('이미 실행 중인 타이머가 있습니다.', 409, 'TIMER_409');
    }

    const timeLog = await prisma.timeLog.create({
      data: { taskId, workerId: userId, startTime: new Date() },
    });

    return successResponse(timeLog, '타이머가 시작되었습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('타이머 시작 중 오류가 발생했습니다.', 500);
  }
}
