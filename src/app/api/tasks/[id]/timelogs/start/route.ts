import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/tasks/[id]/timelogs/start - 타이머 시작
export async function POST(
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

    const session2 = await getServerSession(authOptions);
    const userId = parseInt((session2?.user as any)?.id || '0');

    // 업무 존재 확인
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return errorResponse('업무를 찾을 수 없습니다.', 404, 'TASK_404');
    }

    // 진행 중인 타이머 확인
    const activeLog = await prisma.timeLog.findFirst({
      where: {
        taskId,
        workerId: userId,
        endTime: null,
      },
    });

    if (activeLog) {
      return errorResponse(
        '이미 실행 중인 타이머가 있습니다.',
        409,
        'TIMER_409'
      );
    }

    // 새 타임로그 생성
    const timeLog = await prisma.timeLog.create({
      data: {
        taskId,
        workerId: userId,
        startTime: new Date(),
      },
    });

    return successResponse(timeLog, '타이머가 시작되었습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('타이머 시작 중 오류가 발생했습니다.', 500);
  }
}
