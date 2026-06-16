import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';

// GET /api/stats/workload - 작업자별 부하량 통계
export async function GET(req: NextRequest) {
  try {
    const { error } = await requireRole(['ADMIN', 'PLANNER']);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined;
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined;

    // 작업자별 업무 집계
    const workers = await prisma.user.findMany({
      where: { role: 'WORKER', isActive: true },
      include: {
        workerTasks: {
          where: {
            ...(from && to
              ? {
                  createdAt: {
                    gte: from,
                    lte: to,
                  },
                }
              : {}),
          },
        },
        timeLogs: {
          where: {
            ...(from && to
              ? {
                  createdAt: {
                    gte: from,
                    lte: to,
                  },
                }
              : {}),
          },
        },
      },
    });

    const workload = workers.map((worker) => {
      const totalTasks = worker.workerTasks.length;
      const completedTasks = worker.workerTasks.filter((t) => t.status === 'DONE').length;
      const totalHours = worker.timeLogs.reduce((sum, log) => sum + (log.finalHours || 0), 0);

      return {
        id: worker.id,
        name: worker.name,
        email: worker.email,
        totalTasks,
        completedTasks,
        inProgressTasks: totalTasks - completedTasks,
        totalHours: Math.round(totalHours * 100) / 100,
        averageHoursPerTask: totalTasks > 0 ? Math.round((totalHours / totalTasks) * 100) / 100 : 0,
      };
    });

    return successResponse(workload, '작업자 부하량 통계 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('통계 조회 중 오류가 발생했습니다.', 500);
  }
}
